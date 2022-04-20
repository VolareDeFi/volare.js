/**
 * @file volare.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

import { providers, Contract, Wallet } from 'ethers';
import { TransactionResponse } from '@ethersproject/providers';
import {
  ONE_BYTES32,
  ZERO_ADDR,
  TX_DEFAULTS,
  $,
  VolareAddresses,
  ERC20Contract,
  OracleContract,
  VTokenContract,
  WhitelistContract,
  MarginPoolContract,
  ControllerContract,
} from '@volare.defi/utils.js';

import { ActionType, VToken, ActionArgs, Vault } from './protocols';

export const VTOKEN_DECIMALS = 8;

export interface Options {
  chainId: number;
  endpoint: string;
  addresses: VolareAddresses;
}

export class Volare {
  chainId: number;
  provider: providers.JsonRpcProvider;
  oracleContract: Contract;
  whitelistContract: Contract;
  marginPoolContract: Contract;
  controllerContract: Contract;

  constructor(options: Options) {
    this.chainId = options.chainId;
    this.provider = new providers.JsonRpcProvider(options.endpoint);
    this.oracleContract = new Contract(options.addresses.mockOracle, OracleContract.ABI(), this.provider);
    this.whitelistContract = new Contract(options.addresses.whitelist, WhitelistContract.ABI(), this.provider);
    this.marginPoolContract = new Contract(options.addresses.marginPool, MarginPoolContract.ABI(), this.provider);
    this.controllerContract = new Contract(options.addresses.controller, ControllerContract.ABI(), this.provider);
  }

  async getExpiryPrice(asset: string, expiry: number): Promise<[string, boolean]> {
    const [price, isFinalized] = await this.oracleContract.getExpiryPrice(asset, expiry);
    return [price.toString(), isFinalized];
  }

  async isDisputePeriodOver(asset: string, expiry: number): Promise<boolean> {
    return this.oracleContract.isDisputePeriodOver(asset, expiry);
  }

  async getStoredBalance(asset: string): Promise<string> {
    return (await this.marginPoolContract.getStoredBalance(asset)).toString();
  }

  /***
   *
   * @param vTokenAddress
   * @returns [collateral, underlying, strike, expiry, strikePrice, isPut]
   */
  async getVTokenDetails(vTokenAddress: string): Promise<[string, string, string, string, number, boolean]> {
    const vTokenContract = new Contract(vTokenAddress, VTokenContract.ABI(), this.provider);
    const [collateral, underlying, strike, strikePrice, expiry, isPut] = await vTokenContract.getVTokenDetails();
    return [collateral, underlying, strike, strikePrice.toString(), expiry.toNumber(), isPut];
  }

  /***
   *
   * @param writer
   * @param vToken
   * @param optionsAmount The options amount with decimals, e.x. 10.0
   */
  async short(writer: Wallet, vToken: VToken, optionsAmount: number | string): Promise<TransactionResponse> {
    const collateralContract = new Contract(vToken.collateral, ERC20Contract.ABI(), this.provider);
    const collateralAmount = optionsAmount;
    const scaledOptionsAmount = $(optionsAmount, VTOKEN_DECIMALS);
    const scaledCollateralAmount = $(collateralAmount, await collateralContract.decimals());

    const allowance = await collateralContract.allowance(await writer.getAddress(), this.marginPoolContract.address);
    if (allowance.lt(scaledCollateralAmount)) {
      await collateralContract.connect(writer).approve(
        this.marginPoolContract.address,
        ONE_BYTES32,
        {
          ...TX_DEFAULTS,
        },
      );
    }
    return this.shortOptionOp(
      writer,
      vToken.tokenAddress,
      collateralContract.address,
      scaledOptionsAmount,
      scaledCollateralAmount,
    );
  }

  async redeem(holder: Wallet, vToken: VToken, optionsAmount: number | string): Promise<TransactionResponse> {
    const scaledOptionsAmount = $(optionsAmount, VTOKEN_DECIMALS);

    return this.redeemOp(
      holder,
      vToken.tokenAddress,
      scaledOptionsAmount,
    );
  }

  async settle(writer: Wallet, vaultId: number): Promise<TransactionResponse> {
    return this.settleVaultOp(
      writer,
      vaultId,
    );
  }

  async getAccountVaultCounter(owner: string): Promise<number> {
    return (await this.controllerContract.getAccountVaultCounter(owner)).toNumber();
  }

  async getVaultWithDetails(owner: string, vaultId: number | string): Promise<[Vault, string, string]> {
    return this.controllerContract.getVaultWithDetails(owner, vaultId);
  }

  private async redeemOp(
    owner: Wallet,
    vTokenAddress: string,
    scaledOptionsAmount: string,
  ): Promise<TransactionResponse> {
    const ownerAddress = await owner.getAddress();
    const actionArgs: Array<ActionArgs> = [
      {
        actionType: ActionType.Redeem,
        owner: ownerAddress,
        secondAddress: ownerAddress,
        asset: vTokenAddress,
        vaultId: 0,
        amount: scaledOptionsAmount,
        index: '0',
        data: ZERO_ADDR,
      }
    ];

    return this.controllerContract.connect(owner).operate(actionArgs, {
      ...TX_DEFAULTS,
    });
  }

  private async settleVaultOp(
    owner: Wallet,
    vaultId: number,
  ): Promise<TransactionResponse> {
    const ownerAddress = await owner.getAddress();
    const actionArgs: Array<ActionArgs> = [
      {
        actionType: ActionType.SettleVault,
        owner: ownerAddress,
        secondAddress: ownerAddress,
        asset: ZERO_ADDR,
        vaultId,
        amount: '0',
        index: '0',
        data: ZERO_ADDR,
      }
    ];

    return this.controllerContract.connect(owner).operate(actionArgs, {
      ...TX_DEFAULTS,
    });
  }

  private async shortOptionOp(
    owner: Wallet,
    vTokenAddress: string,
    assetAddress: string,
    scaledOptionsAmount: string,
    scaledCollateralAmount: string,
  ): Promise<TransactionResponse> {
    const ownerAddress = await owner.getAddress();
    const vaultCounter = (await this.getAccountVaultCounter(ownerAddress)) + 1;
    const actionArgs: Array<ActionArgs> = [
      {
        actionType: ActionType.OpenVault,
        owner: ownerAddress,
        secondAddress: ownerAddress,
        asset: ZERO_ADDR,
        vaultId: vaultCounter,
        amount: '0',
        index: '0',
        data: ZERO_ADDR,
      },
      {
        actionType: ActionType.MintShortOption,
        owner: ownerAddress,
        secondAddress: ownerAddress,
        asset: vTokenAddress,
        vaultId: vaultCounter,
        amount: scaledOptionsAmount,
        index: '0',
        data: ZERO_ADDR,
      },
      {
        actionType: ActionType.DepositCollateral,
        owner: ownerAddress,
        secondAddress: ownerAddress,
        asset: assetAddress,
        vaultId: vaultCounter,
        amount: scaledCollateralAmount,
        index: '0',
        data: ZERO_ADDR,
      },
    ];

    return this.controllerContract.connect(owner).operate(actionArgs, {
      ...TX_DEFAULTS,
    });
  }
}
