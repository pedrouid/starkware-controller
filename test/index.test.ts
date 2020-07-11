import { Wallet } from 'ethers';

import StarkwareController, { TokenTypes } from '../src';

const storage = {};

const store = {
  set: async (key: string, data: any) => {
    storage[key] = data;
  },
  get: async (key: string) => {
    return storage[key];
  },
  remove: async (key: string) => {
    delete storage[key];
  },
};

const mnemonic =
  'puzzle number lab sense puzzle escape glove faith strike poem acoustic picture grit struggle know tuna soul indoor thumb dune fit job timber motor';
const layer = 'starkex';
const application = 'starkexdvf';
const index = '0';

const wallet = Wallet.fromMnemonic(mnemonic);

const starkPublicKey =
  '0x017e159e246999ee9ce7d1103d5d0d52c468bcb385d202ef362de2f878162c48';

// const starkSignature = '0x7130036cfee14ee468f84538da0b2c71f11908f3dcc4c0b7fb28c2e0c8504d1e4e3191d2adb180a2ec31eff2366381e2ec807426f232a6cae2387d6d7886e1c';

describe('starkware-controller', () => {
  let controller: StarkwareController;
  beforeEach(() => {
    controller = new StarkwareController(wallet, store);
  });
  it('should initiate successfully', async () => {
    expect(controller).toBeTruthy();
  });
  it('should resolve successfully', async () => {
    const res = await controller.resolve({
      id: 1,
      jsonrpc: '2.0',
      method: 'stark_account',
      params: { layer, application, index },
    });
    expect(res).toBeTruthy();
    expect(res.result.starkPublicKey).toEqual(starkPublicKey);
  });
  it('should resolve stark_account', async () => {
    const res = await controller.account(layer, application, index);
    expect(res).toBeTruthy();
    expect(res.starkPublicKey).toEqual(starkPublicKey);
  });

  // it('should resolve stark_transfer', async () => {
  //   const params = {
  //     contractAddress: '0xC5273AbFb36550090095B1EDec019216AD21BE6c',
  //     from: {
  //       starkPublicKey,
  //       vaultId: '34',
  //     },
  //     to: {
  //       starkPublicKey:
  //         '0x5fa3383597691ea9d827a79e1a4f0f7949435ced18ca9619de8ab97e661020',
  //       vaultId: '21',
  //     },
  //     token: {
  //       quantum: '',
  //       tokenAddress: '',
  //     },
  //     quantizedAmount: '2154549703648910716',
  //     nonce: '1',
  //     expirationTimestamp: '438953',
  //   };
  //   const res = await controller.transfer(
  //     params.from,
  //     params.to,
  //     {
  //       type: 'ERC20',
  //       data: params.token,
  //     },
  //     params.quantizedAmount,
  //     params.nonce,
  //     params.expirationTimestamp
  //   );
  //   expect(res).toBeTruthy();
  //   expect(res.starkSignature).toEqual(starkSignature);
  // });
});
