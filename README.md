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
```
