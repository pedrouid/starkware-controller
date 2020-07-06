# starkware-controller [![npm version](https://badge.fury.io/js/starkware-controller.svg)](https://badge.fury.io/js/starkware-controller)

Starkware JSON-RPC Controller Library

## Example

```typescript
import * as ethers from 'ethers';
import StarkwareController from 'starkware-controller';

const wallet = ethers.Wallet.createRandom();

const store = {
  set: async (key: string, data: any) => {},
  get: async (key: string) => {},
  remove: async (key: string) => {},
};

//  Create StarkwareController
const controller = new StarkwareController(wallet, store);

// Initiate
await controller.init();

// Example payload
const payload = {
  id: 1,
  jsonrpc: '2.0',
  method: 'stark_account',
  params: {
    layer: 'starkex',
    application: 'starkexdvf',
    index: '0',
  },
};

// Resolve payload
const result = await controller.resolve(payload);
// {
//     "id": 1,
//     "jsonrpc": "2.0",
//     "result": {
//         "starkPublicKey":"0x59a543d42bcc9475917247fa7f136298bb385a6388c3df7309955fcb39b8dd4",
//     }
// }
```

## API

```typescript
interface StarkwareController {
  setProvider(provider: string | providers.JsonRpcProvider): void;
  getStarkPublicKey(path?: string): Promise<string>;
  getActiveKeyPair();
  account(
    layer: string,
    application: string,
    index: string
  ): Promise<MethodResults.StarkAccountResult>;
  register(
    contractAddress: string,
    starkPublicKey: string,
    operatorSignature: string
  ): Promise<MethodResults.StarkRegisterResult>;
  deposit(
    contractAddress: string,
    starkPublicKey: string,
    quantizedAmount: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<MethodResults.StarkDepositResult>;
  depositCancel(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<MethodResults.StarkDepositCancelResult>;
  depositReclaim(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<MethodResults.StarkDepositReclaimResult>;
  transfer(
    from: starkwareCrypto.TransferParams,
    to: starkwareCrypto.TransferParams,
    token: starkwareCrypto.Token,
    quantizedAmount: string,
    nonce: string,
    expirationTimestamp: string
  ): Promise<MethodResults.StarkTransferResult>;
  createOrder(
    starkPublicKey: string,
    sell: starkwareCrypto.OrderParams,
    buy: starkwareCrypto.OrderParams,
    nonce: string,
    expirationTimestamp: string
  ): Promise<MethodResults.StarkCreateOrderResult>;
  withdrawal(
    contractAddress: string,
    token: starkwareCrypto.Token
  ): Promise<MethodResults.StarkWithdrawalResult>;
  fullWithdrawal(
    contractAddress: string,
    vaultId: string
  ): Promise<MethodResults.StarkFullWithdrawalResult>;
  freeze(
    contractAddress: string,
    vaultId: string
  ): Promise<MethodResults.StarkFreezeResult>;
  verifyEscape(
    contractAddress: string,
    proof: string[]
  ): Promise<MethodResults.StarkVerifyEscapeResult>;
  escape(
    contractAddress: string,
    starkPublicKey: string,
    vaultId: string,
    token: starkwareCrypto.Token,
    quantizedAmount: string
  ): Promise<MethodResults.StarkEscapeResult>;
  resolve(payload: any);
}

namespace MethodResults {
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
```
