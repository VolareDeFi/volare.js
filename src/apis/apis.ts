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

import { STRIKE_DECIMALS, VTOKEN_DECIMALS } from '../volare';
import { KeyCash, global, getDecimals } from '../cache';
import {
  Side,
  Price,
  Cash,
  Collateral,
  Product,
  VToken,
  Long,
  OrderBook,
  Order,
} from './interfaces';
import {
  CashUrl,
  WhitelistCollateralUrl,
  WhitelistProductUrl,
  ProductPriceUrl,
  ProductExpiryUrl,
  ProductVTokenUrl,
  VTokenUrl,
  VTokenOrderBookUrl,
  VTokenOrderLimitByHashUrl,
  VTokenOrderLimitPutUrl,
  VTokenAllShortUrl,
  VTokenAllLongUrl,
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
    vToken.strikePrice = this.toFixed(
      $float(
        vToken.strikePrice,
        STRIKE_DECIMALS,
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
      const cash = await this.cash();
      const market = vToken.market;
      vToken.market = {
        changed: this.toPercent(market.changed),
        volume: this.toFixed(market.volume),
        bid1: this.toFixed($float(market.bid1, cash.decimals)),
        bid1IV: this.toFixed(market.bid1IV),
        ask1: this.toFixed($float(market.ask1, cash.decimals)),
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
    const cash = await this.cash();
    order.fee = this.toFixed($float(order.fee, cash.decimals));
    order.price = this.toFixed($float(order.price, cash.decimals));
    order.amount = this.toFixed($float(order.amount, VTOKEN_DECIMALS));
    order.filled = this.toFixed($float(order.filled, VTOKEN_DECIMALS));
    order.size = this.toFixed($float(order.size, VTOKEN_DECIMALS));
    return order;
  }

  async cash(): Promise<Cash> {
    if (global[KeyCash]) return global[KeyCash] as Cash;

    const response = await this.apis.get(
      CashUrl(),
    );
    const cash = response.data as Cash;
    cash.totalSupply = this.toFixed($float(cash.totalSupply, cash.decimals));

    global[KeyCash] = cash;

    return cash;
  }

  async collaterals(): Promise<Array<Collateral>> {
    const response = await this.apis.post(
      WhitelistCollateralUrl(this.addresses.whitelist),
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
      WhitelistProductUrl(this.addresses.whitelist),
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

  async shorts(
    address?: string,
    isExpired?: boolean,
    isSettled?: boolean,
  ): Promise<any> {
    const response = await this.apis.post(
      VTokenAllShortUrl(),
      null,
      {
        params: {
          address,
          isExpired,
          isSettled,
        },
      },
    );
    return response.data;
  }

  async longs(
    address?: string,
    isExpired?: boolean,
    isRedeemed?: boolean,
  ): Promise<Array<Long>> {
    const response = await this.apis.post(
      VTokenAllLongUrl(),
      null,
      {
        params: {
          address,
          isExpired,
          isRedeemed,
        },
      },
    );
    const longs = response.data as Array<any>;
    return await Promise.all(
      longs.map(async (long) => {
        const vToken = await this.vToken(long.vTokenAddress);
        const collateralDecimals = await getDecimals(vToken.collateral, this.provider);

        long.expiryPrice = this.toFixed($float(long.fixingPrice, STRIKE_DECIMALS));
        long.strikePrice = this.toFixed($float(long.strikePrice, STRIKE_DECIMALS));
        long.balance = this.toFixed($float(long.balance, VTOKEN_DECIMALS));
        long.redeemedAmount = this.toFixed($float(long.burnedSize, VTOKEN_DECIMALS));
        long.profit = this.toFixed($float(long.exerciseProfit, collateralDecimals));
        long.roe = this.toPercent(long.roe);
        long.mtime = long.redeemedTimestamp;
        return long;
      }),
    );
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
        const cash = await this.cash();
        page.price = this.toFixed($float(page.price, cash.decimals))
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
    const response = await this.apis.get(
      VTokenOrderLimitByHashUrl(contract, hash),
    );
    return this.o(response.data as Order);
  }

  /***
   * @param contract The controller contract.
   * @param order The order.
   */
  async orderPutLimit(
    contract: string,
    order: Partial<Order>,
  ): Promise<'OK'> {
    const response = await this.apis.post(
      VTokenOrderLimitPutUrl(contract),
      order,
    );
    return response.data;
  }
}
