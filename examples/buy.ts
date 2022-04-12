/**
 * @file buy.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import { config } from 'dotenv';
import { providers, Wallet } from 'ethers';
import { ChainId, getFutureExpiryInSeconds } from '@volare.defi/utils.js';

import { ZeroEx, getContractAddressesForChain } from '../src';

config({
  path: '.env',
  encoding: 'utf8',
});

// DAI => WETH
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
    addresses,
    vTokenAddress: addresses.weth,
    premiumAddress: addresses.dai,
  });

  await zeroEx.init();

  const order = await zeroEx.buy(maker, 0.01, 300.0, getFutureExpiryInSeconds(3600));
  const orderHash2 = order.limitOrder.getHash();
  console.log(orderHash2);
  const {
    orderHash,
    isSignatureValid,
    status,
    actualFillableTakerTokenAmount,
  } = await zeroEx.getLimitOrderRelevantState(order);
  console.log(orderHash, isSignatureValid, status, actualFillableTakerTokenAmount);
  console.log(orderHash === orderHash2);
  const tx = await zeroEx.fill(taker, order, 0.01);
  console.log(tx.hash);
})();
