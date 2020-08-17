import { Wallet, Contract, providers, PopulatedTransaction } from 'ethers';

import abi from './abi';
import * as starkwareCrypto from './crypto';
import { Store, StarkwareAccountMapping } from './types';

const DEFAULT_ACCOUNT_MAPPING_KEY = 'STARKWARE_ACCOUNT_MAPPING';

function getJsonRpcProvider(
  provider: string | providers.Provider
): providers.Provider {
  return typeof provider === 'string'
    ? new providers.JsonRpcProvider(provider)
    : provider;
}

const ETH_STANDARD_PATH = "m/44'/60'/0'/0";

function getPath(index = 0) {
  return `${ETH_STANDARD_PATH}/${index}`;
}

// -- StarkwareController --------------------------------------------- //

export class StarkwareController {
  private accountMapping: StarkwareAccountMapping | undefined;
  private activeKeyPair: starkwareCrypto.KeyPair | undefined;

  public provider: providers.Provider;
  public walletIndex: number = 0;

  constructor(
    private mnemonic: string,
    provider: string | providers.Provider,
    private store: Store,
    private accountMappingKey: string = DEFAULT_ACCOUNT_MAPPING_KEY
  ) {
    this.provider = getJsonRpcProvider(provider);
  }

  // -- Get / Set ----------------------------------------------------- //

  get starkPublicKey(): string | undefined {
    if (!this.activeKeyPair) return undefined;
    return starkwareCrypto.getStarkPublicKey(this.activeKeyPair);
  }

  public setProvider(provider: string | providers.Provider): void {
    this.provider = getJsonRpcProvider(provider);
  }

  public setWalletIndex(walletIndex: number): void {
    this.walletIndex = walletIndex;
  }

  public async getStarkPublicKey(path?: string): Promise<string> {
    const keyPair = await this.getKeyPairFromPath(path);
    const starkPublicKey = starkwareCrypto.getStarkPublicKey(keyPair);
    return starkPublicKey;
  }

  public async getActiveKeyPair(): Promise<starkwareCrypto.KeyPair> {
    await this.getAccountMapping();
    if (this.activeKeyPair) {
      return this.activeKeyPair;
    } else {
      throw new Error('No Active Starkware KeyPair - please provide a path');
    }
  }

  public getEthereumAddress(): string {
    return Wallet.fromMnemonic(this.mnemonic, getPath(this.walletIndex))
      .address;
  }

  // -- JSON-RPC ----------------------------------------------------- //

  public async account(
    layer: string,
    application: string,
    index: string
  ): Promise<string> {
    const path = starkwareCrypto.getAccountPath(
      layer,
      application,
      this.getEthereumAddress(),
      index
    );
    const starkPublicKey = await this.getStarkPublicKey(path);
    return starkPublicKey;
  }

  public async register(
    contractAddress: string,
    starkPublicKey: string,
    operatorSignature: string
  ): Promise<PopulatedTransaction> {
    const exchangeContract = this.getExchangeContract(contractAddress);
    const unsignedTx = await exchangeContract.populateTransaction.register(
      starkPublicKey,
      operatorSignature
    );
    return unsignedTx;
  }

  public async deposit(
    contractAddress: string,
    starkPublicKey: string,
    quantizedAmount: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<PopulatedTransaction> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const unsignedTx = await exchangeContract.populateTransaction.deposit(
      tokenId,
      vaultId,
      quantizedAmount
    );
    return unsignedTx;
  }

  public async depositCancel(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<PopulatedTransaction> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const unsignedTx = await exchangeContract.populateTransaction.depositCancel(
      tokenId,
      vaultId
    );
    return unsignedTx;
  }

  public async depositReclaim(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token,
    vaultId: string
  ): Promise<PopulatedTransaction> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const unsignedTx = await exchangeContract.populateTransaction.depositReclaim(
      tokenId,
      vaultId
    );
    return unsignedTx;
  }

  public async transfer(
    from: starkwareCrypto.TransferParams,
    to: starkwareCrypto.TransferParams,
    token: starkwareCrypto.Token,
    quantizedAmount: string,
    nonce: string,
    expirationTimestamp: string
  ): Promise<string> {
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
    return starkSignature;
  }

  public async createOrder(
    starkPublicKey: string,
    sell: starkwareCrypto.OrderParams,
    buy: starkwareCrypto.OrderParams,
    nonce: string,
    expirationTimestamp: string
  ): Promise<string> {
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
    return starkSignature;
  }

  public async withdrawal(
    contractAddress: string,
    starkPublicKey: string,
    token: starkwareCrypto.Token
  ): Promise<PopulatedTransaction> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const unsignedTx = await exchangeContract.populateTransaction.withdraw(
      tokenId
    );
    return unsignedTx;
  }

  public async fullWithdrawal(
    contractAddress: string,
    starkPublicKey: string,
    vaultId: string
  ): Promise<PopulatedTransaction> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const unsignedTx = await exchangeContract.populateTransaction.fullWithdrawalRequest(
      vaultId
    );
    return unsignedTx;
  }

  public async freeze(
    contractAddress: string,
    starkPublicKey: string,
    vaultId: string
  ): Promise<PopulatedTransaction> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const unsignedTx = await exchangeContract.populateTransaction.freezeRequest(
      vaultId
    );
    return unsignedTx;
  }

  public async verifyEscape(
    contractAddress: string,
    starkPublicKey: string,
    proof: string[]
  ): Promise<PopulatedTransaction> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const unsignedTx = await exchangeContract.populateTransaction.verifyEscape(
      proof
    );
    return unsignedTx;
  }

  public async escape(
    contractAddress: string,
    starkPublicKey: string,
    vaultId: string,
    token: starkwareCrypto.Token,
    quantizedAmount: string
  ): Promise<PopulatedTransaction> {
    await this.assertStarkPublicKey(starkPublicKey);
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const unsignedTx = await exchangeContract.populateTransaction.escape(
      starkPublicKey,
      vaultId,
      tokenId,
      quantizedAmount
    );
    return unsignedTx;
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
      this.mnemonic,
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
    return new Contract(contractAddress, abi, this.provider);
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
