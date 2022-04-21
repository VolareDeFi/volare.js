/**
 * @file short.call.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

import { config } from 'dotenv';
import { providers, Wallet, Contract } from 'ethers';
import { ChainId, VolareAddresses, VTokenContract } from '@volare.defi/utils.js';
import { getContractAddressesForChain, Apis, Volare } from '../src';


config({
  path: '.env',
  encoding: 'utf8',
});

const CHAIN_ID = Number(process.env.CHAIN_ID) as ChainId;
const ENDPOINT = String(process.env.ENDPOINT);
const WRITER_PRIVATE_KEY = String(process.env.MAKER_PRIVATE_KEY);

const URL = 'https://dev.api.dex-browser.com/';
const addresses = getContractAddressesForChain(CHAIN_ID);
const provider = new providers.JsonRpcProvider(ENDPOINT);
const writer = new Wallet(WRITER_PRIVATE_KEY, provider);

(async () => {
  const apis = new Apis({
    url: URL,
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses: addresses,
  });
  const volare = new Volare({
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses: addresses as VolareAddresses,
  });

  const products = await apis.products();
  console.log(products);

  const vToken = await apis.vToken('0x01fDe2155C5Fb5c0b6062e70CEc134C84f184240');

  const vTokenContract = new Contract(vToken.tokenAddress, VTokenContract.ABI(), provider);
  const optionsAmount = 0.01;

  console.log(await vTokenContract.balanceOf(await writer.getAddress()));
  const short = await volare.short(writer, vToken, optionsAmount);
  await short.wait();
  console.log(await vTokenContract.balanceOf(await writer.getAddress()));
})();
