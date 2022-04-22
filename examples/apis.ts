/**
 * @file apis.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

import { config } from 'dotenv';
import { ChainId } from '@volare.defi/utils.js';
import { Side, getContractAddressesForChain, Apis } from '../src';
import {Wallet} from "ethers";

config({
  path: '.env',
  encoding: 'utf8',
});

const URL = 'https://dev.api.dex-browser.com/';
const CHAIN_ID = Number(process.env.CHAIN_ID) as ChainId;
const ENDPOINT = String(process.env.ENDPOINT);
const WRITER_PRIVATE_KEY = String(process.env.MAKER_PRIVATE_KEY);

const addresses = getContractAddressesForChain(CHAIN_ID);
const writer = new Wallet(WRITER_PRIVATE_KEY);

(async () => {
  const apis = new Apis({
    config: { DECIMAL_PLACES: 2 },
    url: URL,
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses: addresses,
  });

  const cash = await apis.cash();
  console.log(cash);

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

    for (let j = 0; j < expires.length; j++) {
      const vTokens = await apis.vTokens(hash, expires[j], undefined, true, true, true);
      console.log(vTokens);

      for (let k = 0; k < vTokens.length; k++) {
        const vToken = await apis.vToken(vTokens[k].tokenAddress, undefined, true, true, true);
        console.log(vToken);

        const book = await apis.orderBook(vTokens[k].tokenAddress, Side.Ask);
        console.log(book);

        for (let l = 0; l < book.length; l++) {
          const order = await apis.orderLimit(vTokens[k].tokenAddress, book[l].orderHash);
          console.log(order);
        }
      }
    }

    const longs = await apis.longs();
    console.log(longs);

    const shorts = await apis.shorts(writer.address);
    console.log(shorts);
  }
})();
