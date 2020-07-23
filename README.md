# starkware-controller [![npm version](https://badge.fury.io/js/starkware-controller.svg)](https://badge.fury.io/js/starkware-controller)

Starkware JSON-RPC Controller Library

## Example

```typescript
import { Wallet } from 'ethers';
import StarkwareController from 'starkware-controller';

const rpcUrl = 'https://ropsten.mycustomnode.com';

const mnemonic = `puzzle number lab sense puzzle escape glove faith strike poem acoustic picture grit struggle know tuna soul indoor thumb dune fit job timber motor`;

const wallet = Wallet.fromMnemonic(mnemonic).connect(rpcUrl);

const store = {
  set: async (key: string, data: any) => {
    window.localStorage.setItem(key, JSON.stringify(data));
  },
  get: async (key: string) => {
    return JSON.parse(window.localStorage.getItem(key));
  },
  remove: async (key: string) => {
    window.localStorage.removeItem(key);
  },
};

//  Create StarkwareController
const controller = new StarkwareController(mnemonic, rpcUrl, store);

// Initiate
await controller.init();

// Stark Account Params
const layer = 'starkex';
const application = 'starkexdvf';
const index = '0';

// Get Stark Public Key
const starkPublicKey = await controller.account(layer, application, index);
// 0x59a543d42bcc9475917247fa7f136298bb385a6388c3df7309955fcb39b8dd4
```

## API

```typescript
interface StarkwareController {
  provider: providers.Provider;
  walletIndex: number;
  setProvider(provider: string | providers.Provider): void;
  setWalletIndex(walletIndex: number): void;
  getStarkPublicKey(path?: string): Promise<string>;
  getActiveKeyPair(): Promise<starkwareCrypto.KeyPair>;
  getEthereumAddress(): string;
  account(layer: string, application: string, index: string): Promise<string>;
  register(
    contractAddress: string,
    starkPublicKey: string,
    operatorSignature: string
  ): Promise<PopulatedTransaction>;
  deposit(
    contractAddress: string,
    starkPublicKey: string,
    quantizedAmount: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<PopulatedTransaction>;
  depositCancel(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<PopulatedTransaction>;
  depositReclaim(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<PopulatedTransaction>;
  transfer(
    from: starkwareCrypto.TransferParams,
    to: starkwareCrypto.TransferParams,
    token: starkwareCrypto.Token,
    quantizedAmount: string,
    nonce: string,
    expirationTimestamp: string
  ): Promise<string>;
  createOrder(
    starkPublicKey: string,
    sell: starkwareCrypto.OrderParams,
    buy: starkwareCrypto.OrderParams,
    nonce: string,
    expirationTimestamp: string
  ): Promise<string>;
  withdrawal(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token
  ): Promise<PopulatedTransaction>;
  fullWithdrawal(
    contractAddress: string,
    starkPublicKey: string,
    vaultId: string
  ): Promise<PopulatedTransaction>;
  freeze(
    contractAddress: string,
    starkPublicKey: string,
    vaultId: string
  ): Promise<PopulatedTransaction>;
  verifyEscape(
    contractAddress: string,
    starkPublicKey: string,
    proof: string[]
  ): Promise<PopulatedTransaction>;
  escape(
    contractAddress: string,
    starkPublicKey: string,
    vaultId: string,
    token: starkwareCrypto.Token,
    quantizedAmount: string
  ): Promise<PopulatedTransaction>;
}

interface PopulatedTransaction {
  to?: string;
  from?: string;
  nonce?: number;
  gasLimit?: BigNumber;
  gasPrice?: BigNumber;
  data?: string;
  value?: BigNumber;
  chainId?: number;
}
```
