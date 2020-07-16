import { Wallet, Contract, providers } from 'ethers';

import abi from './abi';
import * as starkwareCrypto from './crypto';
import { Store, StarkwareAccountMapping, MethodResults } from './types';
import { MethodParams } from 'starkware-types';

const DEFAULT_ACCOUNT_MAPPING_KEY = 'STARKWARE_ACCOUNT_MAPPING';

// -- StarkwareController --------------------------------------------- //

export class StarkwareController {
  private accountMapping: StarkwareAccountMapping | undefined;
  private activeKeyPair: starkwareCrypto.KeyPair | undefined;

  constructor(
    private wallet: Wallet,
    private store: Store,
    public accountMappingKey: string = DEFAULT_ACCOUNT_MAPPING_KEY
  ) {}

  // -- Get / Set ----------------------------------------------------- //

  public setProvider(provider: string | providers.JsonRpcProvider): void {
    this.wallet = this.wallet.connect(
      typeof provider === 'string'
        ? new providers.JsonRpcProvider(provider)
        : provider
    );
  }

  public async getStarkPublicKey(path?: string): Promise<string> {
    const keyPair = await this.getKeyPairFromPath(path);
    const publicKey = starkwareCrypto.getPublic(keyPair);
    const starkPublicKey = starkwareCrypto.getStarkPublicKey(publicKey);
    return starkPublicKey;
  }

  public async getActiveKeyPair() {
    await this.getAccountMapping();
    if (this.activeKeyPair) {
      return this.activeKeyPair;
    } else {
      throw new Error('No Active Starkware KeyPair - please provide a path');
    }
  }

  // -- JSON-RPC ----------------------------------------------------- //

  public async account(
    layer: string,
    application: string,
    index: string
  ): Promise<MethodResults.StarkAccountResult> {
    const path = starkwareCrypto.getAccountPath(
      layer,
      application,
      this.wallet.address,
      index
    );
    const starkPublicKey = await this.getStarkPublicKey(path);
    return { starkPublicKey };
  }

  public async register(
    contractAddress: string,
    starkPublicKey: string,
    operatorSignature: string
  ): Promise<MethodResults.StarkRegisterResult> {
    const exchangeContract = this.getExchangeContract(contractAddress);
    const { hash: txhash } = await exchangeContract.register(
      starkPublicKey,
      operatorSignature
    );
    return { txhash };
  }

  public async deposit(
    contractAddress: string,
    starkPublicKey: string,
    quantizedAmount: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<MethodResults.StarkDepositResult> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const { hash: txhash } = await exchangeContract.deposit(
      tokenId,
      vaultId,
      quantizedAmount
    );
    return { txhash };
  }

  public async depositCancel(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<MethodResults.StarkDepositCancelResult> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const { hash: txhash } = await exchangeContract.depositCancel(
      tokenId,
      vaultId
    );
    return { txhash };
  }

  public async depositReclaim(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<MethodResults.StarkDepositReclaimResult> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const { hash: txhash } = await exchangeContract.depositReclaim(
      tokenId,
      vaultId
    );
    return { txhash };
  }

  public async transfer(
    from: starkwareCrypto.TransferParams,
    to: starkwareCrypto.TransferParams,
    token: starkwareCrypto.Token,
    quantizedAmount: string,
    nonce: string,
    expirationTimestamp: string
  ): Promise<MethodResults.StarkTransferResult> {
    await this.assertStarkPublicKey(from.starkPublicKey);
    const senderVaultId = from.vaultId;
    const receiverVaultId = to.vaultId;
    const receiverPublicKey = to.starkPublicKey;
    const msg = starkwareCrypto.getTransferMsg(
      quantizedAmount,
      nonce,
      senderVaultId,
      token,
      receiverVaultId,
      receiverPublicKey,
      expirationTimestamp
    );
    const keyPair = await this.getActiveKeyPair();
    const signature = starkwareCrypto.sign(keyPair, msg);
    const starkSignature = starkwareCrypto.serializeSignature(signature);
    return { starkSignature };
  }

  public async createOrder(
    starkPublicKey: string,
    sell: starkwareCrypto.OrderParams,
    buy: starkwareCrypto.OrderParams,
    nonce: string,
    expirationTimestamp: string
  ): Promise<MethodResults.StarkCreateOrderResult> {
    await this.assertStarkPublicKey(starkPublicKey);
    const vaultSell = sell.vaultId;
    const vaultBuy = buy.vaultId;
    const amountSell = sell.quantizedAmount;
    const amountBuy = buy.quantizedAmount;
    const tokenSell = sell.token;
    const tokenBuy = buy.token;
    const msg = starkwareCrypto.getLimitOrderMsg(
      vaultSell,
      vaultBuy,
      amountSell,
      amountBuy,
      tokenSell,
      tokenBuy,
      nonce,
      expirationTimestamp
    );
    const keyPair = await this.getActiveKeyPair();
    const signature = starkwareCrypto.sign(keyPair, msg);
    const starkSignature = starkwareCrypto.serializeSignature(signature);
    return { starkSignature };
  }

  public async withdrawal(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token
  ): Promise<MethodResults.StarkWithdrawalResult> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const { hash: txhash } = await exchangeContract.withdraw(tokenId);
    return { txhash };
  }

  public async fullWithdrawal(
    contractAddress: string,
    starkPublicKey: string,
    vaultId: string
  ): Promise<MethodResults.StarkFullWithdrawalResult> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const { hash: txhash } = await exchangeContract.fullWithdrawalRequest(
      vaultId
    );
    return { txhash };
  }

  public async freeze(
    contractAddress: string,
    starkPublicKey: string,
    vaultId: string
  ): Promise<MethodResults.StarkFreezeResult> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const { hash: txhash } = await exchangeContract.freezeRequest(vaultId);
    return { txhash };
  }

  public async verifyEscape(
    contractAddress: string,
    starkPublicKey: string,
    proof: string[]
  ): Promise<MethodResults.StarkVerifyEscapeResult> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const { hash: txhash } = await exchangeContract.verifyEscape(proof);
    return { txhash };
  }

  public async escape(
    contractAddress: string,
    starkPublicKey: string,
    vaultId: string,
    token: starkwareCrypto.Token,
    quantizedAmount: string
  ): Promise<MethodResults.StarkEscapeResult> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const { hash: txhash } = await exchangeContract.escape(
      starkPublicKey,
      vaultId,
      tokenId,
      quantizedAmount
    );
    return { txhash };
  }

  public async resolve(payload: any) {
    let response: { id: number; result: any };
    const { id, method } = payload;
    try {
      switch (method) {
        case 'stark_account':
          const accountParams = payload.params as MethodParams.StarkAccountParams;
          response = {
            id,
            result: await this.account(
              accountParams.layer,
              accountParams.application,
              accountParams.index
            ),
          };
          break;
        case 'stark_register':
          const registerParams = payload.params as MethodParams.StarkRegisterParams;
          response = {
            id,
            result: await this.register(
              registerParams.contractAddress,
              registerParams.starkPublicKey,
              registerParams.operatorSignature
            ),
          };
          break;
        case 'stark_deposit':
          const depositParams = payload.params as MethodParams.StarkDepositParams;
          response = {
            id,
            result: await this.deposit(
              depositParams.contractAddress,
              depositParams.starkPublicKey,
              depositParams.quantizedAmount,
              depositParams.token,
              depositParams.vaultId
            ),
          };
          break;
        case 'stark_depositCancel':
          const depositCancelParams = payload.params as MethodParams.StarkDepositCancelParams;
          response = {
            id,
            result: await this.depositCancel(
              depositCancelParams.contractAddress,
              depositCancelParams.starkPublicKey,
              depositCancelParams.token,
              depositCancelParams.vaultId
            ),
          };
          break;
        case 'stark_depositReclaim':
          const depositReclaimParams = payload.params as MethodParams.StarkDepositReclaimParams;
          response = {
            id,
            result: await this.depositReclaim(
              depositReclaimParams.contractAddress,
              depositReclaimParams.starkPublicKey,
              depositReclaimParams.token,
              depositReclaimParams.vaultId
            ),
          };
          break;
        case 'stark_transfer':
          const transferParams = payload.params as MethodParams.StarkTransferParams;
          response = {
            id,
            result: await this.transfer(
              transferParams.from,
              transferParams.to,
              transferParams.token,
              transferParams.quantizedAmount,
              transferParams.nonce,
              transferParams.expirationTimestamp
            ),
          };
          break;
        case 'stark_createOrder':
          const createOrderParams = payload.params as MethodParams.StarkCreateOrderParams;
          response = {
            id,
            result: await this.createOrder(
              createOrderParams.starkPublicKey,
              createOrderParams.sell,
              createOrderParams.buy,
              createOrderParams.nonce,
              createOrderParams.expirationTimestamp
            ),
          };
          break;
        case 'stark_withdrawal':
          const withdrawalParams = payload.params as MethodParams.StarkWithdrawalParams;
          response = {
            id,
            result: await this.withdrawal(
              withdrawalParams.contractAddress,
              withdrawalParams.starkPublicKey,
              withdrawalParams.token
            ),
          };
          break;
        case 'stark_fullWithdrawal':
          const fullWithdrawalParams = payload.params as MethodParams.StarkFullWithdrawalParams;
          response = {
            id,
            result: await this.fullWithdrawal(
              fullWithdrawalParams.contractAddress,
              fullWithdrawalParams.starkPublicKey,
              fullWithdrawalParams.vaultId
            ),
          };
          break;
        case 'stark_freeze':
          const freeezeParams = payload.params as MethodParams.StarkFreezeParams;
          response = {
            id,
            result: await this.freeze(
              freeezeParams.contractAddress,
              freeezeParams.starkPublicKey,
              freeezeParams.vaultId
            ),
          };
          break;
        case 'stark_verifyEscape':
          const verifyEscapeParams = payload.params as MethodParams.StarkVerifyEscapeParams;
          response = {
            id,
            result: await this.verifyEscape(
              verifyEscapeParams.contractAddress,
              verifyEscapeParams.starkPublicKey,
              verifyEscapeParams.proof
            ),
          };
          break;
        case 'stark_escape':
          const escapeParams = payload.params as MethodParams.StarkEscapeParams;
          response = {
            id,
            result: await this.escape(
              escapeParams.contractAddress,
              escapeParams.starkPublicKey,
              escapeParams.vaultId,
              escapeParams.token,
              escapeParams.quantizedAmount
            ),
          };
          break;
        default:
          throw new Error(`Unknown Starkware RPC Method: ${method}`);
      }
      return response;
    } catch (error) {
      return {
        id: payload.id,
        error: {
          message: error.message,
        },
      };
    }
  }

  // -- Private ------------------------------------------------------- //

  private async assertStarkPublicKey(starkPublicKey: string) {
    if ((await this.getStarkPublicKey()) !== starkPublicKey) {
      throw new Error('StarkPublicKey request does not match active key');
    }
  }

  private async getKeyPairFromPath(
    path?: string
  ): Promise<starkwareCrypto.KeyPair> {
    const accountMapping = await this.getAccountMapping();
    if (!path) {
      return this.getActiveKeyPair();
    }
    const match = accountMapping[path];
    if (match) {
      return starkwareCrypto.ec.keyFromPrivate(match);
    }
    const activeKeyPair = starkwareCrypto.getKeyPairFromPath(
      this.wallet.mnemonic.phrase,
      path
    );
    await this.setActiveKeyPair(path, activeKeyPair);
    return activeKeyPair;
  }

  private async setActiveKeyPair(
    path: string,
    activeKeyPair: starkwareCrypto.KeyPair
  ) {
    const accountMapping = await this.getAccountMapping();
    accountMapping[path] = activeKeyPair.getPrivate('hex');
    this.accountMapping = accountMapping;
    this.activeKeyPair = activeKeyPair;
    await this.store.set(this.accountMappingKey, accountMapping);
  }

  private getExchangeContract(contractAddress: string) {
    return new Contract(contractAddress, abi, this.wallet);
  }

  private async getAccountMapping(): Promise<StarkwareAccountMapping> {
    if (typeof this.accountMapping !== 'undefined') {
      return this.accountMapping;
    }

    const accountMapping: StarkwareAccountMapping =
      (await this.store.get(this.accountMappingKey)) || {};
    this.accountMapping = accountMapping;

    const paths = Object.keys(accountMapping);
    if (paths.length && !this.activeKeyPair) {
      this.activeKeyPair = starkwareCrypto.ec.keyFromPrivate(
        accountMapping[paths[0]]
      );
    }
    return accountMapping;
  }
}

export default StarkwareController;
