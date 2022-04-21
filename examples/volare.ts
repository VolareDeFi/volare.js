/**
 * @file volare.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

import { config } from 'dotenv';
import { Wallet } from 'ethers';
import { ChainId, VolareAddresses, $float } from '@volare.defi/utils.js';
import { getContractAddressesForChain, Volare } from '../src';


config({
  path: '.env',
  encoding: 'utf8',
});

const CHAIN_ID = Number(process.env.CHAIN_ID) as ChainId;
const ENDPOINT = String(process.env.ENDPOINT);
const WRITER_PRIVATE_KEY = String(process.env.MAKER_PRIVATE_KEY);

const addresses = getContractAddressesForChain(CHAIN_ID);
const owner = new Wallet(WRITER_PRIVATE_KEY);

(async () => {
  const volare = new Volare({
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses: addresses as VolareAddresses,
  });

  console.log(`getStoredBalance(weth): ${$float(await volare.getStoredBalance(addresses.weth), 18)}`);
  console.log(`getStoredBalance(dai): ${$float(await volare.getStoredBalance(addresses.dai), 18)}`);
  console.log(`getStoredBalance(usdt): ${$float(await volare.getStoredBalance(addresses.usdt), 6)}`);
  console.log(`getStoredBalance(usdc): ${$float(await volare.getStoredBalance(addresses.usdc), 6)}`);
  console.log(`getStoredBalance(cusdc): ${$float(await volare.getStoredBalance(addresses.cusdc), 8)}`);

  const [vault, vaultType] = await volare.getVaultWithDetails(owner.address, 2);
  console.log(await volare.getExcessCollateral(vault, vaultType));
})();
