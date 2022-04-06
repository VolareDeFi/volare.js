/**
 * @file addresses.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import {
  ChainId,
  ERC20Addresses,
  VolareAddresses,
  ZeroExAddresses,
} from '@volare.defi/utils.js';

import erc20Addresses from '../erc20s.json';
import volareAddresses from '../volare.json';
import zeroExAddresses from '../0x.json';

export function getContractAddressesForChain(chainId: ChainId) {
  const erc20s: { [chainId: number]: ERC20Addresses } = erc20Addresses;
  const volare: { [chainId: number]: VolareAddresses } = volareAddresses;
  const zeroEx: { [chainId: number]: ZeroExAddresses } = zeroExAddresses;

  if (volare === undefined) {
    throw new Error(`Unknown chain id (${chainId}). No known volare contracts have been deployed on this chain.`);
  }
  return {
    ...erc20s[chainId],
    ...volare[chainId],
    ...zeroEx[chainId],
  };
}
