import BN from 'bn.js';
import { Wallet, Contract } from 'ethers';
import * as starkwareCrypto from 'starkware-crypto';

import * as abi from './StarkExchangeABI.json';
import { Store, StarkwareAccountMapping, MethodResults } from './interfaces';
import { JsonRpcProvider } from 'ethers/providers';

const DEFAULT_ACCOUNT_MAPPING_KEY = 'STARKWARE_ACCOUNT_MAPPING';

interface Signature {
  r: BN;
  s: BN;
  recoveryParam: number | null;
}

export class StarkwareController {
  public accountMappingKey: string = DEFAULT_ACCOUNT_MAPPING_KEY;
  public accountMapping: StarkwareAccountMapping = {};
  public activeKeyPair: starkwareCrypto.KeyPair | undefined;

  constructor(private readonly wallet: Wallet, private store: Store) {}

  public async init(key?: string) {
    this.accountMappingKey = key || DEFAULT_ACCOUNT_MAPPING_KEY;
    this.accountMapping = (await this.store.get(this.accountMappingKey)) || {};
    const paths = Object.keys(this.accountMapping);
    if (paths.length && !this.activeKeyPair) {
      this.activeKeyPair = this.accountMapping[paths[0]];
    }
  }

  public async setProvider(provider: string | JsonRpcProvider) {
    this.wallet.connect(
      typeof provider === 'string' ? new JsonRpcProvider(provider) : provider
    );
  }

  public async account(
    path: string
  ): Promise<MethodResults.StarkAccountResult> {
    const starkPublicKey = this.getStarkPublicKey(path);
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
    this.assertStarkPublicKey(starkPublicKey);
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
    this.assertStarkPublicKey(starkPublicKey);
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
    this.assertStarkPublicKey(starkPublicKey);
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
    this.assertStarkPublicKey(from.starkPublicKey);
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
    const keyPair = this.getKeyPair();
    const signature = starkwareCrypto.sign(keyPair, msg);
    const starkSignature = this.formatSignature(signature);
    return { starkSignature };
  }

  public async createOrder(
    starkPublicKey: string,
    sell: starkwareCrypto.OrderParams,
    buy: starkwareCrypto.OrderParams,
    nonce: string,
    expirationTimestamp: string
  ): Promise<MethodResults.StarkCreateOrderResult> {
    this.assertStarkPublicKey(starkPublicKey);
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
    const keyPair = this.getKeyPair();
    const signature = starkwareCrypto.sign(keyPair, msg);
    const starkSignature = this.formatSignature(signature);
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
    this.assertStarkPublicKey(starkPublicKey);
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

  public getExchangeContract(contractAddress: string) {
    const provider = this.wallet.provider;
    return new Contract(contractAddress, abi, provider);
  }

  public formatSignature(signature: Signature) {
    return '0x' + signature.r.toString(16) + signature.s.toString(16);
  }

  public formatLabelPrefix(label: string, labelPrefix?: string) {
    return labelPrefix ? `${labelPrefix} ${label}` : `${label}`;
  }

  public formatTokenLabel(token: starkwareCrypto.Token, labelPrefix?: string) {
    const label = this.formatLabelPrefix('Asset', labelPrefix);
    if (token.type === 'ETH') {
      return [{ label, value: 'Ether' }];
    } else if (token.type === 'ERC20') {
      return [
        { label, value: 'ERC20 Token' },
        {
          label: this.formatLabelPrefix('Token Address', labelPrefix),
          value: (token.data as starkwareCrypto.ERC20TokenData).tokenAddress,
        },
      ];
    } else if (token.type === 'ERC721') {
      return [
        { label, value: 'ERC721 NFT' },
        {
          label: this.formatLabelPrefix('Token ID', labelPrefix),
          value: (token.data as starkwareCrypto.ERC721TokenData).tokenId,
        },
      ];
    } else {
      return [{ label, value: 'Unknown' }];
    }
  }

  public formatTokenAmount(
    quantizedAmount: string,
    token: starkwareCrypto.Token
  ) {
    let amount = quantizedAmount;
    const quantum =
      (token.data as
        | starkwareCrypto.ERC20TokenData
        | starkwareCrypto.ETHTokenData).quantum || '0';
    if (quantum) {
      amount = new BN(amount).div(new BN('10').pow(new BN(quantum))).toString();
    }
    return amount;
  }

  public formatTokenAmountLabel(
    quantizedAmount: string,
    token: starkwareCrypto.Token,
    labelPrefix?: string
  ) {
    return [
      ...this.formatTokenLabel(token),
      {
        label: this.formatLabelPrefix('Amount', labelPrefix),
        value: this.formatTokenAmount(quantizedAmount, token),
      },
    ];
  }

  public getKeyPair(path?: string): starkwareCrypto.KeyPair {
    if (!path) {
      return this.getActiveKeyPair();
    }
    const match = this.accountMapping[path];
    if (match) {
      return match;
    }
    const activeKeyPair = starkwareCrypto.getKeyPairFromPath(
      this.wallet.mnemonic,
      path
    );
    this.setActiveKeyPair(path, activeKeyPair);
    return activeKeyPair;
  }

  public getStarkPublicKey(path?: string): string {
    const keyPair = this.getKeyPair(path);
    const publicKey = starkwareCrypto.getPublic(keyPair);
    const starkPublicKey = starkwareCrypto.getStarkKey(publicKey);
    return starkPublicKey;
  }

  public assertStarkPublicKey(starkPublicKey: string) {
    if (this.getStarkPublicKey() !== starkPublicKey) {
      throw new Error('StarkPublicKey request does not match active key');
    }
  }

  public setActiveKeyPair(
    path: string,
    activeKeyPair: starkwareCrypto.KeyPair
  ) {
    this.activeKeyPair = this.accountMapping[path] = activeKeyPair;
    this.store.set(this.accountMappingKey, this.accountMapping[path]);
  }

  public getActiveKeyPair() {
    if (this.activeKeyPair) {
      return this.activeKeyPair;
    } else {
      throw new Error('No Active Starkware KeyPair - please provide a path');
    }
  }

  public async resolve(payload: any) {
    let response: { id: number; result: any };
    const { id, method, params } = payload;
    switch (method) {
      case 'stark_register':
        response = {
          id,
          result: await this.register(
            params.contractAddress,
            params.StarkPublicKey,
            params.operatorSignature
          ),
        };
        break;
      case 'stark_deposit':
        response = {
          id,
          result: await this.deposit(
            params.contractAddress,
            params.StarkPublicKey,
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
            params.StarkPublicKey,
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
            params.StarkPublicKey,
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
}

export default StarkwareController;
