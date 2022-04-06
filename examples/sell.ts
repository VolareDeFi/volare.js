/**
 * @file sell.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import { config } from 'dotenv';
import { providers, Wallet } from 'ethers';
import { ChainId, getFutureExpiryInSeconds } from '@volare.defi/utils.js';

import { getContractAddressesForChain, ZeroEx} from '../src';

config({
  path: '.env',
  encoding: 'utf8',
});

// WETH => DAI
const CHAIN_ID = Number(process.env.CHAIN_ID) as ChainId;
const ENDPOINT = String(process.env.ENDPOINT);
const MAKER_PRIVATE_KEY = String(process.env.MAKER_PRIVATE_KEY);
const TAKER_PRIVATE_KEY = String(process.env.TAKER_PRIVATE_KEY);

const addresses = getContractAddressesForChain(CHAIN_ID);
const provider = new providers.JsonRpcProvider(ENDPOINT);
const maker = new Wallet(MAKER_PRIVATE_KEY, provider);
const taker = new Wallet(TAKER_PRIVATE_KEY, provider);

(async () => {
  const zeroEx = new ZeroEx({
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    verifyingContract: addresses.exchangeProxy,
    underlyingToken: addresses.weth,
    strikeToken: addresses.dai,
  });

  await zeroEx.init();

  const order = await zeroEx.sell(maker, 0.02, 300.0, getFutureExpiryInSeconds(3600));
  const tx = await zeroEx.fill(taker, order, 6);
  console.log(tx.hash);
})();
