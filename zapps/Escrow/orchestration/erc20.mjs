/* eslint-disable prettier/prettier, camelcase, prefer-const, no-unused-vars */
import config from 'config';
import { generalise } from 'general-number';

import { getContractInstance, getContractAddress } from './common/contract.mjs';

export class ERC20Client {
  constructor(web3) {
    this.web3 = web3;
  }

  async init() {
    this.instance = await getContractInstance('ERC20');
    this.contractAddr = await getContractAddress('ERC20');
  }

  async mint(_amount) {
    const amount = generalise(_amount);

    // Send transaction to the blockchain:
    const txData = await this.instance.methods
      .mint(config.web3.options.defaultAccount, amount.integer)
      .encodeABI();

    let txParams = {
      from: config.web3.adminAccount,
      to: this.contractAddr,
      gas: config.web3.options.defaultGas,
      gasPrice: config.web3.options.defaultGasPrice,
      data: txData,
      chainId: await this.web3.eth.net.getId(),
    };

    const key = config.web3.adminKey;
    const signed = await this.web3.eth.accounts.signTransaction(txParams, key);

    const tx = await this.web3.eth.sendSignedTransaction(signed.rawTransaction);

    let event = await this.instance.getPastEvents('Transfer');
    event = event[0];
    if (!event) {
      throw new Error(
        'Tx failed - the mint was not accepted on-chain, or the contract is not deployed.',
      );
    }

    return { tx, event };
  }

  async approve(spender, _amount) {
    const amount = generalise(_amount);

    // Send transaction to the blockchain:
    const txData = await this.instance.methods
      .approve(spender, amount.integer)
      .encodeABI();

    let txParams = {
      from: config.web3.options.defaultAccount,
      to: this.contractAddr,
      gas: config.web3.options.defaultGas,
      gasPrice: config.web3.options.defaultGasPrice,
      data: txData,
      chainId: await this.web3.eth.net.getId(),
    };

    const key = config.web3.key;
    const signed = await this.web3.eth.accounts.signTransaction(txParams, key);

    const tx = await this.web3.eth.sendSignedTransaction(signed.rawTransaction);

    let event = await this.instance.getPastEvents('Approval');
    event = event[0];
    if (!event) {
      throw new Error(
        'Tx failed - the approve was not accepted on-chain, or the contract is not deployed.',
      );
    }

    return { tx, event };
  }

  async balanceOf(account) {
    const result = await this.instance.methods.balanceOf(account).call();
    return { result };
  }
}
