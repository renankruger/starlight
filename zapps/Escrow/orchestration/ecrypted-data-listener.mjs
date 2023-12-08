import { getContractInstance, getContractAddress } from './common/contract.mjs';

export class EncryptedDataEventListener {
  constructor(web3) {
    this.web3 = web3;
  }

  async init() {
    this.instance = await getContractInstance('EscrowShield');
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

    /* eventData example
      {
        returnValues: {
            myIndexedParam: 20,
            myOtherIndexedParam: '0x123456789...',
            myNonIndexParam: 'My String'
        },
        raw: {
            data: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
            topics: ['0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7', '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385']
        },
        event: 'MyEvent',
        signature: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
        logIndex: 0,
        transactionIndex: 0,
        transactionHash: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
        blockHash: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
        blockNumber: 1234,
        address: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'
      }
    */
    eventSubscription
      .on('connected', function (subscriptionId) {
        console.log(`New subscription: ${subscriptionId}`);
      })
      .on('data', eventData => {
        console.log(`New ${eventName} event detected`);
        console.log(`Event Data: ${JSON.stringify(eventData, null, 2)}`);

        const eventObject = {
          eventData,
          eventJsonInterface,
        };

        // let's add the eventObject to the list of events:
        // events = addNewEvent(eventObject, events);

        // responder(eventObject, responseFunction, responseFunctionArgs);
      });
  }
}
