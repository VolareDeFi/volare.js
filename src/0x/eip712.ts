/**
 * @file eip712.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { ZERO_ADDR } from '@volare.defi/utils.js';

export interface EIP712TypedData {
  domain: TypedDataDomain;
  types: Record<string, Array<TypedDataField>>;
  message: Record<string, any>;
  primaryType: string;
}

const EXCHANGE_PROXY_EIP712_DOMAIN_DEFAULT = {
  chainId: 1,
  verifyingContract: ZERO_ADDR,
  name: 'ZeroEx',
  version: '1.0.0',
};

export function createExchangeProxyEIP712Domain(chainId?: number, verifyingContract?: string): TypedDataDomain {
  return {
    ...EXCHANGE_PROXY_EIP712_DOMAIN_DEFAULT,
    ...(chainId ? { chainId } : {}),
    ...(verifyingContract ? { verifyingContract } : {}),
  };
}

export function getExchangeProxyEIP712DomainHash(chainId?: number, verifyingContract?: string): string {
  return _TypedDataEncoder.hashDomain(createExchangeProxyEIP712Domain(chainId, verifyingContract));
}

export function getExchangeProxyEIP712Hash(eip712TypedData: EIP712TypedData): string {
  return _TypedDataEncoder.hash(
    eip712TypedData.domain,
    eip712TypedData.types,
    eip712TypedData.message,
  );
}
