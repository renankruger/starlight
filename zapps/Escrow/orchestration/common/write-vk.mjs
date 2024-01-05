/**
Module to set up zkp elements of compiler output, along with writing the vks to the db folder. To be run from inside the zokrates container.
*/

import fs from 'fs';
import yargs from 'yargs';
import { join } from 'path';
import { URL } from 'url';

const __filename = new URL('', import.meta.url).pathname;
const __dirname = new URL('.', import.meta.url).pathname;

// const { generalise } = GN;
const { argv } = yargs.usage('Usage: $0 -i <input file>').demandOption(['i']);
const functionNames = ['deposit', 'transfer', 'withdraw', 'joinCommitments'];

const readFile = filePath => {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  console.log('Unable to locate file: ', filePath);
  return null;
};

export const writeFile = (filePath, data) => {
  // this will overwrite any existing file:
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
  } catch (err) {
    throw new Error(err);
  }
};

export const writeVK = async functionName => {
  if (!functionName) {
    functionNames.forEach(name => {
      const sourcePath = join(__dirname, `output/${name}/${name}_vk.key`); // won't change
      const destinationPath = join(__dirname, `orchestration/common/db/${name}_vk.key`); // TODO - change to output of compiler
      if (!fs.existsSync(join(__dirname, `orchestration/common/db/`)))
        fs.mkdirSync(join(__dirname, `orchestration/common/db/`), { recursive: true });
      const vk = JSON.parse(readFile(sourcePath));
      writeFile(destinationPath, vk);
    });
  } else {
    const sourcePath = join(
      __dirname,
      `output/${name}/${name}_vk.key`,
    ); // won't change
    const destinationPath = join(__dirname, `orchestration/common/db/${functionName}_vk.key`); // TODO - change to output of compiler
    if (!fs.existsSync(join(__dirname, `orchestration/common/db/`)))
      fs.mkdirSync(join(__dirname, `orchestration/common/db/`), { recursive: true });
    const vk = JSON.parse(readFile(sourcePath));
    writeFile(destinationPath, vk);
  }
};

writeVK(argv.i);
