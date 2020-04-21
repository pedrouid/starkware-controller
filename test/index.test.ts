import * as ethers from 'ethers';
import StarkwareController from '../src';

describe('starkware-controller', () => {
  it('should initiate successfully', async () => {
    const wallet = ethers.Wallet.createRandom();

    const store = {
      set: async (key: string, data: any) => {},
      get: async (key: string) => {},
      remove: async (key: string) => {},
    };

    const controller = new StarkwareController(wallet, store);

    expect(controller).toBeTruthy();
  });
});
