/**
 * @file index.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

import axios, { Axios } from 'axios';
import { providers } from 'ethers';
import {
  $float,
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
  ExpiryUrl,
  VTokenUrl
} from './url';

export interface Options {
  config?: BigNumber.Config;

  url: string;
  chainId: number;
  endpoint: string;
  addresses: VolareAddresses;
}

export class Apis {
  // format
  config: BigNumber.Config;

  apis: Axios;
  chainId: number;
  provider: providers.JsonRpcProvider;
  addresses: any;

  constructor(options: Options) {
    this.config = options.config || { DECIMAL_PLACES: 2 };
    BigNumber.config(this.config);

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

  private toFixed(f: number | string): string {
    return (new BigNumber(f)).toFixed(this.config.DECIMAL_PLACES as number);
  }

  private toPercent(p: number | string): string {
    return (new BigNumber(p).div(10)).toFixed(this.config.DECIMAL_PLACES as number) + '%';
  }

  async premiums(): Promise<Array<Premium>> {
    const response = await this.apis.post(
      PremiumUrl(this.addresses.controller),
    );
    const premiums = response.data as Array<Premium>;
    return premiums.map(premium => {
      premium.totalSupply = this.toFixed($float(premium.totalSupply, premium.decimals));
      return premium;
    });
  }

  async collaterals(): Promise<Array<Collateral>> {
    const response = await this.apis.post(
      CollateralUrl(this.addresses.controller),
    );
    const collaterals = response.data as Array<Collateral>;
    return collaterals.map(collateral => {
      collateral.totalSupply = this.toFixed($float(collateral.totalSupply, collateral.decimals));
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
          this.toFixed($float(product.underlying.totalSupply, product.underlying.decimals));
        product.strike.totalSupply =
          this.toFixed($float(product.strike.totalSupply, product.strike.decimals));
        product.collateral.totalSupply =
          this.toFixed($float(product.collateral.totalSupply, product.collateral.decimals));
        product.underlyingPrice.price = this.toFixed(product.underlyingPrice.price);
        product.underlyingPrice.changed = this.toPercent(product.underlyingPrice.changed);
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
      price.price = this.toFixed(price.price)
      price.changed = this.toPercent(price.changed);
      return price;
    });
    prices.binance.map(price => {
      price.price = this.toFixed(price.price)
      price.changed = this.toPercent(price.changed);
      return price;
    });
    return prices;
  }

  async expiry(hash: string): Promise<Array<number>> {
    const response = await this.apis.post(
      ExpiryUrl(hash),
    );
    return response.data;
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
          const decimals = await getDecimals(vToken.strike, this.provider);
          vToken.strikePrice = this.toFixed(
            $float(
              vToken.strikePrice,
              decimals,
            )
          );
          return vToken;
        }
      )
    );
  }
}
