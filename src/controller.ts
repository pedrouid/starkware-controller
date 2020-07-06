import BN from 'bn.js';
import { Wallet, Contract, providers } from 'ethers';
import * as starkwareCrypto from 'starkware-crypto';

import * as abi from './StarkExchangeABI.json';
import { Store, StarkwareAccountMapping, MethodResults } from './interfaces';

const DEFAULT_ACCOUNT_MAPPING_KEY = 'STARKWARE_ACCOUNT_MAPPING';

interface Signature {
  r: BN;
  s: BN;
  recoveryParam: number | null;
}

function serializeSignature(signature: Signature): string {
  return '0x' + signature.r.toString(16) + signature.s.toString(16);
}

// -- StarkwareController --------------------------------------------- //

export class StarkwareController {
  private accountMapping: StarkwareAccountMapping | undefined;
  private activeKeyPair: starkwareCrypto.KeyPair | undefined;

  constructor(
    private readonly wallet: Wallet,
    private store: Store,
    public accountMappingKey: string = DEFAULT_ACCOUNT_MAPPING_KEY
  ) {}

  // -- Get / Set ----------------------------------------------------- //

  public setProvider(provider: string | providers.JsonRpcProvider): void {
    this.wallet.connect(
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
    const starkSignature = serializeSignature(signature);
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
    const starkSignature = serializeSignature(signature);
    return { starkSignature };
  }

  public async withdrawal(
    contractAddress: string,
    token: starkwareCrypto.Token
  ): Promise<MethodResults.StarkWithdrawalResult> {
    const exchangeContract = this.getExchangeContract(contractAddress);
    const tokenId = starkwareCrypto.hashTokenId(token);
    const { hash: txhash } = await exchangeContract.withdraw(tokenId);
    return { txhash };
  }

  public async fullWithdrawal(
    contractAddress: string,
    vaultId: string
  ): Promise<MethodResults.StarkFullWithdrawalResult> {
    const exchangeContract = this.getExchangeContract(contractAddress);
    const { hash: txhash } = await exchangeContract.fullWithdrawalRequest(
      vaultId
    );
    return { txhash };
  }

  public async freeze(
    contractAddress: string,
    vaultId: string
  ): Promise<MethodResults.StarkFreezeResult> {
    const exchangeContract = this.getExchangeContract(contractAddress);
    const { hash: txhash } = await exchangeContract.freezeRequest(vaultId);
    return { txhash };
  }

  public async verifyEscape(
    contractAddress: string,
    proof: string[]
  ): Promise<MethodResults.StarkVerifyEscapeResult> {
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
    const { id, method, params } = payload;
    switch (method) {
      case 'stark_account':
        response = {
          id,
          result: await this.account(
            params.layer,
            params.application,
            params.index
          ),
        };
        break;
      case 'stark_register':
        response = {
          id,
          result: await this.register(
            params.contractAddress,
            params.starkPublicKey,
            params.operatorSignature
          ),
        };
        break;
      case 'stark_deposit':
        response = {
          id,
          result: await this.deposit(
            params.contractAddress,
            params.starkPublicKey,
            params.quantizedAmount,
            params.token,
            params.vaultId
          ),
        };
        break;
      case 'stark_depositCancel':
        response = {
          id,
          result: await this.depositCancel(
            params.contractAddress,
            params.starkPublicKey,
            params.token,
            params.vaultId
          ),
        };
        break;
      case 'stark_depositReclaim':
        response = {
          id,
          result: await this.depositReclaim(
            params.contractAddress,
            params.starkPublicKey,
            params.token,
            params.vaultId
          ),
        };
        break;
      case 'stark_transfer':
        response = {
          id,
          result: await this.transfer(
            params.from,
            params.to,
            params.token,
            params.quantizedAmount,
            params.nonce,
            params.expirationTimestamp
          ),
        };
        break;
      case 'stark_createOrder':
        response = {
          id,
          result: await this.createOrder(
            params.starkPublicKey,
            params.sell,
            params.buy,
            params.nonce,
            params.expirationTimestamp
          ),
        };
        break;
      case 'stark_withdrawal':
        response = {
          id,
          result: await this.withdrawal(params.contractAddress, params.token),
        };
        break;
      case 'stark_fullWithdrawal':
        response = {
          id,
          result: await this.fullWithdrawal(
            params.contractAddress,
            params.vaultId
          ),
        };
        break;
      case 'stark_freeze':
        response = {
          id,
          result: await this.freeze(params.contractAddress, params.vaultId),
        };
        break;
      case 'stark_verifyEscape':
        response = {
          id,
          result: await this.verifyEscape(params.contractAddress, params.proof),
        };
        break;
      case 'stark_escape':
        response = {
          id,
          result: await this.escape(
            params.contractAddress,
            params.starkPublicKey,
            params.vaultId,
            params.token,
            params.quantizedAmount
          ),
        };
        break;
      default:
        throw new Error(`Unknown Starkware RPC Method: ${method}`);
    }
    return response;
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
      return match;
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
    accountMapping[path] = activeKeyPair;
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
      this.activeKeyPair = accountMapping[paths[0]];
    }
    return accountMapping;
  }
}

export default StarkwareController;
