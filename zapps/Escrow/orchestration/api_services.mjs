/* eslint-disable prettier/prettier, camelcase, prefer-const, no-unused-vars */
import config from "config";
import assert from "assert";

import withdraw from "./withdraw.mjs";

import transfer from "./transfer.mjs";

import deposit from "./deposit.mjs";

import { startEventFilter, getSiblingPath } from "./common/timber.mjs";
import fs from "fs";
import logger from "./common/logger.mjs";
import { decrypt } from "./common/number-theory.mjs";
import {
	getAllCommitments,
	getCommitmentsByState,
} from "./common/commitment-storage.mjs";
import web3 from "./common/web3.mjs";

/**
      NOTE: this is the api service file, if you need to call any function use the correct url and if Your input contract has two functions, add() and minus().
      minus() cannot be called before an initial add(). */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let leafIndex;
let encryption = {};
// eslint-disable-next-line func-names

export async function EscrowShield() {
	try {
		await web3.connect();
	} catch (err) {
		throw new Error(err);
	}
}
// eslint-disable-next-line func-names
export async function service_deposit(req, res, next) {
	try {
		await web3.connect();
		await new Promise((resolve) => setTimeout(() => resolve(), 3000));
	} catch (err) {
		throw new Error(err);
	}
	try {
		await startEventFilter("EscrowShield");
		const { amount } = req.body;
		const balances_msgSender_newOwnerPublicKey =
			req.body.balances_msgSender_newOwnerPublicKey || 0;
		const { tx, encEvent } = await deposit(
			amount,
			balances_msgSender_newOwnerPublicKey
		);
		// prints the tx
		console.log(tx);
		res.send({ tx, encEvent });
		// reassigns leafIndex to the index of the first commitment added by this function
		if (tx.event) {
			leafIndex = tx.returnValues[0];
			// prints the new leaves (commitments) added by this function call
			console.log(`Merkle tree event returnValues:`);
			console.log(tx.returnValues);
		}
		if (encEvent.event) {
			encryption.msgs = encEvent[0].returnValues[0];
			encryption.key = encEvent[0].returnValues[1];
			console.log("EncryptedMsgs:");
			console.log(encEvent[0].returnValues[0]);
		}
		await sleep(10);
	} catch (err) {
		logger.error(err);
		res.send({ errors: [err.message] });
	}
}

// eslint-disable-next-line func-names
export async function service_transfer(req, res, next) {
	try {
		await web3.connect();
		await new Promise((resolve) => setTimeout(() => resolve(), 3000));
	} catch (err) {
		throw new Error(err);
	}
	try {
		await startEventFilter("EscrowShield");
		const { recipient } = req.body;
		const { amount } = req.body;
		const balances_msgSender_newOwnerPublicKey =
			req.body.balances_msgSender_newOwnerPublicKey || 0;
		const balances_recipient_newOwnerPublicKey =
			req.body.balances_recipient_newOwnerPublicKey || 0;
		const { tx, encEvent } = await transfer(
			recipient,
			amount,
			balances_msgSender_newOwnerPublicKey,
			balances_recipient_newOwnerPublicKey
		);
		// prints the tx
		console.log(tx);
		res.send({ tx, encEvent });
		// reassigns leafIndex to the index of the first commitment added by this function
		if (tx.event) {
			leafIndex = tx.returnValues[0];
			// prints the new leaves (commitments) added by this function call
			console.log(`Merkle tree event returnValues:`);
			console.log(tx.returnValues);
		}
		if (encEvent.event) {
			encryption.msgs = encEvent[0].returnValues[0];
			encryption.key = encEvent[0].returnValues[1];
			console.log("EncryptedMsgs:");
			console.log(encEvent[0].returnValues[0]);
		}
		await sleep(10);
	} catch (err) {
		logger.error(err);
		res.send({ errors: [err.message] });
	}
}

// eslint-disable-next-line func-names
export async function service_withdraw(req, res, next) {
	try {
		await web3.connect();
		await new Promise((resolve) => setTimeout(() => resolve(), 3000));
	} catch (err) {
		throw new Error(err);
	}
	try {
		await startEventFilter("EscrowShield");
		const { amount } = req.body;
		const balances_msgSender_newOwnerPublicKey =
			req.body.balances_msgSender_newOwnerPublicKey || 0;
		const { tx, encEvent } = await withdraw(
			amount,
			balances_msgSender_newOwnerPublicKey
		);
		// prints the tx
		console.log(tx);
		res.send({ tx, encEvent });
		// reassigns leafIndex to the index of the first commitment added by this function
		if (tx.event) {
			leafIndex = tx.returnValues[0];
			// prints the new leaves (commitments) added by this function call
			console.log(`Merkle tree event returnValues:`);
			console.log(tx.returnValues);
		}
		if (encEvent.event) {
			encryption.msgs = encEvent[0].returnValues[0];
			encryption.key = encEvent[0].returnValues[1];
			console.log("EncryptedMsgs:");
			console.log(encEvent[0].returnValues[0]);
		}
		await sleep(10);
	} catch (err) {
		logger.error(err);
		res.send({ errors: [err.message] });
	}
}

export async function service_allCommitments(req, res, next) {
	try {
		const commitments = await getAllCommitments();
		res.send({ commitments });
		await sleep(10);
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
		await sleep(10);
	} catch (err) {
		logger.error(err);
		res.send({ errors: [err.message] });
	}
}
