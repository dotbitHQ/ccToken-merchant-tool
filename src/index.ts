import { addressToScript } from '@nervosnetwork/ckb-sdk-utils'
import { default as CKB } from '@nervosnetwork/ckb-sdk-core'
import paramsFormatter from '@nervosnetwork/ckb-sdk-rpc/lib/paramsFormatter'
import resultFormatter from '@nervosnetwork/ckb-sdk-rpc/lib/resultFormatter'
import { program } from 'commander'
import 'dotenv/config'
import axios from 'axios'

import * as types from './schemas/cell.js';

program
  .option('-p, --private-key <privateKey>', 'Merchant private key. Please use environment variable MERCHANT_PRIVATE_KEY instead in production environment.')
  .option('-a, --merchant-address <address>', 'Merchant address')
  .option('-u, --rpc-url <url>', 'The base url of CKB RPC.')
  .option('-c, --coin-type [type]', 'The coin type defined by Cactus Custody.', 'BTC')
  .option('-t, --tx-hash <hash>', 'The hash of the BTC transaction')
  .option('-f, --fee <fee>', 'The fee of the transaction', '10000')
  .option('-v, --value <value>', 'The value of the ccBTC to mint')
  .option('-V, --verbose', 'Show verbose debug messages', false)

program.parse()

const options = program.opts()

let merchantPrivateKey: string
if (options.privateKey) {
  merchantPrivateKey = options.privateKey
} else if (process.env.MERCHANT_PRIVATE_KEY) {
  merchantPrivateKey = process.env.MERCHANT_PRIVATE_KEY
} else {
  console.error('Merchant private key is required.')
  process.exit(1)
}

let rpcUrl: string
if (process.env.CKB_RPC_URL && !options.rpcUrl) {
  rpcUrl = process.env.CKB_RPC_URL
} else if (options.rpcUrl) {
  rpcUrl = options.rpcUrl
} else {
  // The rpcUrl has a default value, so this branch should never be reached.
  throw new Error('Unreachable code.')
}

if (!options.merchantAddress) {
  console.error('Merchant address is required.')
  process.exit(1)
} else {
  try {
    addressToScript(options.merchantAddress)
  } catch (e: any) {
    console.error('Invalid merchant address:', options.merchantAddress)
    process.exit(1)
  }
}

if (!options.coinType) {
  console.error('Coin type is required.')
  process.exit(1)
}

if (!options.txHash) {
  console.error('The hash of the BTC transaction is required.')
  process.exit(1)
}

if (!options.value || isNaN(Number(options.value))) {
  console.error('The value of the ccBTC to mint is required.')
  process.exit(1)
}


const inputs: any = [
  // Any cell that have more than 551CKB capacity
  {
    lock: {
      codeHash:
        "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      hashType: "type",
      args: "0xa1b136c2cd411b757e5911c554e4c7612f69d00a",
    },
    outPoint: {
      txHash:
        "0x5a89e6d23184431ecfba83a78a6e18bcebbca67980e328f8a1c9d1c1e0617103",
      index: "0x2",
    },
    capacity: "0x10ed41ab45",
    data: "0x",
  },
];

type NetworkParams = typeof MAINNET

const MAINNET = {
  genesisHash: '0x92b197aa1fba0f63633922c61c92375c9c074a93e85963554f5499fe1450d0e5',
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
  tokenId: '0x68e64ba4b0daeeec45c1f983d6d574fca370442cafb805bc4265ef74870a4ac8',
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

const TESTNET: NetworkParams = {
  genesisHash: '0x10639e0895502b5688a6be8cf69460d76541bfa4821629d86d62ba0aae3f9606',
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
  tokenId: '0x3b6224e621410370887db7e3d95f63d9c760d7f56ee864521403c99e8b4f34b8',
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

// 551CKB as the basic occupied capacity of the TickCell
const tickCellCapacity = BigInt(55100000000)
const transactionFee = BigInt(options.fee)

;(async () => {
  const [_network, networkParams] = await selectCurrentNetwork()
  const tickCellTypeOutPoint = await findTypeScriptOutPoint(networkParams.tickCellType.typeScript)
  const configCellOutPoint = await findConfigCell(networkParams.configCellType.typeId)
  const governanceMemberCellTypeOutPoint = await findGovernanceMemberCell(networkParams.governanceMemberCellType.typeId)
  const inputs: any[] = await findMerchantNormalCells(options.merchantAddress, tickCellCapacity + transactionFee)

  if (options.verbose) {
    console.log('Out point of tick-cell-type:', tickCellTypeOutPoint)
    console.log('Out point of ConfigCell:', configCellOutPoint)
    console.log('Out point of GovernanceMemberCell:', governanceMemberCellTypeOutPoint)
  }

  let ckb = new CKB(rpcUrl)
  let cellDeps = [
    ...networkParams.cellDeps,
    {
      outPoint: tickCellTypeOutPoint,
      depType: 'code'
    },
    {
      outPoint: configCellOutPoint,
      depType: 'code'
    },
    {
      outPoint: governanceMemberCellTypeOutPoint,
      depType: 'code'
    }
  ]

  if (options.verbose) {
    console.log('➡️ Raw cell_deps:\n', JSON.stringify(cellDeps, null, 2))
  }

  if (options.verbose) {
    console.log('➡️ Raw inputs:', inputs)
  }

  // Create basic transaction
  const rawTx = ckb.generateRawTransaction({
    fromAddress: options.merchantAddress,
    toAddress: networkParams.alwaysSuccessAddress,
    capacity: tickCellCapacity,
    fee: transactionFee,
    safeMode: false,
    cells: inputs,
    deps: cellDeps as any[],
    changeThreshold: BigInt(0),
  })

  rawTx.outputs[0] = toTickCell(rawTx.outputs[0], networkParams.tickCellType.typeId)
  rawTx.outputsData[0] = genTickCellData(options.merchantAddress, networkParams.tokenId, options.coinType, options.txHash, BigInt(options.value))

  // 0x00726571756573745f6d696e74 represents [prefix, request_mint] in binary format,
  // which is a key symbol to represent the intention of the transaction.
  // It is a constant value that will remain unchanged.
  rawTx.witnesses.push('0x00726571756573745f6d696e74')

  // console.log(JSON.stringify(rawTx, null, 2))

  const signedTx = ckb.signTransaction(merchantPrivateKey)(rawTx)

  const rpc_format_tx = paramsFormatter.toRawTransaction(signedTx)

  if (options.verbose) {
    console.log('')
    console.log(JSON.stringify(rpc_format_tx, null, 2))
  }

  try {
    const txHash = await ckb.rpc.sendTransaction(signedTx)
    console.log(txHash)
  } catch (e: any) {
    try {
      let msg = JSON.parse(e.message)
      if (msg.code == -302) {
        if (msg.message.includes('.Lock')) {
          console.error('Transaction rejected by CKB node. It is most likely due to the signature is invalid, please refer to original message:', msg.message)
        } else {
          console.error('Transaction rejected by CKB node. It is due to some contract validation failsure, please refer to original message:', msg.message)
        }
      } else {
        console.error('Transaction rejected by CKB node. It is due to some unpredict failsure, please refer to original message', msg)
      }
    } catch (_) {
      console.error('Failed to send transaction with unkown error:', e.message)
    }
    process.exit(1)
  }
})();

async function selectCurrentNetwork(): Promise<['mainnet' | 'testnet', NetworkParams]>{
  let network: 'testnet' | 'mainnet' = 'mainnet'
  let networkParams: NetworkParams

  try {
    let resp = await axios.post(rpcUrl, {
      "id": 1,
      "jsonrpc": "2.0",
      "method": "get_consensus",
      "params": []
    })
    let body = resp.data.result

    if (body.genesis_hash === MAINNET.genesisHash) {
      network = 'mainnet'
      networkParams = MAINNET
    } else if (body.genesis_hash === TESTNET.genesisHash) {
      network = 'testnet'
      networkParams = TESTNET
    } else {
      console.error('Unknown network.')
      process.exit(1)
    }

    if (options.verbose) {
      console.log('🌏 Genesis hash:', body.genesis_hash)
      console.log('🌏 Current network:', network)
    }
  } catch (e: any) {
    console.error('Failed to connect to CKB RPC server:', e.message)
    process.exit(1)
  }

  return [network, networkParams]
}

async function findTypeScriptOutPoint(typeScript: any) {
  try {
    let resp = await axios.post(rpcUrl, {
        "id": 1,
        "jsonrpc": "2.0",
        "method": "get_cells",
        "params": [
            {
                "script": paramsFormatter.toScript(typeScript),
                "script_type": "type"
            },
            "desc",
            "0x1"
        ]
    })

    let body = resp.data.result
    return resultFormatter.toOutPoint(body.objects[0].out_point)
  } catch (e: any) {
    console.error('Failed to get cells:', e.message)
    process.exit(1)
  }
}

async function findConfigCell(typeId: string) {
  try {
    let resp = await axios.post(rpcUrl, {
        "id": 1,
        "jsonrpc": "2.0",
        "method": "get_cells",
        "params": [
            {
                "script": {
                  code_hash: typeId,
                  hash_type: 'type',
                  args: '0x'
                },
                "script_type": "type"
            },
            "desc",
            "0x1"
        ]
    })

    let body = resp.data.result
    return resultFormatter.toOutPoint(body.objects[0].out_point)
  } catch (e: any) {
    console.error('Failed to get cells:', e.message)
    process.exit(1)
  }
}

async function findGovernanceMemberCell(typeId: string) {
  try {
    let resp = await axios.post(rpcUrl, {
        "id": 1,
        "jsonrpc": "2.0",
        "method": "get_cells",
        "params": [
            {
                "script": {
                  code_hash: typeId,
                  hash_type: 'type',
                  args: '0x01'
                },
                "script_type": "type"
            },
            "asc",
            "0x1"
        ]
    })

    let body = resp.data.result

    return resultFormatter.toOutPoint(body.objects[0].out_point)
  } catch (e: any) {
    console.error('Failed to get cells:', e.message)
    process.exit(1)
  }
}

async function findMerchantNormalCells(merchantAddress: string, requiredValue: bigint) {
  try {
    let lock = addressToScript(merchantAddress)
    let resp = await axios.post(rpcUrl, {
        "id": 1,
        "jsonrpc": "2.0",
        "method": "get_cells",
        "params": [
            {
              "script": paramsFormatter.toScript(lock),
              "script_type": "lock",
              "filter": {
                "script_len_range": ['0x0', '0x1'],
                "output_data_len_range": ['0x0', '0x1']
              }
            },
            "desc",
            "0x14"
        ]
    })

    let body = resp.data.result
    let totalValue = BigInt(0)
    let inputs = []
    for (let cell of body.objects) {
      totalValue += BigInt(cell.output.capacity)

      inputs.push({
        capacity: cell.output.capacity,
        lock: resultFormatter.toScript(cell.output.lock),
        outPoint: resultFormatter.toOutPoint(cell.out_point),
        data: cell.output_data,
      })

      if (totalValue >= requiredValue) {
        break
      }
    }

    return inputs
  } catch (e: any) {
    console.error('Failed to get cells:', e.message)
    process.exit(1)
  }
}

function toTickCell(cell: any, tickCellTypeId: string) {
  // The TickCell's capacity, lock and type are always the same value.
  cell.type = {
    codeHash: tickCellTypeId,
    hashType: 'type',
    args: '0x'
  }

  return cell
}

function genTickCellData(merchantAddress: string, tokenId: string, coinType: string, txHash: string, value: BigInt) {
  const merchantLock = addressToScript(merchantAddress)
  const merchantLockMol = {
    code_hash: toArrayBuffer(Buffer.from(merchantLock.codeHash.slice(2), 'hex')),
    hash_type: 1, // 0x01 represents type, 0x00 represents data
    args: toArrayBuffer(Buffer.from(merchantLock.args.slice(2), 'hex'))
  }
  const valueBuffer = bigIntToUint128LE(value)

  // console.log('merchant_lock:', merchantLockMol)
  // console.log(Buffer.from(types.SerializeScript(merchantLockMol)).toString('hex'))

  const tickMol = Buffer.from(types.SerializeTick({
    // 0x00 represents this is a mint tick
    tick_type: toArrayBuffer(Buffer.from([0])),
    token_id: toArrayBuffer(Buffer.from(tokenId.slice(2), 'hex')),
    value: toArrayBuffer(valueBuffer, 16), // 100000000 sats in LE == 1 ccBTC
    merchant: merchantLockMol,
    // Be aware the following fields are encoded as utf-8 strings
    coin_type: toArrayBuffer(Buffer.from(coinType, 'utf-8')),
    tx_hash: toArrayBuffer(Buffer.from(txHash, 'utf-8')),
    // This field can be empty when request mint.
    receipt_addr: toArrayBuffer(Buffer.from([])),
  }))
  const version = Buffer.from([0])
  const tickCellData = Buffer.concat([version, tickMol]);

  return '0x' + tickCellData.toString('hex')
}

/**
 * Converts a Node.js Buffer to an ArrayBuffer.
 *
 * @param {Buffer} buffer - The Buffer to convert.
 * @returns {ArrayBuffer} - The resulting ArrayBuffer.
 */
function toArrayBuffer(buffer: Buffer, length?: number) {
  // Create an ArrayBuffer with the same length as the buffer
  const arrayBuffer = new ArrayBuffer(length ?? buffer.length);
  // Create a view (Uint8Array) to copy the buffer contents to the ArrayBuffer
  const uint8Array = new Uint8Array(arrayBuffer);
  // Copy buffer contents directly
  uint8Array.set(buffer);
  // Return the ArrayBuffer
  return arrayBuffer;
}

function bigIntToUint128LE(num: BigInt) {
  let hexString = num.toString(16);
  if (hexString.length % 2 !== 0) {
    hexString = '0' + hexString;
  }

  let buffer = Buffer.from(hexString, 'hex');
  if (buffer.length < 16) {
    const padding = Buffer.alloc(16 - buffer.length, 0);
    buffer = Buffer.concat([padding, buffer], 16);
  } else if (buffer.length > 16) {
    throw new Error('BigInt is too large to fit in a uint128');
  }

  buffer = buffer.reverse();

  return buffer;
}
