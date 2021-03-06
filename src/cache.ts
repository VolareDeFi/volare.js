/**
 * @file cache.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import { providers, Contract } from 'ethers';
import { ERC20Contract } from '@volare.defi/utils.js';

const decimals: { [address: string]: number } = {};

export const getDecimals = async (address: string, provider: providers.JsonRpcProvider): Promise<number> => {
  // format
  address = address.toLowerCase();

  if (!decimals[address]) {
    const erc20 = new Contract(address, ERC20Contract.ABI(), provider);
    decimals[address] = await erc20.decimals();
  }
  return decimals[address];
}

export const KeyCash = 'premium';
export const global: { [key: string]: any } = {};
