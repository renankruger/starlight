const fs = require("fs");
const { join } = require('path');

const Pairing = artifacts.require("Pairing");
const Verifier = artifacts.require("Verifier");
const ERC20 = artifacts.require("ERC20");

const EscrowShield = artifacts.require("EscrowShield");
const functionNames = ["deposit", "transfer", "withdraw", "joinCommitments"];
const vkInput = [];
let vk = [];
functionNames.forEach((name) => {
	const vkJson = JSON.parse(
		fs.readFileSync(join(__dirname, `../orchestration/common/db/${name}_vk.key`), "utf-8")
	);
	if (vkJson.scheme) {
		vk = Object.values(vkJson).slice(2).flat(Infinity);
	} else {
		vk = Object.values(vkJson).flat(Infinity);
	}
	vkInput.push(vk);
});

module.exports = (deployer) => {
	deployer.then(async () => {
		await deployer.deploy(Pairing);
		await deployer.link(Pairing, Verifier);
		await deployer.deploy(Verifier);
		await deployer.deploy(ERC20, "MyCoin", "MC");

		await deployer.deploy(
			EscrowShield,
			ERC20.address,
			Verifier.address,
			vkInput
		);
	});
};
