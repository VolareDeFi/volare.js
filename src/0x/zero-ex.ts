/**
 * @file zero-ex.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import { providers, Wallet, Contract } from 'ethers';
import { TransactionResponse } from '@ethersproject/providers';
import {
  ONE_BYTES32,
  ZERO_ADDR,
  ZERO,
  TX_DEFAULTS,
  $,
  ZeroExAddresses,
  ERC20Contract,
  IZeroExContract,
} from '@volare.defi/utils.js';

import { Order, OrderInfo, SignatureType, Orders } from './orders';

export interface Options {
  chainId: number;
  endpoint: string;
  addresses: ZeroExAddresses;
  vTokenAddress: string;
  premiumAddress: string;
}

export class ZeroEx {
  chainId: number;
  provider: providers.JsonRpcProvider;
  exchangeProxy: Contract;
  vTokenContract: Contract;
  premiumContract: Contract;
  vTokenDecimals: number = 0;
  premiumDecimals: number = 0;

  constructor(options: Options) {
    this.chainId = options.chainId;

    this.provider = new providers.JsonRpcProvider(options.endpoint);
    this.exchangeProxy = new Contract(options.addresses.exchangeProxy, IZeroExContract.ABI(), this.provider);
    this.vTokenContract = new Contract(options.vTokenAddress, ERC20Contract.ABI(), this.provider);
    this.premiumContract = new Contract(options.premiumAddress, ERC20Contract.ABI(), this.provider);
  }

  async init() {
    this.vTokenDecimals = await this.vTokenContract.decimals();
    this.premiumDecimals = await this.premiumContract.decimals();
  }

  async getProtocolFeeMultiplier(): Promise<any> {
    return this.exchangeProxy.getProtocolFeeMultiplier();
  }

  async getLimitOrderRelevantState(order: Order): Promise<OrderInfo> {
    const [{ orderHash, status }, actualFillableTakerTokenAmount, isSignatureValid] =
      await this.exchangeProxy.getLimitOrderRelevantState(order.limitOrder, order.signature);
    return {
      orderHash,
      isSignatureValid,
      status,
      actualFillableTakerTokenAmount: actualFillableTakerTokenAmount.toString()
    };
  }

  /**
   * @param taker The taker wallet.
   * @param order The order.
   * @param amount The amount of takerToken filled by the taker.
   * @returns
   */
  async fill(taker: Wallet, order: Order, amount: number | string): Promise<TransactionResponse> {
    const limitOrder = order.limitOrder;

    // side:
    // true -> underlying
    // false -> strike
    const side = limitOrder.takerToken === this.vTokenContract.address;
    const contract = side ? this.vTokenContract : this.premiumContract;
    const takerTokenFillAmount = side ? $(amount, this.vTokenDecimals) : $(amount, this.premiumDecimals);

    const allowance = await contract.allowance(await taker.getAddress(), this.exchangeProxy.address);
    if (allowance.lt(takerTokenFillAmount)) {
      await contract.connect(taker).approve(
        this.exchangeProxy.address,
        ONE_BYTES32,
        {
          ...TX_DEFAULTS,
        },
      );
    }

    return this.exchangeProxy.connect(taker).fillLimitOrder(
      limitOrder,
      order.signature,
      takerTokenFillAmount,
      {
        value: 0,
        ...TX_DEFAULTS,
      },
    );
  }

  /**
   * @param maker The maker wallet
   * @param amount The amount of vToken being bought by the maker.
   * @param price The price of vToken filled by the maker.
   * @param expiry The unix timestamp in seconds when this order expires.
   * @returns
   */
  async buy(maker: Wallet, amount: number | string, price: number | string, expiry: number | string): Promise<Order> {
    const makerAmount = $(Number(price) * Number(amount), this.premiumDecimals);
    const takerAmount = $(amount, this.vTokenDecimals);

    const allowance = await this.premiumContract.allowance(await maker.getAddress(), this.exchangeProxy.address);
    if (allowance.lt(makerAmount)) {
      await this.premiumContract.connect(maker).approve(
        this.exchangeProxy.address,
        ONE_BYTES32,
        {
          ...TX_DEFAULTS,
        },
      );
    }

    const limitOrder = new Orders({
      chainId: this.chainId,
      verifyingContract: this.exchangeProxy.address,
      makerToken: this.premiumContract.address,
      takerToken: this.vTokenContract.address,
      makerAmount,
      takerAmount,
      maker: await maker.getAddress(),
      taker: ZERO_ADDR,
      sender: ZERO_ADDR,
      expiry: String(expiry),
      salt: Date.now().toString(),
      takerTokenFeeAmount: ZERO,
    });
    const signature = await limitOrder.getSignatureWithKey(
      maker,
      SignatureType.EIP712,
    );

    return {
      orderHash: limitOrder.getHash(),
      limitOrder,
      signature,
    };
  }

  /**
   * @param maker The maker wallet (ethers.Wallet)
   * @param amount The amount of vToken being bought by the maker.
   * @param price The price of vToken filled by the maker.
   * @param expiry The unix timestamp in seconds when this order expires.
   * @returns
   */
  async sell(maker: Wallet, amount: number | string, price: number | string, expiry: number | string): Promise<Order> {
    const makerAmount = $(amount, this.vTokenDecimals);
    const takerAmount = $(Number(price) * Number(amount), this.premiumDecimals);

    const allowance = await this.vTokenContract.allowance(await maker.getAddress(), this.exchangeProxy.address);
    if (allowance.lt(makerAmount)) {
      await this.vTokenContract.connect(maker).approve(
        this.exchangeProxy.address,
        ONE_BYTES32,
        {
          ...TX_DEFAULTS,
        },
      );
    }

    const limitOrder = new Orders({
      chainId: this.chainId,
      verifyingContract: this.exchangeProxy.address,
      makerToken: this.vTokenContract.address,
      takerToken: this.premiumContract.address,
      makerAmount,
      takerAmount,
      maker: await maker.getAddress(),
      taker: ZERO_ADDR,
      sender: ZERO_ADDR,
      expiry: String(expiry),
      salt: Date.now().toString(),
      takerTokenFeeAmount: ZERO,
    });
    const signature = await limitOrder.getSignatureWithKey(
      maker,
      SignatureType.EIP712,
    );

    return {
      orderHash: limitOrder.getHash(),
      limitOrder,
      signature,
    };
  }
}
