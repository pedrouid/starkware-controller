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
  'owner hover awake board copper fiber organ sudden nominee trick decline inflict';
const layer = 'starkex';
const application = 'starkexdvf';
const index = '0';

const provider = 'https://ropsten-rpc.linkpool.io/';

const starkPublicKey =
  '0x03a535c13f12c6a2c7e7c0dade3a68225988698687e396a321c12f5d393bea4a';

const starkSignature =
  '0x3e243c5b004c89cd9c66fd1c8361c2d42226816214ac113f441027f165c6a78c7724575abe95602caac714cbc1e650ca3f2355e76dbb5ffb6065c194a38471b';

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
  it('should resolve stark_transfer', async () => {
    const from = {
      starkPublicKey:
        '0x03a535c13f12c6a2c7e7c0dade3a68225988698687e396a321c12f5d393bea4a',
      vaultId: '1',
    };
    const to = {
      starkPublicKey:
        '0x03a535c13f12c6a2c7e7c0dade3a68225988698687e396a321c12f5d393bea4a',
      vaultId: '606138218',
    };
    const token = { type: 'ETH' as 'ETH', data: { quantum: '10000000000' } };
    const quantizedAmount = '100000000';
    const nonce = '1597237097';
    const expirationTimestamp = '444396';
    const result = await controller.transfer(
      from,
      to,
      token,
      quantizedAmount,
      nonce,
      expirationTimestamp
    );
    expect(result).toBeTruthy();
    expect(result).toEqual(starkSignature);
  });
});
