import * as starkwareCrypto from 'starkware-crypto';

export interface StarkwareAccountMapping {
  [path: string]: string;
}
export interface Store {
  set(key: string, data: any): Promise<void>;
  get(key: string): Promise<any>;
  remove(key: string): Promise<void>;
}

export namespace MethodParams {
  export type StarkAccountParams = {
    layer: string;
    application: string;
    index: string;
  };
  export type StarkRegisterParams = {
    contractAddress: string;
    starkPublicKey: string;
    operatorSignature: string;
  };
  export type StarkDepositParams = {
    contractAddress: string;
    starkPublicKey: string;
    quantizedAmount: string;
    token: starkwareCrypto.Token;
    vaultId: string;
  };
  export type StarkDepositCancelParams = {
    contractAddress: string;
    starkPublicKey: string;
    token: starkwareCrypto.Token;
    vaultId: string;
  };
  export type StarkDepositReclaimParams = {
    ontractAddress: string;
    starkPublicKey: string;
    token: starkwareCrypto.Token;
    vaultId: string;
  };
  export type StarkTransferParams = {
    from: starkwareCrypto.TransferParams;
    to: starkwareCrypto.TransferParams;
    token: starkwareCrypto.Token;
    quantizedAmount: string;
    nonce: string;
    expirationTimestamp: string;
  };
  export type StarkCreateOrderParams = {
    starkPublicKey: string;
    sell: starkwareCrypto.OrderParams;
    buy: starkwareCrypto.OrderParams;
    nonce: string;
    expirationTimestamp: string;
  };
  export type StarkWithdrawalParams = {
    contractAddress: string;
    starkPublicKey: string;
    token: starkwareCrypto.Token;
  };
  export type StarkFullWithdrawalParams = {
    contractAddress: string;
    starkPublicKey: string;
    vaultId: string;
  };
  export type StarkFreezeParams = {
    contractAddress: string;
    starkPublicKey: string;
    vaultId: string;
  };
  export type StarkVerifyEscapeParams = {
    contractAddress: string;
    starkPublicKey: string;
    proof: string[];
  };
  export type StarkEscapeParams = {
    contractAddress: string;
    starkPublicKey: string;
    vaultId: string;
    token: starkwareCrypto.Token;
    quantizedAmount: string;
  };
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
