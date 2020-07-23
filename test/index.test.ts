import StarkwareController from '../src';

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

const provider = 'https://api.mycryptoapi.com/eth';

const starkPublicKey =
  '0x017e159e246999ee9ce7d1103d5d0d52c468bcb385d202ef362de2f878162c48';

describe('starkware-controller', () => {
  let controller: StarkwareController;
  beforeEach(() => {
    controller = new StarkwareController(mnemonic, provider, store);
  });
  it('should initiate successfully', async () => {
    expect(controller).toBeTruthy();
  });
  it('should resolve stark_account', async () => {
    const result = await controller.account(layer, application, index);
    expect(result).toBeTruthy();
    expect(result).toEqual(starkPublicKey);
  });
});
