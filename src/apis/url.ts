/**
 * @file url.ts
 * @author astra <astra@volare.finance>
 * @date 2022
 */

export const PremiumUrl = (address: string) => `/eth/volare/${address}/premium`;
export const CollateralUrl = (address: string) => `/eth/volare/${address}/collaterals`;
export const ProductUrl = (address: string) => `/eth/volare/${address}/products`;
export const ProductPriceUrl = (hash: string) => `/eth/volare/products/${hash}/prices`;
export const ProductExpiryUrl = (hash: string) => `/eth/volare/products/${hash}/expiryTimestamps`;
export const ProductVTokenUrl = (hash: string) => `/eth/volare/products/${hash}/vTokens`;
export const VTokenUrl = (contract: string) => `/eth/volare/vTokens/${contract}`;
