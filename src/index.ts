import { addressToScript } from '@nervosnetwork/ckb-sdk-utils'
import { default as CKB } from '@nervosnetwork/ckb-sdk-core'
import paramsFormatter from '@nervosnetwork/ckb-sdk-rpc/lib/paramsFormatter'

import * as types from './schemas/cell.js';

// This is my personal testnet node base url, please replace it with your own node.
const baseUrl = 'http://localhost:8224'

const merchantAddress = 'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqdpkymv9n2prd6hukg3c42wf3mp9a5aqzslcfkm6'
const merchantPrivateKey = ''
// Because the custodian address is dynamic, so the recipient address is a always_success address.
// And the tick-cell-type contract will check who can unlock the TickCell.
const alwaysSuccessAddress = 'ckt1qzqmth635x0qaytkuujgmdrrc67zlgd0c57u2727gyp6xdnskzlj7qgh6rt3u'

// testnet
const tickCellTypeId = '0xd5506e22660561635b54fa2887a469d230d1b8d29d53be8fecdbb8215477465c'
// mainnet
// const tick_cell_type_id = '0xbe7801c3a4b276d7e72cd478eece9f29374720d131e03e5f04b6a88804257122'

// testnet
const tokenId = '0x3b6224e621410370887db7e3d95f63d9c760d7f56ee864521403c99e8b4f34b8'
// mainnet
// const token_id = '0x68e64ba4b0daeeec45c1f983d6d574fca370442cafb805bc4265ef74870a4ac8'

const btcTxHash = '0x0000000000000000000000000000000000000000000000000000000000000000'

const cellDeps: any[] = [
  // Contract of tick-cell-type
  {
    outPoint: {
      txHash: '0x23913948b9efac1e5d5f5de8d2677f36fdb1aaf60905630a3246e2c2b7a6f527',
      index: '0x0'
    },
    depType: 'code'
  },
  // Contract of sighash_all_group
  {
    outPoint: {
      txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
      index: '0x0'
    },
    depType: 'depGroup'
  },
  // ConfigCell, a cell that stores the config of the contract
  {
    outPoint: {
      txHash: '0x261afe6869c593a128ef70c3edf38d9fb575671c24367afe7b9ce42150c15b89',
      index: '0x0'
    },
    depType: 'code'
  },
  // GovernanceMemberCell, a cell that stores the merchant list
  {
    outPoint: {
      txHash: '0xef5365221d15fbfb9cb433b370e1b445aa8272b4c45a19de30da66247438033d',
      index: '0x0'
    },
    depType: 'code'
  }
];

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

(async () => {
  let ckb = new CKB(baseUrl)

  // Create basic transaction
  const rawTx = ckb.generateRawTransaction({
    fromAddress: merchantAddress,
    toAddress: alwaysSuccessAddress,
    // 551CKB as the basic occupied capacity of the TickCell
    capacity: BigInt(55100000000),
    fee: BigInt(10000),
    safeMode: false,
    cells: inputs,
    deps: cellDeps,
    changeThreshold: BigInt(0),
  })

  rawTx.outputs[0] = toTickCell(rawTx.outputs[0])
  rawTx.outputsData[0] = genTickCellData()

  // 0x00726571756573745f6d696e74 represents [prefix, request_mint] in binary format,
  // which is a key symbol to represent the intention of the transaction.
  // It is a constant value that will remain unchanged.
  rawTx.witnesses.push('0x00726571756573745f6d696e74')

  // console.log(JSON.stringify(rawTx, null, 2))

  const signedTx = ckb.signTransaction(merchantPrivateKey)(rawTx)

  const rpc_format_tx = paramsFormatter.toRawTransaction(signedTx)
  console.log(JSON.stringify(rpc_format_tx, null, 2))

  const txHash = await ckb.rpc.sendTransaction(signedTx)
  console.log('txHash:', txHash)
})();

function toTickCell(cell: any) {
  // The TickCell's capacity, lock and type are always the same value.
  cell.type = {
    codeHash: tickCellTypeId,
    hashType: 'type',
    args: '0x'
  }

  return cell
}

function genTickCellData() {
  const merchantLock = addressToScript(merchantAddress)
  const merchantLockMol = {
    code_hash: toArrayBuffer(Buffer.from(merchantLock.codeHash.slice(2), 'hex')),
    hash_type: 1, // 0x01 represents type, 0x00 represents data
    args: toArrayBuffer(Buffer.from(merchantLock.args.slice(2), 'hex'))
  }

  // console.log('merchant_lock:', merchantLockMol)
  // console.log(Buffer.from(types.SerializeScript(merchantLockMol)).toString('hex'))

  const tickMol = Buffer.from(types.SerializeTick({
    // 0x00 represents this is a mint tick
    tick_type: toArrayBuffer(Buffer.from([0])),
    token_id: toArrayBuffer(Buffer.from(tokenId.slice(2), 'hex')),
    value: toArrayBuffer(Buffer.from('00e1f505', 'hex'), 16), // 100000000 sats in LE == 1 ccBTC
    merchant: merchantLockMol,
    // Be aware the following fields are encoded as utf-8 strings
    coin_type: toArrayBuffer(Buffer.from('BTC', 'utf-8')),
    tx_hash: toArrayBuffer(Buffer.from(btcTxHash, 'utf-8')),
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
