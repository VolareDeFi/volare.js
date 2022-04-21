/**
 * @file settle.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

import { config } from 'dotenv';
import { providers, Wallet } from 'ethers';
import { ChainId, VolareAddresses } from '@volare.defi/utils.js';
import { getContractAddressesForChain, Volare} from '../src';


config({
  path: '.env',
  encoding: 'utf8',
});

// const URL = 'https://dev.api.dex-browser.com/';
const CHAIN_ID = Number(process.env.CHAIN_ID) as ChainId;
const ENDPOINT = String(process.env.ENDPOINT);
const WRITER_PRIVATE_KEY = String(process.env.MAKER_PRIVATE_KEY);

const addresses = getContractAddressesForChain(CHAIN_ID);
const provider = new providers.JsonRpcProvider(ENDPOINT);
const writer = new Wallet(WRITER_PRIVATE_KEY, provider);

(async () => {
  const volare = new Volare({
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses: addresses as VolareAddresses,
  });

  const counter = await volare.getAccountVaultCounter(await writer.getAddress());
  console.log(counter);
  for (let i = 1; i <= counter; i++) {
    const details = await volare.getVaultWithDetails(await writer.getAddress(), i);
    console.log(details);
    const tx = await volare.settle(writer, i);
    console.log(tx.hash);
  }
})();
