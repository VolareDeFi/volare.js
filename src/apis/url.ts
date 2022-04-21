/**
 * @file url.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

export const CashUrl = () => `/eth/volare/cash`;
export const WhitelistCollateralUrl = (contract: string) => `/eth/volare/whitelists/${contract}/collaterals`;
export const WhitelistProductUrl = (contract: string) => `/eth/volare/whitelists/${contract}/products`;
export const ProductPriceUrl = (hash: string) => `/eth/volare/products/${hash}/prices`;
export const ProductExpiryUrl = (hash: string) => `/eth/volare/products/${hash}/expiryTimestamps`;
export const ProductVTokenUrl = (hash: string) => `/eth/volare/products/${hash}/vTokens`;
export const VTokenUrl = (contract: string) => `/eth/volare/vTokens/${contract}`;
export const VTokenOrderBookUrl = (contract: string) =>`/eth/volare/vTokens/${contract}/orders/book`;
export const VTokenOrderLimitByHashUrl = (contract: string, hash: string) =>`/eth/volare/vTokens/${contract}/orders/limits/${hash}`;
export const VTokenOrderLimitPutUrl = (contract: string) =>`/eth/volare/vTokens/${contract}/orders/limits/put`;
export const VTokenAllLongUrl = () => `/eth/volare/vTokens/long`;
export const VTokenAllShortUrl = () => `/eth/volare/vTokens/short`;
