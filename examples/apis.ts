/**
 * @file index.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

import { config } from 'dotenv';
import { ChainId } from '@volare.defi/utils.js';
import { getContractAddressesForChain, Apis } from '../src';

config({
  path: '.env',
  encoding: 'utf8',
});

const URL = 'https://dev.api.dex-browser.com/';
const CHAIN_ID = Number(process.env.CHAIN_ID) as ChainId;
const ENDPOINT = String(process.env.ENDPOINT);

const addresses = getContractAddressesForChain(CHAIN_ID);

(async () => {
  const apis = new Apis({
    config: { DECIMAL_PLACES: 2 },
    url: URL,
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses: addresses,
  });

  const premium = await apis.premium();
  console.log(premium);

  const collaterals = await apis.collaterals();
  console.log(collaterals);

  const products = await apis.products(true);
  console.log(products);

  for (let i = 0; i < products.length; i++) {
    const hash = products[i].productHash;
    const prices = await apis.prices(hash);
    console.log(prices);

    const expires = await apis.expiry(hash);
    console.log(expires);

    // const vTokens = await apis.vTokens(hash);
    // console.log(vTokens);

    JSON.stringify('')
    for (let j = 0; j < expires.length; j++) {
      const vTokens = await apis.vTokens(hash, expires[j], undefined, true, true, true);
      console.log(vTokens);
    }
  }
})();
