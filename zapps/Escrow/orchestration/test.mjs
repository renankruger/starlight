/* eslint-disable prettier/prettier, camelcase, prefer-const, no-unused-vars */
import config from "config";
import assert from "assert";

import withdraw from "./withdraw.mjs";

import transfer from "./transfer.mjs";

import deposit from "./deposit.mjs";

import { startEventFilter, getSiblingPath } from "./common/timber.mjs";
import fs from "fs";
import GN from "general-number";
import { getAllCommitments } from "./common/commitment-storage.mjs";
import logger from "./common/logger.mjs";
import { decrypt } from "./common/number-theory.mjs";
import web3 from "./common/web3.mjs";

/**
      Welcome to your zApp's integration test!
      Depending on how your functions interact and the range of inputs they expect, the below may need to be changed.
      e.g. Your input contract has two functions, add() and minus(). minus() cannot be called before an initial add() - the compiler won't know this! You'll need to rearrange the below.
      e.g. The function add() only takes numbers greater than 100. The compiler won't know this, so you'll need to change the call to add() below.
      The transpiler automatically fills in any ZKP inputs for you and provides some dummy values for the original zol function.
      NOTE: if any non-secret functions need to be called first, the transpiler won't know! You'll need to add those calls below.
      NOTE: if you'd like to keep track of your commitments, check out ./common/db/preimage. Remember to delete this file if you'd like to start fresh with a newly deployed contract.
      */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { generalise } = GN;
let leafIndex;
let encryption = {};
// eslint-disable-next-line func-names
describe("EscrowShield", async function () {
	this.timeout(3660000);
	try {
		await web3.connect();
	} catch (err) {
		throw new Error(err);
	}
	// eslint-disable-next-line func-names
	describe("deposit", async function () {
		this.timeout(3660000);
		try {
			await web3.connect();
		} catch (err) {
			throw new Error(err);
		}
		// eslint-disable-next-line func-names
		describe("First call", async function () {
			this.timeout(3660000);
			it("should call deposit", async () => {
				try {
					// this starts up the merkle tree's event filter
					await startEventFilter("EscrowShield");
					// this calls your function! It returns the tx from the shield contract
					// you can replace the values below - numbers are randomly generated
					const { tx, encEvent } = await deposit(119);
					// prints the tx
					console.log(tx);
					// reassigns leafIndex to the index of the first commitment added by this function
					if (tx.event) {
						leafIndex = tx.returnValues[0];
						// prints the new leaves (commitments) added by this function call
						console.log(`Merkle tree event returnValues:`);
						console.log(tx.returnValues[0]);
					}
					if (encEvent[0].event) {
						encryption.msgs = encEvent[0].returnValues[0];
						encryption.key = encEvent[0].returnValues[1];
						console.log("EncryptedMsgs:");
						console.log(encEvent[0].returnValues[0]);
					}
					await sleep(10);
				} catch (err) {
					logger.error(err);
					process.exit(1);
				}
			});
			it("should update the merkle tree", async () => {
				try {
					// this is the path from your new commitment to the root of the tree - it's needed to show the commitment exists when you want to edit your secret state
					const path = await getSiblingPath("EscrowShield", leafIndex);
					console.log("Queried sibling path:");
					console.table(path, ["value", "nodeIndex"]);
				} catch (err) {
					logger.error(err);
					process.exit(1);
				}
			});
		});
		// eslint-disable-next-line func-names
		describe("Second Call", async function () {
			this.timeout(3660000);
			it("should call deposit again", async () => {
				try {
					// this calls your function a second time for incremental cases
					const { tx } = await deposit(96);
					if (tx.event) {
						console.log(`Merkle tree event returnValues:`);
						console.log(tx.returnValues[0]);
					}
				} catch (err) {
					logger.error(err);
					process.exit(1);
				}
			});
		});
	});

	// eslint-disable-next-line func-names
	describe("transfer", async function () {
		this.timeout(3660000);
		try {
			await web3.connect();
		} catch (err) {
			throw new Error(err);
		}
		// eslint-disable-next-line func-names
		describe("First call", async function () {
			this.timeout(3660000);
			it("should call transfer", async () => {
				try {
					// this starts up the merkle tree's event filter
					await startEventFilter("EscrowShield");
					// this calls your function! It returns the tx from the shield contract
					// you can replace the values below - numbers are randomly generated
					const { tx, encEvent } = await transfer(
						config.web3.options.defaultAccount,
						162
					);
					// prints the tx
					console.log(tx);
					// reassigns leafIndex to the index of the first commitment added by this function
					if (tx.event) {
						leafIndex = tx.returnValues[0];
						// prints the new leaves (commitments) added by this function call
						console.log(`Merkle tree event returnValues:`);
						console.log(tx.returnValues[0]);
					}
					if (encEvent[0].event) {
						encryption.msgs = encEvent[0].returnValues[0];
						encryption.key = encEvent[0].returnValues[1];
						console.log("EncryptedMsgs:");
						console.log(encEvent[0].returnValues[0]);
					}
					await sleep(10);
				} catch (err) {
					logger.error(err);
					process.exit(1);
				}
			});

			it("should recieve and decrypt messages", async () => {
				try {
					const { secretKey } = JSON.parse(
						fs.readFileSync(
							"/app/orchestration/common/db/key.json",
							"utf-8",
							(err) => {
								console.log(err);
							}
						)
					);
					const plainText = decrypt(encryption.msgs, secretKey, encryption.key);
					console.log("Decrypted plainText:");
					console.log(plainText);
					const salt = plainText[plainText.length - 1];
					const commitmentSet = await getAllCommitments();
					const thisCommit = commitmentSet.find(
						(c) =>
							generalise(c.preimage.salt).integer === generalise(salt).integer
					);
					assert.equal(!!thisCommit, true);
				} catch (err) {
					logger.error(err);
					process.exit(1);
				}
			});

			it("should update the merkle tree", async () => {
				try {
					// this is the path from your new commitment to the root of the tree - it's needed to show the commitment exists when you want to edit your secret state
					const path = await getSiblingPath("EscrowShield", leafIndex);
					console.log("Queried sibling path:");
					console.table(path, ["value", "nodeIndex"]);
				} catch (err) {
					logger.error(err);
					process.exit(1);
				}
			});
		});
		// eslint-disable-next-line func-names
	});
	// eslint-disable-next-line func-names
	describe("withdraw", async function () {
		this.timeout(3660000);
		try {
			await web3.connect();
		} catch (err) {
			throw new Error(err);
		}
		// eslint-disable-next-line func-names
		describe("First call", async function () {
			this.timeout(3660000);
			it("should call withdraw", async () => {
				try {
					// this starts up the merkle tree's event filter
					await startEventFilter("EscrowShield");
					// this calls your function! It returns the tx from the shield contract
					// you can replace the values below - numbers are randomly generated
					const { tx, encEvent } = await withdraw(179);
					// prints the tx
					console.log(tx);
					// reassigns leafIndex to the index of the first commitment added by this function
					if (tx.event) {
						leafIndex = tx.returnValues[0];
						// prints the new leaves (commitments) added by this function call
						console.log(`Merkle tree event returnValues:`);
						console.log(tx.returnValues[0]);
					}
					if (encEvent[0].event) {
						encryption.msgs = encEvent[0].returnValues[0];
						encryption.key = encEvent[0].returnValues[1];
						console.log("EncryptedMsgs:");
						console.log(encEvent[0].returnValues[0]);
					}
					await sleep(10);
				} catch (err) {
					logger.error(err);
					process.exit(1);
				}
			});
			it("should update the merkle tree", async () => {
				try {
					// this is the path from your new commitment to the root of the tree - it's needed to show the commitment exists when you want to edit your secret state
					const path = await getSiblingPath("EscrowShield", leafIndex);
					console.log("Queried sibling path:");
					console.table(path, ["value", "nodeIndex"]);
				} catch (err) {
					logger.error(err);
					process.exit(1);
				}
			});
		});
		// eslint-disable-next-line func-names
	});
});
