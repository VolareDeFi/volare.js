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
  WhitelistContract,
  MarginPoolContract,
  ControllerContract,
} from '@volare.defi/utils.js';

import { VToken, ActionArgs, ActionType, Vault } from './protocols';

export const VTOKEN_DECIMALS = 8;

export interface Options {
  chainId: number;
  endpoint: string;
  addresses: VolareAddresses;
}

export class Volare {
  chainId: number;
  provider: providers.JsonRpcProvider;
  address: string;
  whitelistContract: Contract;
  marginPool: Contract;
  controller: Contract;

  constructor(options: Options) {
    this.chainId = options.chainId;
    this.provider = new providers.JsonRpcProvider(options.endpoint);
    this.address = options.addresses.controller;
    this.whitelistContract = new Contract(options.addresses.whitelist, WhitelistContract.ABI(), this.provider);
    this.marginPool = new Contract(options.addresses.marginPool, MarginPoolContract.ABI(), this.provider);
    this.controller = new Contract(options.addresses.controller, ControllerContract.ABI(), this.provider);
  }

  /***
   *
   * @param writer
   * @param vToken
   * @param optionsAmount The options amount with decimals, e.x. 10.0
   */
  async short(writer: Wallet, vToken: VToken, optionsAmount: number | string): Promise<TransactionResponse> {
    const collateral = new Contract(vToken.collateral, ERC20Contract.ABI(), this.provider);
    const collateralAmount = optionsAmount;
    const scaledOptionsAmount = $(optionsAmount, VTOKEN_DECIMALS);
    const scaledCollateralAmount = $(collateralAmount, await collateral.decimals());

    const allowance = await collateral.allowance(await writer.getAddress(), this.marginPool.address);
    if (allowance.lt(scaledCollateralAmount)) {
      await collateral.connect(writer).approve(
        this.marginPool.address,
        ONE_BYTES32,
        {
          ...TX_DEFAULTS,
        },
      );
    }
    return this.mintShortOption(
      writer,
      vToken.tokenAddress,
      collateral.address,
      scaledOptionsAmount,
      scaledCollateralAmount,
    );
  }

  async settle(writer: Wallet, vaultId: number): Promise<TransactionResponse> {
    return this.settleVault(
      writer,
      vaultId,
    );
  }

  async getAccountVaultCounter(owner: string): Promise<number> {
    return (await this.controller.getAccountVaultCounter(owner)).toNumber();
  }

  async getVaultWithDetails(owner: string, vaultId: number | string): Promise<[Vault, string, string]> {
    return this.controller.getVaultWithDetails(owner, vaultId);
  }

  private async settleVault(
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

    return this.controller.connect(owner).operate(actionArgs, {
      ...TX_DEFAULTS,
    });
  }

  private async mintShortOption(
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

    return this.controller.connect(owner).operate(actionArgs, {
      ...TX_DEFAULTS,
    });
  }
}
