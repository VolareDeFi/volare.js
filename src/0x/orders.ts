/**
 * @file order.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import { Wallet } from 'ethers';
import { splitSignature } from '@ethersproject/bytes';
import { ZERO_BYTES32, ZERO_ADDR, ZERO } from '@volare.defi/utils.js';

import {
  EIP712TypedData,
  createExchangeProxyEIP712Domain,
  getExchangeProxyEIP712Hash,
} from './eip712';


export enum SignatureType {
  Illegal = 0,
  Invalid = 1,
  EIP712 = 2,
  EthSign = 3,
}

export interface ECSignature {
  v: number;
  r: string;
  s: string;
}

export interface Signature extends ECSignature {
  signatureType: SignatureType;
}

export interface Order {
  orderHash: string;
  limitOrder: LimitOrder;
  signature: Signature;
}

const COMMON_ORDER_DEFAULT_VALUES = {
  makerToken: ZERO_ADDR,
  takerToken: ZERO_ADDR,
  makerAmount: ZERO,
  takerAmount: ZERO,
  maker: ZERO_ADDR,
  taker: ZERO_ADDR,
  pool: ZERO_BYTES32,
  expiry: ZERO,
  salt: ZERO,
  chainId: 1,
  verifyingContract: ZERO_ADDR,
};
const LIMIT_ORDER_DEFAULT_VALUES = {
  ...COMMON_ORDER_DEFAULT_VALUES,
  takerTokenFeeAmount: ZERO,
  sender: ZERO_ADDR,
  feeRecipient: ZERO_ADDR,
};

export type CommonOrderFields = typeof COMMON_ORDER_DEFAULT_VALUES;
export type LimitOrderFields = typeof LIMIT_ORDER_DEFAULT_VALUES;

export enum OrderStatus {
  Invalid = 0,
  Fillable = 1,
  Filled = 2,
  Cancelled = 3,
  Expired = 4,
}

export interface OrderInfo {
  orderHash: string;
  isSignatureValid: boolean,
  status: OrderStatus;
  actualFillableTakerTokenAmount: string;
}

export abstract class OrderBase {
  public makerToken: string;
  public takerToken: string;
  public makerAmount: string;
  public takerAmount: string;
  public maker: string;
  public pool: string;
  public taker: string;
  public expiry: string;
  public salt: string;
  public chainId: number;
  public verifyingContract: string;

  protected constructor(fields: Partial<CommonOrderFields> = {}) {
    const _fields = { ...COMMON_ORDER_DEFAULT_VALUES, ...fields };
    this.makerToken = _fields.makerToken;
    this.takerToken = _fields.takerToken;
    this.makerAmount = _fields.makerAmount;
    this.takerAmount = _fields.takerAmount;
    this.maker = _fields.maker;
    this.taker = _fields.taker;
    this.pool = _fields.pool;
    this.expiry = _fields.expiry;
    this.salt = _fields.salt;
    this.chainId = _fields.chainId;
    this.verifyingContract = _fields.verifyingContract;
  }

  public abstract getEIP712TypedData(): EIP712TypedData;

  public getHash(): string {
    return getExchangeProxyEIP712Hash(this.getEIP712TypedData());
  }

  public async getSignatureWithKey(signer: Wallet, type: SignatureType = SignatureType.EIP712): Promise<Signature> {
    switch (type) {
      case SignatureType.EIP712:
        const eip712 = this.getEIP712TypedData();
        const signature = splitSignature(await signer._signTypedData(eip712.domain, eip712.types, eip712.message));
        return {
          v: signature.v,
          r: signature.r,
          s: signature.s,
          signatureType: SignatureType.EIP712,
        };
      default:
        throw new Error(`Cannot sign with signature type: ${type}`);
    }
  }
}

export class LimitOrder extends OrderBase {
  public static readonly STRUCT_NAME = 'LimitOrder';
  public static readonly STRUCT_ABI = [
    { type: 'address', name: 'makerToken' },
    { type: 'address', name: 'takerToken' },
    { type: 'uint128', name: 'makerAmount' },
    { type: 'uint128', name: 'takerAmount' },
    { type: 'uint128', name: 'takerTokenFeeAmount' },
    { type: 'address', name: 'maker' },
    { type: 'address', name: 'taker' },
    { type: 'address', name: 'sender' },
    { type: 'address', name: 'feeRecipient' },
    { type: 'bytes32', name: 'pool' },
    { type: 'uint64', name: 'expiry' },
    { type: 'uint256', name: 'salt' },
  ];

  public takerTokenFeeAmount: string;
  public sender: string;
  public feeRecipient: string;

  constructor(fields: Partial<LimitOrderFields> = {}) {
    const _fields = { ...LIMIT_ORDER_DEFAULT_VALUES, ...fields };
    super(_fields);
    this.takerTokenFeeAmount = _fields.takerTokenFeeAmount;
    this.sender = _fields.sender;
    this.feeRecipient = _fields.feeRecipient;
  }

  public clone(fields: Partial<LimitOrderFields> = {}): LimitOrder {
    return new LimitOrder({
      makerToken: this.makerToken,
      takerToken: this.takerToken,
      makerAmount: this.makerAmount,
      takerAmount: this.takerAmount,
      takerTokenFeeAmount: this.takerTokenFeeAmount,
      maker: this.maker,
      taker: this.taker,
      sender: this.sender,
      feeRecipient: this.feeRecipient,
      pool: this.pool,
      expiry: this.expiry,
      salt: this.salt,
      chainId: this.chainId,
      verifyingContract: this.verifyingContract,
      ...fields,
    });
  }

  public getEIP712TypedData(): EIP712TypedData {
    return {
      domain: createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract),
      types: {
        [LimitOrder.STRUCT_NAME]: LimitOrder.STRUCT_ABI,
      },
      message: {
        makerToken: this.makerToken,
        takerToken: this.takerToken,
        makerAmount: this.makerAmount,
        takerAmount: this.takerAmount,
        takerTokenFeeAmount: this.takerTokenFeeAmount,
        maker: this.maker,
        taker: this.taker,
        sender: this.sender,
        feeRecipient: this.feeRecipient,
        pool: this.pool,
        expiry: this.expiry,
        salt: this.salt,
      },
      primaryType: LimitOrder.STRUCT_NAME,
    };
  }
}
