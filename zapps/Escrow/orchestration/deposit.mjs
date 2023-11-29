/* eslint-disable prettier/prettier, camelcase, prefer-const, no-unused-vars */
import config from 'config';
import utils from 'zkp-utils';
import GN from 'general-number';
import fs from 'fs';
import { join } from 'path';
import { URL } from 'url';

import {
  getContractInstance,
  getContractAddress,
  registerKey,
} from './common/contract.mjs';
import { storeCommitment } from './common/commitment-storage.mjs';
import { generateProof } from './common/zokrates.mjs';
import { poseidonHash } from './common/number-theory.mjs';

const { generalise } = GN;
const __dirname = new URL('.', import.meta.url).pathname;
const keyDb = join(__dirname, 'common/db/key.json');

export class DepositManager {
  constructor(web3) {
    this.web3 = web3;
  }

  async init() {
    this.instance = await getContractInstance('EscrowShield');
    this.contractAddr = await getContractAddress('EscrowShield');
  }

  async deposit(_amount, _balances_msgSender_newOwnerPublicKey = 0) {
    const amount = generalise(_amount);
    let balances_msgSender_newOwnerPublicKey = generalise(
      _balances_msgSender_newOwnerPublicKey,
    );

    // Read dbs for keys and previous commitment values:
    if (!fs.existsSync(keyDb)) {
      await registerKey(this.web3, utils.randomHex(31), 'EscrowShield', false);
    }

    const keys = JSON.parse(
      fs.readFileSync(keyDb, 'utf-8', err => {
        console.log(err);
      }),
    );
    const secretKey = generalise(keys.secretKey);
    const publicKey = generalise(keys.publicKey);

    // read preimage for incremented state
    balances_msgSender_newOwnerPublicKey =
      _balances_msgSender_newOwnerPublicKey === 0
        ? publicKey
        : balances_msgSender_newOwnerPublicKey;

    let balances_msgSender_stateVarId = 6;

    const balances_msgSender_stateVarId_key = generalise(
      config.web3.options.defaultAccount,
    ); // emulates msg.sender

    balances_msgSender_stateVarId = generalise(
      utils.mimcHash(
        [
          generalise(balances_msgSender_stateVarId).bigInt,
          balances_msgSender_stateVarId_key.bigInt,
        ],
        'ALT_BN_254',
      ),
    ).hex(32);

    const balances_msgSender_newCommitmentValue = generalise(
      parseInt(amount.integer, 10),
    );

    // non-secret line would go here but has been filtered out

    // increment would go here but has been filtered out

    // Calculate commitment(s):

    const balances_msgSender_newSalt = generalise(utils.randomHex(31));

    let balances_msgSender_newCommitment = poseidonHash([
      BigInt(balances_msgSender_stateVarId),
      BigInt(balances_msgSender_newCommitmentValue.hex(32)),
      BigInt(balances_msgSender_newOwnerPublicKey.hex(32)),
      BigInt(balances_msgSender_newSalt.hex(32)),
    ]);

    balances_msgSender_newCommitment = generalise(
      balances_msgSender_newCommitment.hex(32),
    ); // truncate

    // Call Zokrates to generate the proof:

    const allInputs = [
      amount.integer,
      balances_msgSender_stateVarId_key.integer,
      balances_msgSender_newOwnerPublicKey.integer,
      balances_msgSender_newSalt.integer,
      balances_msgSender_newCommitment.integer,
    ].flat(Infinity);
    const res = await generateProof('deposit', allInputs);
    const proof = generalise(Object.values(res.proof).flat(Infinity))
      .map(coeff => coeff.integer)
      .flat(Infinity);

    // Send transaction to the blockchain:

    const txData = await this.instance.methods
      .deposit(
        amount.integer,
        [balances_msgSender_newCommitment.integer],
        proof,
      )
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

    let event = await this.instance.getPastEvents('NewLeaves');
    event = event[0];
    if (!event) {
      throw new Error(
        'Tx failed - the commitment was not accepted on-chain, or the contract is not deployed.',
      );
    }

    let encEvent = '';

    try {
      encEvent = await this.instance.getPastEvents('EncryptedData');
    } catch (err) {
      console.log('No encrypted event');
    }

    // Write new commitment preimage to db:
    await storeCommitment({
      hash: balances_msgSender_newCommitment,
      name: 'balances',
      mappingKey: balances_msgSender_stateVarId_key.integer,
      preimage: {
        stateVarId: generalise(balances_msgSender_stateVarId),
        value: balances_msgSender_newCommitmentValue,
        salt: balances_msgSender_newSalt,
        publicKey: balances_msgSender_newOwnerPublicKey,
      },
      secretKey:
        balances_msgSender_newOwnerPublicKey.integer === publicKey.integer
          ? secretKey
          : null,
      isNullified: false,
    });

    return { tx, event, encEvent };
  }
}
