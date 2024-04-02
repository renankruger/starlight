import fs from 'fs';
import config from 'config';
import GN from 'general-number';
import utils from 'zkp-utils';
import Web3 from './web3.mjs';
import logger from './logger.mjs';
import { join } from 'path';
import { URL } from 'url';

const __filename = new URL('', import.meta.url).pathname;
const __dirname = new URL('.', import.meta.url).pathname;

import {
  scalarMult,
  compressStarlightKey,
  poseidonHash,
} from './number-theory.mjs';

const web3 = Web3.connection();
const { generalise } = GN;
const keyDb = './db/key.json';

const { options } = config.web3;

export async function getContractAddress(contractName) {
  const contract = config.contracts[contractName];
  if (!contract) {
    throw new Error(`Contract ${contractName} not found in config`);
  }
  return contract.address;
}

export async function getContractInstance(contractName, deployedAddress) {
  const contract = config.contracts[contractName];
  if (!contract) {
    throw new Error(`Contract ${contractName} not found in config`);
  }
  const abi = contract.abi;
  if (!deployedAddress) {
    // eslint-disable-next-line no-param-reassign
    deployedAddress = await getContractAddress(contractName);
  }

  const contractInstance = new web3.eth.Contract(abi, deployedAddress, options);
  logger.info(`${contractName} Address: ${deployedAddress}`);

  return contractInstance;
}

export async function deploy(
  userAddress,
  userAddressPassword,
  contractName,
  constructorParams,
) {
  logger.info(`\nUnlocking account ${userAddress}...`);
  await web3.eth.personal.unlockAccount(userAddress, userAddressPassword, 1);

  const contractInstance = await getContractInstance(contractName); // get a web3 contract instance of the contract
  const bytecode = await getContractBytecode(contractName);

  const deployedContractAddress = await contractInstance
    .deploy({ data: `0x${bytecode}`, arguments: constructorParams })
    .send({
      from: userAddress,
      gas: config.web3.options.defaultGas,
    })
    .on('error', err => {
      throw new Error(err);
    })
    .then(deployedContractInstance => {
      // logger.silly('deployed contract instance:', deployedContractInstance);
      logger.info(
        `${contractName} contract deployed at address ${deployedContractInstance.options.address}`,
      ); // instance with the new contract address

      return deployedContractInstance.options.address;
    });
  return deployedContractAddress;
}

export async function registerKey(
  web3,
  _secretKey,
  contractName,
  registerWithContract,
) {
  let secretKey = generalise(_secretKey);
  let publicKeyPoint = generalise(
    scalarMult(secretKey.hex(32), config.BABYJUBJUB.GENERATOR),
  );
  let publicKey = compressStarlightKey(publicKeyPoint);
  while (publicKey === null) {
    logger.warn(`your secret key created a large public key - resetting`);
    secretKey = generalise(utils.randomHex(31));
    publicKeyPoint = generalise(
      scalarMult(secretKey.hex(32), config.BABYJUBJUB.GENERATOR),
    );
    publicKey = compressStarlightKey(publicKeyPoint);
  }
  if (registerWithContract) {
    const instance = await getContractInstance(contractName);
    const contractAddr = await getContractAddress(contractName);
    const txData = await instance.methods
      .registerZKPPublicKey(publicKey.integer)
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
    console.log("registerKey - sendTxn:", sendTxn);
    
  }
  const keyJson = {
    secretKey: secretKey.integer,
    publicKey: publicKey.integer, // not req
  };
  fs.writeFileSync(join(__dirname, keyDb), JSON.stringify(keyJson, null, 4));

  return publicKey;
}

const contractPath = contractName => {
  return join(__dirname, `../../build/contracts/${contractName}.json`);
};

async function getContractInterface(contractName) {
  const path = contractPath(contractName);
  const contractInterface = JSON.parse(fs.readFileSync(path, 'utf8'));
  // logger.debug('\ncontractInterface:', contractInterface);
  return contractInterface;
}

async function getContractBytecode(contractName) {
  const contractInterface = await getContractInterface(contractName);
  return contractInterface.evm.bytecode.object;
}
