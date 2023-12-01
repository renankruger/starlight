/* eslint-disable prettier/prettier, camelcase, prefer-const, no-unused-vars */
import config from 'config';
import assert from 'assert';

import { WithdrawManager } from './withdraw.mjs';
import { TransferManager } from './transfer.mjs';
import { DepositManager } from './deposit.mjs';
import { ERC20Client } from './erc20.mjs';

import { startEventFilter } from './common/timber.mjs';
import logger from './common/logger.mjs';
import {
  getAllCommitments,
  getCommitmentsByState,
} from './common/commitment-storage.mjs';

/**
      NOTE: this is the api service file, if you need to call any function use the correct url and if Your input contract has two functions, add() and minus().
      minus() cannot be called before an initial add(). */

const sleep = ms => new Promise(r => setTimeout(r, ms));
let leafIndex;
let encryption = {};

export class ServiceManager {
  constructor(web3) {
    this.web3 = web3;
    this.erc20 = new ERC20Client(web3);
    this.depositMgr = new DepositManager(web3);
    this.transferMgr = new TransferManager(web3);
    this.withdrawMgr = new WithdrawManager(web3);
  }

  async init() {
    await this.erc20.init();
    await this.depositMgr.init();
    await this.transferMgr.init();
    await this.withdrawMgr.init();
  }

  async service_mint(req, res, next) {
    try {
      const { amount } = req.body;
      const { tx, event } = await this.erc20.mint(amount);
      res.send({ tx, event });
    } catch (err) {
      logger.error(err);
      res.send({ errors: [err.message] });
    }
  }

  async service_approve(req, res, next) {
    try {
      const { spender, amount } = req.body;
      const { tx, event } = await this.erc20.approve(spender, amount);
      res.send({ tx, event });
    } catch (err) {
      logger.error(err);
      res.send({ errors: [err.message] });
    }
  }

  async service_balanceOf(req, res, next) {
    try {
      const { account } = req.query;
      const { result } = await this.erc20.balanceOf(account);
      res.send({ result });
    } catch (err) {
      logger.error(err);
      res.send({ errors: [err.message] });
    }
  }

  async service_deposit(req, res, next) {
    try {
      await startEventFilter('EscrowShield');
      const { amount } = req.body;
      const balances_msgSender_newOwnerPublicKey =
        req.body.balances_msgSender_newOwnerPublicKey || 0;
      const { tx, event, encEvent } = await this.depositMgr.deposit(
        amount,
        balances_msgSender_newOwnerPublicKey,
      );
      res.send({ tx, event, encEvent });
      // reassigns leafIndex to the index of the first commitment added by this function
      if (event.event) {
        leafIndex = event.returnValues[0];
        // prints the new leaves (commitments) added by this function call
        console.log(`Merkle tree event returnValues: ${event.returnValues}`);
      }
      if (encEvent.event) {
        encryption.msgs = encEvent[0].returnValues[0];
        encryption.key = encEvent[0].returnValues[1];
        console.log(`EncryptedMsgs: ${encEvent[0].returnValues[0]}`);
      }
    } catch (err) {
      logger.error(err);
      res.send({ errors: [err.message] });
    }
  }

  async service_withdraw(req, res, next) {
    try {
      await startEventFilter('EscrowShield');
      const { amount } = req.body;
      const balances_msgSender_newOwnerPublicKey =
        req.body.balances_msgSender_newOwnerPublicKey || 0;
      const { tx, event, encEvent } = await this.withdrawMgr.withdraw(
        amount,
        balances_msgSender_newOwnerPublicKey,
      );
      res.send({ tx, event, encEvent });
      // reassigns leafIndex to the index of the first commitment added by this function
      if (event.event) {
        leafIndex = event.returnValues[0];
        // prints the new leaves (commitments) added by this function call
        console.log(`Merkle tree event returnValues: ${event.returnValues}`);
      }
      if (encEvent.event) {
        encryption.msgs = encEvent[0].returnValues[0];
        encryption.key = encEvent[0].returnValues[1];
        console.log('EncryptedMsgs:');
        console.log(encEvent[0].returnValues[0]);
      }
    } catch (err) {
      logger.error(err);
      res.send({ errors: [err.message] });
    }
  }

  async service_transfer(req, res, next) {
    try {
      await startEventFilter('EscrowShield');
      const { recipient } = req.body;
      const { amount } = req.body;
      const balances_msgSender_newOwnerPublicKey =
        req.body.balances_msgSender_newOwnerPublicKey || 0;
      const balances_recipient_newOwnerPublicKey =
        req.body.balances_recipient_newOwnerPublicKey || 0;
      const { tx, event, encEvent } = await this.transferMgr.transfer(
        recipient,
        amount,
        balances_msgSender_newOwnerPublicKey,
        balances_recipient_newOwnerPublicKey,
      );
      res.send({ tx, event, encEvent });
      // reassigns leafIndex to the index of the first commitment added by this function
      if (event.event) {
        leafIndex = event.returnValues[0];
        // prints the new leaves (commitments) added by this function call
        console.log(`Merkle tree event returnValues: ${event.returnValues}`);
      }
      if (encEvent.event) {
        encryption.msgs = encEvent[0].returnValues[0];
        encryption.key = encEvent[0].returnValues[1];
        console.log('EncryptedMsgs:');
        console.log(encEvent[0].returnValues[0]);
      }
    } catch (err) {
      logger.error(err);
      res.send({ errors: [err.message] });
    }
  }
}

// eslint-disable-next-line func-names

export async function service_allCommitments(req, res, next) {
  try {
    const { onlyNonNullified } = req.query;
    let getOnlyNonNullified = false;
    if (onlyNonNullified && onlyNonNullified.toLowercase() == 'true') {
      getOnlyNonNullified = true;
    }
    const commitments = await getAllCommitments(getOnlyNonNullified);
    res.send({ commitments });
  } catch (err) {
    logger.error(err);
    res.send({ errors: [err.message] });
  }
}

export async function service_getCommitmentsByState(req, res, next) {
  try {
    const { name, mappingKey } = req.body;
    const commitments = await getCommitmentsByState(name, mappingKey);
    res.send({ commitments });
  } catch (err) {
    logger.error(err);
    res.send({ errors: [err.message] });
  }
}
