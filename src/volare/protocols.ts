/**
 * @file protocols.ts
 * @author astra <astra@volare.com>
 * @date 2022
 */

import { BigNumber } from 'ethers';

export interface Vault {
  shortVTokens: string[];
  longVTokens: string[];
  collateralAssets: string[];
  shortAmounts: BigNumber[];
  longAmounts: BigNumber[];
  collateralAmounts: BigNumber[];
}

export enum ActionType {
  OpenVault = 0,
  MintShortOption = 1,
  BurnShortOption = 2,
  DepositLongOption= 3,
  WithdrawLongOption = 4,
  DepositCollateral = 5,
  WithdrawCollateral = 6,
  SettleVault = 7,
  Redeem = 8,
  Call = 9,
};

export interface ActionArgs {
  actionType: ActionType,
  owner: string;
  secondAddress: string;
  asset: string;
  vaultId: number;
  amount: string;
  index: string;
  data: string;
}
