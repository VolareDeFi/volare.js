/**
 * @file addresses.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { ERC20Addresses, VolareAddresses } from '@volare.defi/utils.js';

import erc20Addresses from '../erc20s.json';
import volareAddresses from '../volare.json';

export function getContractAddressesForChain(chainId: ChainId) {
  const erc20s: { [chainId: number]: ERC20Addresses } = erc20Addresses;
  const volare: { [chainId: number]: VolareAddresses } = volareAddresses;
  const zero = getContractAddressesForChainOrThrow(chainId);

  if (volare === undefined || erc20s === undefined) {
    throw new Error(`Unknown chain id (${chainId}). No known volare or erc20 contracts have been deployed on this chain.`);
  }
  return {
    ...erc20s[chainId],
    ...volare[chainId],
    ...zero,
  };
}
