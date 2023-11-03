/* eslint-disable prettier/prettier, camelcase, prefer-const, no-unused-vars */
import config from "config";
import utils from "zkp-utils";
import GN from "general-number";
import fs from "fs";

import {
	getContractInstance,
	getContractAddress,
	registerKey,
} from "./common/contract.mjs";
import {
	storeCommitment,
	getCurrentWholeCommitment,
	getCommitmentsById,
	getAllCommitments,
	getInputCommitments,
	joinCommitments,
	markNullified,
	getnullifierMembershipWitness,
	getupdatedNullifierPaths,
	temporaryUpdateNullifier,
	updateNullifierTree,
} from "./common/commitment-storage.mjs";
import { generateProof } from "./common/zokrates.mjs";
import { getMembershipWitness, getRoot } from "./common/timber.mjs";
import Web3 from "./common/web3.mjs";
import {
	decompressStarlightKey,
	poseidonHash,
} from "./common/number-theory.mjs";

const { generalise } = GN;
const db = "/app/orchestration/common/db/preimage.json";
const web3 = Web3.connection();
const keyDb = "/app/orchestration/common/db/key.json";

export default async function transfer(
	_recipient,
	_amount,
	_balances_msgSender_newOwnerPublicKey = 0,
	_balances_recipient_newOwnerPublicKey = 0,
	_balances_msgSender_0_oldCommitment = 0,
	_balances_msgSender_1_oldCommitment = 0
) {
	// Initialisation of variables:

	const instance = await getContractInstance("EscrowShield");

	const contractAddr = await getContractAddress("EscrowShield");

	const msgValue = 0;
	const recipient = generalise(_recipient);
	const amount = generalise(_amount);
	let balances_msgSender_newOwnerPublicKey = generalise(
		_balances_msgSender_newOwnerPublicKey
	);
	let balances_recipient_newOwnerPublicKey = generalise(
		_balances_recipient_newOwnerPublicKey
	);

	// Read dbs for keys and previous commitment values:

	if (!fs.existsSync(keyDb))
		await registerKey(utils.randomHex(31), "EscrowShield", false);
	const keys = JSON.parse(
		fs.readFileSync(keyDb, "utf-8", (err) => {
			console.log(err);
		})
	);
	const secretKey = generalise(keys.secretKey);
	const publicKey = generalise(keys.publicKey);

	// read preimage for decremented state

	balances_msgSender_newOwnerPublicKey =
		_balances_msgSender_newOwnerPublicKey === 0
			? publicKey
			: balances_msgSender_newOwnerPublicKey;

	let balances_msgSender_stateVarId = 6;

	const balances_msgSender_stateVarId_key = generalise(
		config.web3.options.defaultAccount
	); // emulates msg.sender

	balances_msgSender_stateVarId = generalise(
		utils.mimcHash(
			[
				generalise(balances_msgSender_stateVarId).bigInt,
				balances_msgSender_stateVarId_key.bigInt,
			],
			"ALT_BN_254"
		)
	).hex(32);

	let balances_msgSender_preimage = await getCommitmentsById(
		balances_msgSender_stateVarId
	);

	const balances_msgSender_newCommitmentValue = generalise(
		parseInt(amount.integer, 10)
	);
	// First check if required commitments exist or not

	let [
		balances_msgSender_commitmentFlag,
		balances_msgSender_0_oldCommitment,
		balances_msgSender_1_oldCommitment,
	] = getInputCommitments(
		publicKey.hex(32),
		balances_msgSender_newCommitmentValue.integer,
		balances_msgSender_preimage
	);

	let balances_msgSender_witness_0;

	let balances_msgSender_witness_1;

	while (balances_msgSender_commitmentFlag === false) {
		balances_msgSender_witness_0 = await getMembershipWitness(
			"EscrowShield",
			generalise(balances_msgSender_0_oldCommitment._id).integer
		);

		balances_msgSender_witness_1 = await getMembershipWitness(
			"EscrowShield",
			generalise(balances_msgSender_1_oldCommitment._id).integer
		);

		const tx = await joinCommitments(
			"EscrowShield",
			"balances",
			secretKey,
			publicKey,
			[6, balances_msgSender_stateVarId_key],
			[balances_msgSender_0_oldCommitment, balances_msgSender_1_oldCommitment],
			[balances_msgSender_witness_0, balances_msgSender_witness_1],
			instance,
			contractAddr,
			web3
		);

		balances_msgSender_preimage = await getCommitmentsById(
			balances_msgSender_stateVarId
		);

		[
			balances_msgSender_commitmentFlag,
			balances_msgSender_0_oldCommitment,
			balances_msgSender_1_oldCommitment,
		] = getInputCommitments(
			publicKey.hex(32),
			balances_msgSender_newCommitmentValue.integer,
			balances_msgSender_preimage
		);
	}
	const balances_msgSender_0_prevSalt = generalise(
		balances_msgSender_0_oldCommitment.preimage.salt
	);
	const balances_msgSender_1_prevSalt = generalise(
		balances_msgSender_1_oldCommitment.preimage.salt
	);
	const balances_msgSender_0_prev = generalise(
		balances_msgSender_0_oldCommitment.preimage.value
	);
	const balances_msgSender_1_prev = generalise(
		balances_msgSender_1_oldCommitment.preimage.value
	);

	// read preimage for incremented state
	balances_recipient_newOwnerPublicKey =
		_balances_recipient_newOwnerPublicKey === 0
			? publicKey
			: balances_recipient_newOwnerPublicKey;

	let balances_recipient_stateVarId = 6;

	const balances_recipient_stateVarId_key = recipient;

	balances_recipient_stateVarId = generalise(
		utils.mimcHash(
			[
				generalise(balances_recipient_stateVarId).bigInt,
				balances_recipient_stateVarId_key.bigInt,
			],
			"ALT_BN_254"
		)
	).hex(32);

	const balances_recipient_newCommitmentValue = generalise(
		parseInt(amount.integer, 10)
	);

	// Extract set membership witness:

	// generate witness for partitioned state
	balances_msgSender_witness_0 = await getMembershipWitness(
		"EscrowShield",
		generalise(balances_msgSender_0_oldCommitment._id).integer
	);
	balances_msgSender_witness_1 = await getMembershipWitness(
		"EscrowShield",
		generalise(balances_msgSender_1_oldCommitment._id).integer
	);
	const balances_msgSender_0_index = generalise(
		balances_msgSender_witness_0.index
	);
	const balances_msgSender_1_index = generalise(
		balances_msgSender_witness_1.index
	);
	const balances_msgSender_root = generalise(balances_msgSender_witness_0.root);
	const balances_msgSender_0_path = generalise(
		balances_msgSender_witness_0.path
	).all;
	const balances_msgSender_1_path = generalise(
		balances_msgSender_witness_1.path
	).all;

	// increment would go here but has been filtered out

	// increment would go here but has been filtered out

	// Calculate nullifier(s):

	let balances_msgSender_0_nullifier = poseidonHash([
		BigInt(balances_msgSender_stateVarId),
		BigInt(secretKey.hex(32)),
		BigInt(balances_msgSender_0_prevSalt.hex(32)),
	]);
	let balances_msgSender_1_nullifier = poseidonHash([
		BigInt(balances_msgSender_stateVarId),
		BigInt(secretKey.hex(32)),
		BigInt(balances_msgSender_1_prevSalt.hex(32)),
	]);
	balances_msgSender_0_nullifier = generalise(
		balances_msgSender_0_nullifier.hex(32)
	); // truncate
	balances_msgSender_1_nullifier = generalise(
		balances_msgSender_1_nullifier.hex(32)
	); // truncate
	// Non-membership witness for Nullifier
	const balances_msgSender_0_nullifier_NonMembership_witness = getnullifierMembershipWitness(
		balances_msgSender_0_nullifier
	);
	const balances_msgSender_1_nullifier_NonMembership_witness = getnullifierMembershipWitness(
		balances_msgSender_1_nullifier
	);

	const balances_msgSender_nullifierRoot = generalise(
		balances_msgSender_0_nullifier_NonMembership_witness.root
	);
	const balances_msgSender_0_nullifier_path = generalise(
		balances_msgSender_0_nullifier_NonMembership_witness.path
	).all;
	const balances_msgSender_1_nullifier_path = generalise(
		balances_msgSender_1_nullifier_NonMembership_witness.path
	).all;

	await temporaryUpdateNullifier(balances_msgSender_0_nullifier);
	await temporaryUpdateNullifier(balances_msgSender_1_nullifier);

	// Get the new updated nullifier Paths
	const balances_msgSender_0_updated_nullifier_NonMembership_witness = getupdatedNullifierPaths(
		balances_msgSender_0_nullifier
	);
	const balances_msgSender_1_updated_nullifier_NonMembership_witness = getupdatedNullifierPaths(
		balances_msgSender_1_nullifier
	);

	const balances_msgSender_newNullifierRoot = generalise(
		balances_msgSender_0_updated_nullifier_NonMembership_witness.root
	);
	const balances_msgSender_0_nullifier_updatedpath = generalise(
		balances_msgSender_0_updated_nullifier_NonMembership_witness.path
	).all;
	const balances_msgSender_1_nullifier_updatedpath = generalise(
		balances_msgSender_1_updated_nullifier_NonMembership_witness.path
	).all;

	// Calculate commitment(s):

	const balances_msgSender_2_newSalt = generalise(utils.randomHex(31));

	let balances_msgSender_change =
		parseInt(balances_msgSender_0_prev.integer, 10) +
		parseInt(balances_msgSender_1_prev.integer, 10) -
		parseInt(balances_msgSender_newCommitmentValue.integer, 10);

	balances_msgSender_change = generalise(balances_msgSender_change);

	let balances_msgSender_2_newCommitment = poseidonHash([
		BigInt(balances_msgSender_stateVarId),
		BigInt(balances_msgSender_change.hex(32)),
		BigInt(publicKey.hex(32)),
		BigInt(balances_msgSender_2_newSalt.hex(32)),
	]);

	balances_msgSender_2_newCommitment = generalise(
		balances_msgSender_2_newCommitment.hex(32)
	); // truncate

	const balances_recipient_newSalt = generalise(utils.randomHex(31));

	let balances_recipient_newCommitment = poseidonHash([
		BigInt(balances_recipient_stateVarId),
		BigInt(balances_recipient_newCommitmentValue.hex(32)),
		BigInt(balances_recipient_newOwnerPublicKey.hex(32)),
		BigInt(balances_recipient_newSalt.hex(32)),
	]);

	balances_recipient_newCommitment = generalise(
		balances_recipient_newCommitment.hex(32)
	); // truncate

	// Call Zokrates to generate the proof:

	const allInputs = [
		recipient.integer,
		amount.integer,
		balances_msgSender_stateVarId_key.integer,
		secretKey.integer,
		secretKey.integer,
		balances_msgSender_nullifierRoot.integer,
		balances_msgSender_newNullifierRoot.integer,
		balances_msgSender_0_nullifier.integer,
		balances_msgSender_0_nullifier_path.integer,
		balances_msgSender_0_nullifier_updatedpath.integer,
		balances_msgSender_1_nullifier.integer,
		balances_msgSender_1_nullifier_path.integer,
		balances_msgSender_1_nullifier_updatedpath.integer,
		balances_msgSender_0_prev.integer,
		balances_msgSender_0_prevSalt.integer,
		balances_msgSender_1_prev.integer,
		balances_msgSender_1_prevSalt.integer,
		balances_msgSender_root.integer,
		balances_msgSender_0_index.integer,
		balances_msgSender_0_path.integer,
		balances_msgSender_1_index.integer,
		balances_msgSender_1_path.integer,
		balances_msgSender_newOwnerPublicKey.integer,
		balances_msgSender_2_newSalt.integer,
		balances_msgSender_2_newCommitment.integer,

		balances_recipient_newSalt.integer,
		balances_recipient_newCommitment.integer,
		generalise(utils.randomHex(31)).integer,
		[
			decompressStarlightKey(balances_recipient_newOwnerPublicKey)[0].integer,
			decompressStarlightKey(balances_recipient_newOwnerPublicKey)[1].integer,
		],
	].flat(Infinity);
	const res = await generateProof("transfer", allInputs);
	const proof = generalise(Object.values(res.proof).flat(Infinity))
		.map((coeff) => coeff.integer)
		.flat(Infinity);
	const balances_recipient_cipherText = res.inputs
		.slice(-5, -2)
		.map((e) => generalise(e).integer);
	const balances_recipient_encKey = res.inputs
		.slice(-2)
		.map((e) => generalise(e).integer);

	// Send transaction to the blockchain:

	const txData = await instance.methods
		.transfer(
			balances_msgSender_nullifierRoot.integer,
			balances_msgSender_newNullifierRoot.integer,
			[
				balances_msgSender_0_nullifier.integer,
				balances_msgSender_1_nullifier.integer,
			],
			balances_msgSender_root.integer,
			[
				balances_msgSender_2_newCommitment.integer,
				balances_recipient_newCommitment.integer,
			],
			[balances_recipient_cipherText],
			[balances_recipient_encKey],
			proof
		)
		.encodeABI();

	let txParams = {
		from: config.web3.options.defaultAccount,
		to: contractAddr,
		gas: config.web3.options.defaultGas,
		gasPrice: config.web3.options.defaultGasPrice,
		data: txData,
		chainId: await web3.eth.net.getId(),
	};

	const key = config.web3.key;

	const signed = await web3.eth.accounts.signTransaction(txParams, key);

	const sendTxn = await web3.eth.sendSignedTransaction(signed.rawTransaction);

	let tx = await instance.getPastEvents("NewLeaves");

	tx = tx[0];

	if (!tx) {
		throw new Error(
			"Tx failed - the commitment was not accepted on-chain, or the contract is not deployed."
		);
	}

	let encEvent = "";

	try {
		encEvent = await instance.getPastEvents("EncryptedData");
	} catch (err) {
		console.log("No encrypted event");
	}

	// Write new commitment preimage to db:

	await markNullified(
		generalise(balances_msgSender_0_oldCommitment._id),
		secretKey.hex(32)
	);

	await markNullified(
		generalise(balances_msgSender_1_oldCommitment._id),
		secretKey.hex(32)
	);

	await storeCommitment({
		hash: balances_msgSender_2_newCommitment,
		name: "balances",
		mappingKey: balances_msgSender_stateVarId_key.integer,
		preimage: {
			stateVarId: generalise(balances_msgSender_stateVarId),
			value: balances_msgSender_change,
			salt: balances_msgSender_2_newSalt,
			publicKey: balances_msgSender_newOwnerPublicKey,
		},
		secretKey:
			balances_msgSender_newOwnerPublicKey.integer === publicKey.integer
				? secretKey
				: null,
		isNullified: false,
	});

	await storeCommitment({
		hash: balances_recipient_newCommitment,
		name: "balances",
		mappingKey: balances_recipient_stateVarId_key.integer,
		preimage: {
			stateVarId: generalise(balances_recipient_stateVarId),
			value: balances_recipient_newCommitmentValue,
			salt: balances_recipient_newSalt,
			publicKey: balances_recipient_newOwnerPublicKey,
		},
		secretKey:
			balances_recipient_newOwnerPublicKey.integer === publicKey.integer
				? secretKey
				: null,
		isNullified: false,
	});

	return { tx, encEvent };
}
