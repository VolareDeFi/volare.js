/**
 * @file zero-ex.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import { providers, Transaction, Wallet, Contract } from 'ethers';
import { BigNumber } from '@0x/utils';
import { LimitOrder, Signature, SignatureType } from '@0x/protocol-utils';
import { IZeroExContract } from '@0x/contract-wrappers';
import { ZERO_ADDR, UNLIMITED_ALLOWANCE_IN_BASE_UNITS, TX_DEFAULTS, _$, $, ERC20Contract } from '@volare.defi/utils.js';

export interface Options {
  chainId: number;
  endpoint: string;
  verifyingContract: string;
  underlyingToken: string;
  strikeToken: string;
}

export interface Order {
  orderHash: string;
  limitOrder: LimitOrder;
  signature: Signature;
}

export class ZeroEx {
  chainId: number;
  provider: providers.JsonRpcProvider;
  exchangeProxy: Contract;
  underlyingContract: Contract;
  strikeContract: Contract;
  underlyingDecimals: number = 0;
  strikeDecimals: number = 0;

  constructor(options: Options) {
    this.chainId = options.chainId;

    this.provider = new providers.JsonRpcProvider(options.endpoint);
    this.exchangeProxy = new Contract(options.verifyingContract, IZeroExContract.ABI(), this.provider);
    this.underlyingContract = new Contract(options.underlyingToken, ERC20Contract.ABI(), this.provider);
    this.strikeContract = new Contract(options.strikeToken, ERC20Contract.ABI(), this.provider);
  }

  async init() {
    this.underlyingDecimals = await this.underlyingContract.decimals();
    this.strikeDecimals = await this.strikeContract.decimals();
  }

  async getProtocolFeeMultiplier(): Promise<any> {
    return this.exchangeProxy.getProtocolFeeMultiplier();
  }

  async getLimitOrderRelevantState(order: Order): Promise<any> {
    const [{ orderHash, status }, actualFillableTakerTokenAmount, isSignatureValid] =
      await this.exchangeProxy.getLimitOrderRelevantState(order.limitOrder, order.signature);
    return {
      orderHash,
      isSignatureValid,
      status,
      actualFillableTakerTokenAmount,
    };
  }

  /**
   * @param taker The taker wallet
   * @param order The order.
   * @param amount The amount of takerToken filled by the taker.
   * @returns
   */
  async fill(taker: Wallet, order: Order, amount: number | string): Promise<Transaction> {
    const limitOrder = {
      ...order.limitOrder,
      makerAmount: order.limitOrder.makerAmount.toString(10),
      takerAmount: order.limitOrder.takerAmount.toString(10),
      expiry: order.limitOrder.expiry.toString(10),
      takerTokenFeeAmount: order.limitOrder.takerTokenFeeAmount.toString(10),
      salt: order.limitOrder.salt.toString(10),
    };

    // side:
    // true -> underlying
    // false -> strike
    const side = limitOrder.takerToken === this.underlyingContract.address;
    const contract = side ? this.underlyingContract : this.strikeContract;
    const takerTokenFillAmount = side ? $(amount, this.underlyingDecimals) : $(amount, this.strikeDecimals);

    const allowance = await contract.allowance(taker.address, this.exchangeProxy.address);
    if (allowance.lt(takerTokenFillAmount)) {
      await contract.connect(taker).approve(
        this.exchangeProxy.address,
        UNLIMITED_ALLOWANCE_IN_BASE_UNITS,
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
   * @param amount The amount of underlyingToken being bought by the maker.
   * @param price The price of underlyingToken filled by the maker.
   * @param expiry The unix timestamp in seconds when this order expires.
   * @returns
   */
  async buy(maker: Wallet, amount: number | string, price: number | string, expiry: number | string): Promise<Order> {
    const makerAmount = _$(Number(price) * Number(amount), this.strikeDecimals);
    const takerAmount = _$(amount, this.underlyingDecimals);

    const allowance = await this.strikeContract.allowance(maker.address, this.exchangeProxy.address);
    if (allowance.lt(makerAmount.toString(10))) {
      await this.strikeContract.connect(maker).approve(
        this.exchangeProxy.address,
        UNLIMITED_ALLOWANCE_IN_BASE_UNITS,
        {
          ...TX_DEFAULTS,
        },
      );
    }

    const limitOrder = new LimitOrder({
      chainId: this.chainId,
      verifyingContract: this.exchangeProxy.address,
      makerToken: this.strikeContract.address,
      takerToken: this.underlyingContract.address,
      makerAmount,
      takerAmount,
      maker: maker.address,
      taker: ZERO_ADDR,
      sender: ZERO_ADDR,
      expiry: new BigNumber(expiry),
      salt: new BigNumber(Date.now()),
      takerTokenFeeAmount: new BigNumber(0),
    });
    const signature = await limitOrder.getSignatureWithKey(
      maker.privateKey,
      SignatureType.EIP712, // Optional
    );

    return {
      orderHash: limitOrder.getHash(),
      limitOrder,
      signature,
    };
  }

  /**
   * @param maker The maker wallet (ethers.Wallet)
   * @param amount The amount of underlyingToken being bought by the maker.
   * @param price The price of underlyingToken filled by the maker.
   * @param expiry The unix timestamp in seconds when this order expires.
   * @returns
   */
  async sell(maker: Wallet, amount: number | string, price: number | string, expiry: number | string): Promise<Order> {
    const makerAmount = _$(amount, this.underlyingDecimals);
    const takerAmount = _$(Number(price) * Number(amount), this.strikeDecimals);

    const allowance = await this.underlyingContract.allowance(maker.address, this.exchangeProxy.address);
    if (allowance.lt(makerAmount.toString(10))) {
      await this.underlyingContract.connect(maker).approve(
        this.exchangeProxy.address,
        UNLIMITED_ALLOWANCE_IN_BASE_UNITS,
        {
          ...TX_DEFAULTS,
        },
      );
    }

    const limitOrder = new LimitOrder({
      chainId: this.chainId,
      verifyingContract: this.exchangeProxy.address,
      makerToken: this.underlyingContract.address,
      takerToken: this.strikeContract.address,
      makerAmount,
      takerAmount,
      maker: maker.address,
      taker: ZERO_ADDR,
      sender: ZERO_ADDR,
      expiry: new BigNumber(expiry),
      salt: new BigNumber(Date.now()),
      takerTokenFeeAmount: new BigNumber(0),
    });
    const signature = await limitOrder.getSignatureWithKey(
      maker.privateKey,
      SignatureType.EIP712, // Optional
    );

    return {
      orderHash: limitOrder.getHash(),
      limitOrder,
      signature,
    };
  }
}
