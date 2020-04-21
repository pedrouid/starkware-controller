import * as starkwareCrypto from 'starkware-crypto';

export interface StarkwareAccountMapping {
  [path: string]: starkwareCrypto.KeyPair;
}
export interface Store {
  set(key: string, data: any): Promise<void>;
  get(key: string): Promise<any>;
  remove(key: string): Promise<void>;
}

export namespace MethodResults {
  export type StarkAccountResult = { starkPublicKey: string };
  export type StarkRegisterResult = { txhash: string };
  export type StarkDepositResult = { txhash: string };
  export type StarkDepositCancelResult = { txhash: string };
  export type StarkDepositReclaimResult = { txhash: string };
  export type StarkTransferResult = { starkSignature: string };
  export type StarkCreateOrderResult = { starkSignature: string };
  export type StarkWithdrawalResult = { txhash: string };
  export type StarkFullWithdrawalResult = { txhash: string };
  export type StarkFreezeResult = { txhash: string };
  export type StarkVerifyEscapeResult = { txhash: string };
  export type StarkEscapeResult = { txhash: string };
}
