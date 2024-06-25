// 551CKB as the basic occupied capacity of the TickCell
export const TICK_CELL_CAPACITY = BigInt(55100000000)
export const XUDT_CELL_CAPACITY = BigInt(14400000000)

export type NetworkParams = typeof MAINNET

export const MAINNET = {
  genesisHash: '0x92b197aa1fba0f63633922c61c92375c9c074a93e85963554f5499fe1450d0e5',
  xudtCellType: {
    typeId: '0x092c2c4a26ea475a8e860c29cf00502103add677705e2ccd8d6fe5af3caa5ae3',
    typeScript: {
      codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
      hashType: 'type',
      args: '0x74f8fd146cca83d5fa2acd8a2b0bc7f0408a38b79a173c1e8ca1fbdfc95122ff',
    },
  },
  tickCellType: {
    typeId: '0xbe7801c3a4b276d7e72cd478eece9f29374720d131e03e5f04b6a88804257122',
    typeScript: {
      codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
      hashType: 'type',
      args: '0xb49a9cc0ae3c67be18558545989c28e2bbdeccf2ff6a83ae427eac2fec1dd1af',
    },
  },
  configCellType: {
    typeId: '0x470452746a7abdb1f1723c5bd10d8b5bcda0dc4f00881cb9c6d8cf84b697d475',
  },
  governanceMemberCellType: {
    typeId: '0x2e01a6db6d332607e2b604cb58104678bd7bb3a2d5093418cdc53be976c8a18b',
  },
  alwaysSuccessAddress: 'ckb1qqcratfhhe0whl8n2pyyw9248r9kyw3x7gmkp80jf0ffvagvzgc8sqgdzm4fw',
  custodiansOmniLockAddress: 'ckb1qzdcr9un5ezx8tkh03s46m9jymh22jruelq8svzr5krj2nx69dhjvqgxvm0a2jw0q85l0mf687m7ksdkyj5cejaxqqpthcud',
  tokenId: {
    'BTC': '0x68e64ba4b0daeeec45c1f983d6d574fca370442cafb805bc4265ef74870a4ac8'
  },
  cellDeps: [
    // joy-id
    {
      outPoint: {
        txHash: '0xf05188e5f3a6767fc4687faf45ba5f1a6e25d3ada6129dae8722cb282f262493',
        index: '0x0'
      },
      depType: 'depGroup'
    },
    // secp256k1_blake160_sighash_all
    {
      outPoint: {
        txHash: '0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c',
        index: '0x0'
      },
      depType: 'depGroup'
    },
  ]
}

export const TESTNET: NetworkParams = {
  genesisHash: '0x10639e0895502b5688a6be8cf69460d76541bfa4821629d86d62ba0aae3f9606',
  xudtCellType: {
    typeId: '0x98701eaf939113606a8a70013fd2e8f27b8f1e234acdc329f3d71f9e9d3d3233',
    typeScript: {
      codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
      hashType: 'type',
      args: '0x1166c8ebeebe6c53ce52370420b23802a93897823ee54194ab5226da546459c5',
    },
  },
  tickCellType: {
    typeId: '0xd5506e22660561635b54fa2887a469d230d1b8d29d53be8fecdbb8215477465c',
    typeScript: {
      codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
      hashType: 'type',
      args: '0x0bee22ad4ab54e9eef40d6d6c1839d274668e5372237db4eea2d8e1521f5c4ec',
    },
  },
  configCellType: {
    typeId: '0x1fa21d5beb92fdf044f27f6310564be88f59e32557abf44d0db30bc239e14ff3',
  },
  governanceMemberCellType: {
    typeId: '0x2022bdd02de3fc45e8776d2f0416cd887935c01c981a9e496fc74c00f7062f97',
  },
  alwaysSuccessAddress: 'ckt1qzqmth635x0qaytkuujgmdrrc67zlgd0c57u2727gyp6xdnskzlj7qgh6rt3u',
  custodiansOmniLockAddress: 'ckt1qpa0qahsffdrsxtuu97tc2u2wzwaeel3dc7fjjm3vurvtggrggqquqgx2a48py5vhs2ew4g9tsr988r9mvtz8xn8qq388fz6',
  tokenId: {
    'BTC': '0x5f1c45bd6d5c7f78ac29e9559a62dc3751a516ff2d276460845c82d08378a310'
  },
  cellDeps: [
    // joy-id
    {
      outPoint: {
        txHash: '0x4dcf3f3b09efac8995d6cbee87c5345e812d310094651e0c3d9a730f32dc9263',
        index: '0x0'
      },
      depType: 'depGroup'
    },
    // sighash_all_group
    {
      outPoint: {
        txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
        index: '0x0'
      },
      depType: 'depGroup'
    },
  ]
}

export const CONTEXT = {
  fee: BigInt(0),
  merchantPrivateKey: '',
  merchantAddress: '',
  verbose: false,
  rpcUrl: 'http://127.0.0.1:8114',
  network: '',
  networkParams: MAINNET,
};
