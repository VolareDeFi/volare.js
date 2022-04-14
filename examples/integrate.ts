/**
 * @file integrate.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import { config } from 'dotenv';
import { providers, Contract, Wallet } from 'ethers';
import { $float, ChainId, ERC20Contract, getFutureExpiryInSeconds, VTokenContract} from '@volare.defi/utils.js';

import { VTOKEN_DECIMALS, getContractAddressesForChain, Volare, ZeroEx,  Apis } from '../src';

config({
  path: '.env',
  encoding: 'utf8',
});

const URL = 'https://dev.api.dex-browser.com/';
const CHAIN_ID = Number(process.env.CHAIN_ID) as ChainId;
const ENDPOINT = String(process.env.ENDPOINT);
const MAKER_PRIVATE_KEY = String(process.env.MAKER_PRIVATE_KEY);
const TAKER_PRIVATE_KEY = String(process.env.TAKER_PRIVATE_KEY);

const addresses = getContractAddressesForChain(CHAIN_ID);
const provider = new providers.JsonRpcProvider(ENDPOINT);
const maker = new Wallet(MAKER_PRIVATE_KEY, provider);
const taker = new Wallet(TAKER_PRIVATE_KEY, provider);

(async () => {
  const volare = new Volare({
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses,
  });

  const apis = new Apis({
    config: { DECIMAL_PLACES: 2 },
    url: URL,
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses: addresses,
  });

  const premium = await apis.premium();
  const premiumContract = new Contract(premium.address, ERC20Contract.ABI(), provider);
  console.log(premiumContract.address);

  const products = await apis.products();
  console.log(products);

  for (let i = 0; i < products.length; i++) {
    const vTokens = await apis.vTokens(products[i].productHash);
    for (let j = 0; j < vTokens.length; j++) {
      if (vTokens[j].isPut) break;

      // main workflow
      const vTokenContract = new Contract(vTokens[j].tokenAddress, VTokenContract.ABI(), provider);
      const balance = Number($float((await vTokenContract.balanceOf(maker.address)).toString(), VTOKEN_DECIMALS));
      console.log(balance);

      if (balance <= 0) {
        const short = await volare.short(maker, vTokens[j], 1);
        await short.wait();
      }

      const zeroEx = new ZeroEx({
        chainId: CHAIN_ID,
        endpoint: ENDPOINT,
        addresses,
        vTokenAddress: vTokenContract.address,
        premiumAddress: premiumContract.address,
      });
      await zeroEx.init();

      const order = await zeroEx.sell(maker, 0.02, 300.0, getFutureExpiryInSeconds(3600));
      const result = await apis.orderPutLimit(vTokenContract.address, order);
      console.log(result);

      const order2 = await apis.orderLimit(vTokenContract.address, order.orderHash);
      console.log(order2);

      const tx = await zeroEx.fill(taker, order2, 6);
      console.log(tx.hash);
    }
  }
})();
