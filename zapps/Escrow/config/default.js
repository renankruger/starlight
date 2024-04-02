module.exports = {
  log_level: 'info',
  zokrates: {
    url: process.env.ZOKRATES_URL || 'http://localhost:3002',
  },
  merkleTree: {
    url: process.env.TIMBER_URL || 'http://localhost:3001',
  },

  BN128_GROUP_ORDER: BigInt(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617',
  ),
  BN128_PRIME_FIELD: BigInt(
    '21888242871839275222246405745257275088696311157297823662689037894645226208583',
  ),
  // the various parameters needed to describe the Babyjubjub curve
  // BABYJUBJUB
  // Montgomery EC form is y^2 = x^3 + Ax^2 + Bx
  // Montgomery EC form of BabyJubJub is y^2 = x^3 + 168698x^2 + x
  // A = 168698 and B = 1
  BABYJUBJUB: {
    JUBJUBA: BigInt(168700),
    JUBJUBD: BigInt(168696),
    INFINITY: [BigInt(0), BigInt(1)],
    GENERATOR: [
      BigInt(
        '16540640123574156134436876038791482806971768689494387082833631921987005038935',
      ),
      BigInt(
        '20819045374670962167435360035096875258406992893633759881276124905556507972311',
      ),
    ],
    JUBJUBE: BigInt(
      '21888242871839275222246405745257275088614511777268538073601725287587578984328',
    ),
    JUBJUBC: BigInt(8),
    MONTA: BigInt(168698),
    MONTB: BigInt(1),
  },

  contracts: {
    EscrowShield: {
      address: process.env.ESCROW_SHIELD_ADDRESS,
      abi: require('../build/contracts/EscrowShield.json').abi,
    },
    ERC20: {
      address: process.env.ERC20_ADDRESS,
      abi: require('../build/contracts/ERC20.json').abi,
    },
  },
  MONGO_URL: process.env.MONGO_URL || 'mongodb://admin:admin@localhost:27017',
  COMMITMENTS_DB: process.env.MONGO_NAME,
  COMMITMENTS_COLLECTION: 'commitments',
  // web3:
  // web3:
  web3: {
    rpcUrl: process.env.RPC_URL,
    key: process.env.KEY,
    adminAccount:
      process.env.ADMIN_ACCOUNT || '0x2D95B0c51e6F480882a6267F921301Dcd09FdB20',
    adminKey:
      process.env.ADMIN_KEY ||
      '0x36527be988e7999372b4c0e4480461fbcd106f48884db51f89daedaff09fe233',

    options: {
      defaultAccount: process.env.DEFAULT_ACCOUNT,
      defaultGas: 5221975,
      defaultGasPrice: 0,
    },
  },
};
