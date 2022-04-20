/**
 * @file settle.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

import { config } from 'dotenv';
import { providers, Wallet, Contract } from 'ethers';
import { VolareAddresses, $float, ChainId, ERC20Contract } from '@volare.defi/utils.js';
import { VTOKEN_DECIMALS, getContractAddressesForChain, Volare, Apis } from '../src';


config({
  path: '.env',
  encoding: 'utf8',
});

const URL = 'https://dev.api.dex-browser.com/';
const CHAIN_ID = Number(process.env.CHAIN_ID) as ChainId;
const ENDPOINT = String(process.env.ENDPOINT);
const TAKER_PRIVATE_KEY = String(process.env.TAKER_PRIVATE_KEY);

const addresses = getContractAddressesForChain(CHAIN_ID);
const provider = new providers.JsonRpcProvider(ENDPOINT);
const holder = new Wallet(TAKER_PRIVATE_KEY, provider);

(async () => {
  const volare = new Volare({
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses: addresses as VolareAddresses,
  });
  const apis = new Apis({
    config: { DECIMAL_PLACES: 2 },
    url: URL,
    chainId: CHAIN_ID,
    endpoint: ENDPOINT,
    addresses: addresses,
  });

  const long = await apis.longs(holder.address, true, false);
  console.log(long);
  for (let i = 0; i < long.length; i++) {
    const vTokenAddress = long[i].vTokenAddress;
    const vTokenContract = new Contract(vTokenAddress, ERC20Contract.ABI(), provider);
    const vToken = await apis.vToken(vTokenAddress);
    const result = await volare.getVTokenDetails(vTokenAddress);
    console.log(result);

    console.log(await volare.getExpiryPrice(vToken.underlying, vToken.expiry));
    console.log(await volare.getExpiryPrice(vToken.strike, vToken.expiry));
    console.log(await volare.getExpiryPrice(vToken.collateral, vToken.expiry));
    console.log(await volare.isDisputePeriodOver(vToken.underlying, vToken.expiry));
    console.log(await volare.isDisputePeriodOver(vToken.strike, vToken.expiry));
    console.log(await volare.isDisputePeriodOver(vToken.collateral, vToken.expiry));

    const scaledOptionsAmount = await vTokenContract.balanceOf(holder.address);
    const optionsAmount = $float(scaledOptionsAmount.toString(), VTOKEN_DECIMALS);
    console.log(optionsAmount);
    const tx = await volare.redeem(holder, vToken, optionsAmount);
    console.log(tx.hash);
  }
})();
