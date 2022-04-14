/**
 * @file apis.ts
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

import { VTOKEN_DECIMALS } from '../volare';
import { KeyPremium, global, getDecimals } from '../cache';
import {
  Side,
  Price,
  Premium,
  Collateral,
  Product,
  VToken,
  OrderBook,
  Order,
} from './interfaces';
import {
  PremiumUrl,
  CollateralUrl,
  ProductUrl,
  ProductPriceUrl,
  ProductExpiryUrl,
  ProductVTokenUrl,
  VTokenUrl,
  VTokenOrderBookUrl,
  VTokenOrderLimitByHashUrl,
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

  private async v(
    vToken: VToken,
    address?: string,
    withStat?: boolean,
    withMarket?: boolean,
    withGreek?: boolean,
  ): Promise<VToken> {
    const decimals = await getDecimals(vToken.strike, this.provider);
    vToken.strikePrice = this.toFixed(
      $float(
        vToken.strikePrice,
        decimals,
      )
    );

    // address
    if (address) {
      const position = vToken.position;
      vToken.position = {
        amount: this.toFixed($float(position.amount, VTOKEN_DECIMALS)),
      };
    }

    // stat
    if (withStat) {
      const stat = vToken.stat;
      vToken.stat = {
        totalSupply: this.toFixed($float(stat.totalSupply, VTOKEN_DECIMALS)),
        holder: stat.holder,
      };
    }

    // market
    if (withMarket) {
      const premium = await this.premium();
      const market = vToken.market;
      vToken.market = {
        changed: this.toPercent(market.changed),
        volume: this.toFixed(market.volume),
        bid1: this.toFixed($float(market.bid1, premium.decimals)),
        bid1IV: this.toFixed(market.bid1IV),
        ask1: this.toFixed($float(market.ask1, premium.decimals)),
        ask1IV: this.toFixed(market.ask1IV),
      };
    }

    // greek
    if (withGreek) {
      const greek = vToken.greek;
      vToken.greek = {
        delta: this.toFixed(greek.delta),
        gamma: this.toFixed(greek.gamma),
        theta: this.toFixed(greek.theta),
        vega: this.toFixed(greek.vega),
        rho: this.toFixed(greek.rho),
      };
    }
    return vToken;
  }

  private async o(order: Order): Promise<Order> {
    const premium = await this.premium();
    order.fee = this.toFixed($float(order.fee, premium.decimals));
    order.price = this.toFixed($float(order.price, premium.decimals));
    order.amount = this.toFixed($float(order.amount, VTOKEN_DECIMALS));
    order.filled = this.toFixed($float(order.filled, VTOKEN_DECIMALS));
    order.size = this.toFixed($float(order.size, VTOKEN_DECIMALS));
    return order;
  }

  async premium(): Promise<Premium> {
    if (global[KeyPremium]) return global[KeyPremium] as Premium;

    const response = await this.apis.get(
      PremiumUrl(this.addresses.controller),
    );
    const premium = response.data as Premium;
    premium.totalSupply = this.toFixed($float(premium.totalSupply, premium.decimals));

    global[KeyPremium] = premium;

    return premium;
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
      ProductPriceUrl(hash),
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
      ProductExpiryUrl(hash),
    );
    return response.data;
  }

  /***
   * @param hash The product hash.
   * @param expiry
   * @param address
   * @param withStat
   * @param withMarket
   * @param withGreek
   */
  async vTokens(
    hash: string,
    expiry?: number,
    address?: string,
    withStat?: boolean,
    withMarket?: boolean,
    withGreek?: boolean,
  ): Promise<Array<VToken>> {
    const response = await this.apis.post(
      ProductVTokenUrl(hash),
      null,
      {
        params: {
          expiry,
          address,
          withStat,
          withMarket,
          withGreek,
        },
      },
    );
    const vTokens = response.data as Array<VToken>;
    return await Promise.all(
      vTokens.map(async (vToken: VToken) => this.v(vToken, address, withStat, withMarket, withGreek)),
    );
  }

  /***
   * @param contract The vToken contract.
   * @param address
   * @param withStat
   * @param withMarket
   * @param withGreek
   */
  async vToken(
    contract: string,
    address?: string,
    withStat?: boolean,
    withMarket?: boolean,
    withGreek?: boolean,
  ): Promise<VToken> {
    const response = await this.apis.post(
      VTokenUrl(contract),
      null,
      {
        params: {
          address,
          withStat,
          withMarket,
          withGreek,
        },
      },
    );
    return this.v(response.data as VToken, address, withStat, withMarket, withGreek);
  }

  async orderBook(
    contract: string,
    side: Side,
  ): Promise<OrderBook> {
    const response = await this.apis.post(
      VTokenOrderBookUrl(contract),
      null,
      {
        params: {
          side,
        },
      },
    );
    const book = response.data as OrderBook;
    return await Promise.all(
      book.map(async (page) => {
        const premium = await this.premium();
        page.price = this.toFixed($float(page.price, premium.decimals))
        page.size = this.toFixed($float(page.size, VTOKEN_DECIMALS));
        return page;
      }),
    );
  }

  /***
   * @param contract The controller contract.
   * @param hash The order hash.
   */
  async orderLimit(
    contract: string,
    hash: string,
  ): Promise<Order> {
    const response = await this.apis.post(
      VTokenOrderLimitByHashUrl(contract, hash),
    );
    return this.o(response.data as Order);
  }
}