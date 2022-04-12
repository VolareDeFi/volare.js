/**
 * @file index.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

import axios, { Axios } from 'axios';
import { providers } from 'ethers';
import {
  $int,
  BigNumber,
  VolareAddresses,
} from '@volare.defi/utils.js';

import { getDecimals } from '../cache';
import {
  Price,
  Premium,
  Collateral,
  Product,
  VToken,
} from '../interfaces';
import {
  PremiumUrl,
  CollateralUrl,
  ProductUrl,
  PriceUrl,
  VTokenUrl
} from './url';

export interface Options {
  url: string;
  chainId: number;
  endpoint: string;
  addresses: VolareAddresses;
}

export class Apis {
  apis: Axios;
  chainId: number;
  provider: providers.JsonRpcProvider;
  addresses: any;

  constructor(options: Options) {
    this.apis = axios.create({
      baseURL: options.url,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
    this.chainId = options.chainId;
    this.provider = new providers.JsonRpcProvider(options.endpoint);
    this.addresses = options.addresses;
  }

  async premiums(): Promise<Array<Premium>> {
    const response = await this.apis.post(
      PremiumUrl(this.addresses.controller),
    );
    const premiums = response.data as Array<Premium>;
    return premiums.map(premium => {
      premium.totalSupply = $int(premium.totalSupply, premium.decimals);
      return premium;
    });
  }

  async collaterals(): Promise<Array<Collateral>> {
    const response = await this.apis.post(
      CollateralUrl(this.addresses.controller),
    );
    const collaterals = response.data as Array<Collateral>;
    return collaterals.map(collateral => {
      collateral.totalSupply = $int(collateral.totalSupply, collateral.decimals);
      return collateral;
    });
  }

  async products(withPrice = false): Promise<Array<Product>> {
    const params = withPrice ? { withPrice } : undefined;
    const response = await this.apis.post(
      ProductUrl(this.addresses.controller),
      null,
      {
        params,
      },
    );
    const products = response.data as Array<Product>;
    if (withPrice) {
      return products.map(product => {
        product.underlying.totalSupply =
          $int(product.underlying.totalSupply, product.underlying.decimals);
        product.strike.totalSupply =
          $int(product.strike.totalSupply, product.strike.decimals);
        product.collateral.totalSupply =
          $int(product.collateral.totalSupply, product.collateral.decimals);
        product.underlyingPrice.price =
          (new BigNumber(product.underlyingPrice.price)).toString(10);
        product.underlyingPrice.changed =
          (new BigNumber(product.underlyingPrice.changed).div(10)).toString(10) + '%';
        return product;
      });
    }
    return products;
  }

  async prices(hash: string): Promise<{
    uniswap: Array<Price>,
    binance: Array<Price>,
  }> {
    const response = await this.apis.post(
      PriceUrl(hash),
    );
    const prices = response.data as {
      uniswap: Array<Price>,
      binance: Array<Price>,
    };
    prices.uniswap.map(price => {
      price.price = (new BigNumber(price.price)).toString(10);
      price.changed = (new BigNumber(price.changed).div(10)).toString(10) + '%';
      return price;
    });
    prices.binance.map(price => {
      price.price = (new BigNumber(price.price)).toString(10);
      price.changed = (new BigNumber(price.changed).div(10)).toString(10) + '%';
      return price;
    });
    return prices;
  }

  /***
   * @param hash The product hash.
   */
  async vTokens(hash: string): Promise<Array<VToken>> {
    const response = await this.apis.post(
      VTokenUrl(hash),
    );
    const vTokens = response.data as Array<VToken>;
    return await Promise.all(
      vTokens.map(
        async (vToken: VToken) => {
          const decimals = await getDecimals(vToken.strike.toLowerCase(), this.provider);
          vToken.strikePrice = $int(
            vToken.strikePrice,
            decimals,
          );
          return vToken;
        }
      )
    );
  }
}
