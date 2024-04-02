import { join } from 'path';
import fs from 'fs';
import utils from 'zkp-utils';
import config from 'config';
import { generalise } from 'general-number';
import { getContractInstance, registerKey } from './common/contract.mjs';
import { storeCommitment } from './common/commitment-storage.mjs';
import { decrypt, poseidonHash } from './common/number-theory.mjs';

const __dirname = new URL('.', import.meta.url).pathname;
const keyDb = join(__dirname, 'common/db/key.json');

export class EncryptedDataEventListener {
  constructor(web3) {
    this.web3 = web3;
  }

  async init() {
    this.instance = await getContractInstance('EscrowShield');

    // Read dbs for keys and previous commitment values:
    console.log('+++++++ EncryptedDataEventListener - init - checking ZKP key pair existence at:', keyDb);
    if (!fs.existsSync(keyDb)) {
      console.log('+++++++ EncryptedDataEventListener - Registering key');
      await registerKey(this.web3, utils.randomHex(31), 'EscrowShield', true);
    }

    const { secretKey, publicKey } = JSON.parse(
      fs.readFileSync(keyDb),
    );

    this.secretKey = generalise(secretKey);
    this.publicKey = generalise(publicKey);
    console.log(`EncryptedDataEventListener - init - Secret Key: ${secretKey} \n Public Key: ${publicKey}`);

    let stateVarId = 6;
    this.ethAddress = generalise(config.web3.options.defaultAccount);
    stateVarId = generalise(
      utils.mimcHash(
        [generalise(stateVarId).bigInt, this.ethAddress.bigInt],
        'ALT_BN_254',
      ),
    );
    this.ethAddressHash = stateVarId;
    console.log(`EncryptedDataEventListener - init - Eth Address Hash: ${this.ethAddressHash.hex(32)}`);
  }

  async start() {
    await this.init();

    const eventName = 'EncryptedData';
    const eventJsonInterface = this.instance._jsonInterface.find(
      o => o.name === eventName && o.type === 'event',
    );

    console.log(
      `eventJsonInterface: ${JSON.stringify(eventJsonInterface, null, 2)}`,
    );

    const eventSubscription = await this.instance.events[eventName]({
      fromBlock: 1,
      topics: [eventJsonInterface.signature],
    });

    const self = this;
    eventSubscription
      .on('connected', function (subscriptionId) {
        console.log(`New subscription: ${subscriptionId}`);
      })
      .on('data', async eventData => {
        console.log(`New ${eventName} event detected`);
        console.log(`Event Data: ${JSON.stringify(eventData, null, 2)}`);

        const cipherText = eventData.returnValues.cipherText;
        const ephPublicKey = eventData.returnValues.ephPublicKey;
        console.log(`EncryptedDataEventListener - event onData - Cipher Text: ${cipherText} - self.secretKey.integer: ${self.secretKey.integer} - ephemeral public key: ${ephPublicKey}`);
        const decrypted = decrypt(
          cipherText,
          self.secretKey.integer,
          ephPublicKey,
        );

        const ownerPublicKey = generalise(decrypted[0]);
        if (ownerPublicKey.integer === self.ethAddressHash.integer) {
          const value = generalise(decrypted[1]);
          const salt = generalise(decrypted[2]);
          console.log(
            'The event is for a state owned by us, adding a commitment based on the decrypted value and salt', value, salt);

          let balances_msgSender_newCommitment = poseidonHash([
            BigInt(self.ethAddressHash.hex(32)),
            BigInt(value.hex(32)),
            BigInt(self.publicKey.hex(32)),
            BigInt(salt.hex(32)),
          ]);
          balances_msgSender_newCommitment = generalise(
            balances_msgSender_newCommitment.hex(32),
          );

          try {
            await storeCommitment({
              hash: balances_msgSender_newCommitment,
              name: 'balances',
              mappingKey: self.ethAddress.integer,
              preimage: {
                stateVarId: self.ethAddressHash,
                value,
                salt,
                publicKey: self.publicKey,
              },
              secretKey: self.secretKey,
              isNullified: false,
            });
            console.log(
              'Added commitment',
              balances_msgSender_newCommitment.hex(32),
            );
          } catch (e) {
            if (e.toString().includes('E11000 duplicate key')) {
              console.log('Commitment already exists');
            }
          }
        }
      });
  }
}
