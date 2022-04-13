/**
 * @file interfaces.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

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

export interface Premium extends ERC20 {}

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

export interface VToken {
  timestamp: number;
  blockNumber: number;
  productHash: string;
  name: string;
  symbol: string;
  decimals: number;
  tokenAddress: string;
  creator: string;
  underlying: string;
  strike: string;
  collateral: string;
  strikePrice: string;
  expiry: number;
}
