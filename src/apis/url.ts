/**
 * @file url.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

export const PremiumUrl = (address: string) => `/eth/volare/${address}/premiums`;
export const CollateralUrl = (address: string) => `/eth/volare/${address}/collaterals`;
export const ProductUrl = (address: string) => `/eth/volare/${address}/products`;
export const PriceUrl = (hash: string) => `/eth/volare/products/${hash}/prices`;
export const ExpiryUrl = (hash: string) => `/eth/volare/products/${hash}/expiryTimestamps`;
export const VTokenUrl = (hash: string) => `/eth/volare/products/${hash}/vTokens`;
