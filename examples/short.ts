/**
 * @file short.ts
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
    addresses: addresses as VolareAddresses,
  });
  const volare = new Volare({
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses: addresses as VolareAddresses,
  });

  const premiums = await apis.premiums();
  console.log(premiums);

  const collaterals = await apis.collaterals();
  console.log(collaterals);

  const products = await apis.products();
  console.log(products);

  for (let i = 0; i < products.length; i++) {
    const vTokens = await apis.vTokens(products[i].productHash);
    for (let j = 0; j < vTokens.length; j++) {
      const vToken = new Contract(vTokens[j].tokenAddress, VTokenContract.ABI(), provider);
      const optionsAmount = j + 1;

      console.log(await vToken.balanceOf(await writer.getAddress()));
      const short = await volare.short(writer, vTokens[j], optionsAmount);
      await short.wait();
      console.log(await vToken.balanceOf(await writer.getAddress()));
    }
  }
})();
