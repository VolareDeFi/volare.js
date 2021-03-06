/**
 * @file interfaces.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

import { VToken as VolareVToken } from '../volare';
import { Order as ZeroExOrder } from '../0x';

export interface Price {
  timestamp: number;
  name: string;
  price: string;
  changed: string;
}

export interface ERC20 {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  logo: string;
}

export interface Cash extends ERC20 {}

export interface Collateral extends ERC20 {}

export interface Product {
  productHash: string;
  symbol: string;
  isPut: boolean;
  underlying: ERC20;
  strike: ERC20;
  collateral: ERC20;
  underlyingPrice: Price,
}

export interface VToken extends VolareVToken {
  timestamp: number;
  blockNumber: number;
  productHash: string;
  name: string;
  symbol: string;
  decimals: number;
  position: {
    amount: string;
  }
  stat: {
    totalSupply: string;
    holder: number;
  };
  market: {
    changed: string;
    volume: string;
    bid1: string;
    bid1IV: string;
    ask1: string;
    ask1IV: string;
  }
  greek: {
    delta: string;
    gamma: string;
    theta: string;
    vega: string;
    rho: string;
  };
}

export enum ShortState {
  NotExpired = 1,
  Expired = 2,
  PartialSettled = 3,
  Settled = 4,
}

export enum LongState {
  NotExpired = 1,
  Expired = 2,
  PartialRedeemed = 3,
  Redeemed = 4,
}

export interface Short {
  vTokenAddress: string;
  collateralAddress: string;
  collateralAmount: string;
  collateralRate: string;
  expiry: number;
  expiryPrice: string;
  strikePrice: string;
  address: string;
  amount: string;
  balance: string;
  profit: string;
  roe: string;
  state: ShortState;
  mtime: number;
  vaultId: number;
}

export interface Long {
  vTokenAddress: string;
  expiry: number;
  expiryPrice: string;
  strikePrice: string;
  address: string;
  balance: string;
  redeemedAmount: string;
  profit: string;
  roe: string;
  state: LongState;
  mtime: number;
  vaultId?: number;
}

export enum Type {
  Limit = 1,
  Market = 2,
}

export enum Side {
  Ask = 1,
  Bid = 2,
}

export type OrderBook = Array<{
  side: Side,
  orderHash: string;
  ctime: number,
  price: string;
  size: string;
}>

export interface Order extends ZeroExOrder {
  ctime: number,
  mtime: number,
  type: Type,
  side: Side,
  expiry: number;
  fee: string;
  price: string;
  amount: string;
  filled: string;
  size: string;
}
