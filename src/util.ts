import axios from 'axios'
import { addressToScript } from '@nervosnetwork/ckb-sdk-utils'
import paramsFormatter from '@nervosnetwork/ckb-sdk-rpc/lib/paramsFormatter'
import resultFormatter from '@nervosnetwork/ckb-sdk-rpc/lib/resultFormatter'

import * as types from './schemas/cell.js';
import { CONTEXT, MAINNET, NetworkParams, TESTNET, TICK_CELL_CAPACITY, XUDT_CELL_CAPACITY } from './const';

export async function setupContext(options: any) {
  CONTEXT.verbose = options.verbose

  if (options.privateKey) {
    CONTEXT.merchantPrivateKey = options.privateKey
  } else if (process.env.MERCHANT_PRIVATE_KEY) {
    CONTEXT.merchantPrivateKey = process.env.MERCHANT_PRIVATE_KEY!
  } else {
    console.error('Merchant private key is required.')
    process.exit(1)
  }

  if (process.env.CKB_RPC_URL && !options.rpcUrl) {
    CONTEXT.rpcUrl = process.env.CKB_RPC_URL!
  } else if (options.rpcUrl) {
    CONTEXT.rpcUrl = options.rpcUrl
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
      CONTEXT.merchantAddress = options.merchantAddress
    } catch (e: any) {
      console.error('Invalid merchant address:', options.merchantAddress)
      process.exit(1)
    }
  }

  CONTEXT.fee = BigInt(options.fee)

  const [network, networkParams] = await selectCurrentNetwork()
  CONTEXT.network = network
  CONTEXT.networkParams = networkParams
}

export async function selectCurrentNetwork(): Promise<['mainnet' | 'testnet', NetworkParams]>{
  let network: 'testnet' | 'mainnet' = 'mainnet'
  let networkParams: NetworkParams

  try {
    let resp = await axios.post(CONTEXT.rpcUrl, {
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

    if (CONTEXT.verbose) {
      console.log('🌏 Genesis hash:', body.genesis_hash)
      console.log('🌏 Current network:', network)
    }
  } catch (e: any) {
    console.error('Failed to connect to CKB RPC server:', e.message)
    process.exit(1)
  }

  return [network, networkParams]
}

export async function findTypeScriptOutPoint(typeScript: any) {
  try {
    let resp = await axios.post(CONTEXT.rpcUrl, {
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

export async function findConfigCell(typeId: string) {
  try {
    let resp = await axios.post(CONTEXT.rpcUrl, {
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

export async function findGovernanceMemberCell(typeId: string) {
  try {
    let resp = await axios.post(CONTEXT.rpcUrl, {
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

export async function findMerchantNormalCells(merchantAddress: string, requiredValue: bigint) {
  try {
    let lock = addressToScript(merchantAddress)
    let resp = await axios.post(CONTEXT.rpcUrl, {
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
    let inputs: any[] = []
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
    console.error('Failed to get cells:', e.message, __filename)
    process.exit(1)
  }
}

export async function findMerchantXudtCells(merchantAddress: string, tokenId: string, requiredValue: bigint): Promise<[any[], bigint]> {
  let lock = addressToScript(merchantAddress)
  let body
  try {
    let resp = await axios.post(CONTEXT.rpcUrl, {
        "id": 1,
        "jsonrpc": "2.0",
        "method": "get_cells",
        "params": [
            {
              "script": paramsFormatter.toScript(lock),
              "script_type": "lock",
              "filter": {
                "script": {
                    "code_hash": CONTEXT.networkParams.xudtCellType.typeId,
                    "hash_type": "type",
                    "args": tokenId
                },
              },
              "with_data": true
            },
            "desc",
            "0x14"
        ]
    })

    body = resp.data.result
  } catch (e: any) {
    console.error('Failed to get cells:', e.message, __filename)
    process.exit(1)
  }

  let totalValue = BigInt(0)
  let inputs: any[] = []
  let change = BigInt(0)
  for (let cell of body.objects) {
    totalValue += u128FromLEHex(cell.output_data)
    // console.log('cell.output_data:', cell.output_data)
    // console.log('totalValue:', totalValue)
    inputs.push({
      capacity: cell.output.capacity,
      lock: resultFormatter.toScript(cell.output.lock),
      outPoint: resultFormatter.toOutPoint(cell.out_point),
      data: cell.output_data,
    })

    if (totalValue >= requiredValue) {
      change = totalValue - BigInt(requiredValue)

      if (CONTEXT.verbose) {
        if (change > BigInt(0)) {
          console.log('⚠️ Xudt value fullfilled with change.')
          console.log(`🟰 change(${change}) = totalValue(${totalValue}) - requiredValue(${requiredValue})`)
        } else {
          console.log('⚠️ Xudt value fullfilled without change.')
        }
      }

      break
    }
  }

  return [inputs, change]
}

export function toTickCell(cell: any, tickCellTypeId: string) {
  // The TickCell's capacity, lock and type are always the same value.
  cell.capacity = '0x' + TICK_CELL_CAPACITY.toString(16)
  cell.type = {
    codeHash: tickCellTypeId,
    hashType: 'type',
    args: '0x'
  }

  return cell
}

export function toXudtCell(cell: any, xudtCellTypeId: string, tokenId: string) {
  // The XudtCell's capacity, lock and type are always the same value.
  cell.capacity = '0x' + XUDT_CELL_CAPACITY.toString(16)
  cell.type = {
    codeHash: xudtCellTypeId,
    hashType: 'type',
    args: tokenId,
  }

  return cell
}

export function genTickCellData(type: string, merchantAddress: string, tokenId: string, coinType: string, value: BigInt, txHash?: string) {
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
    tick_type: toArrayBuffer(Buffer.from([ type == 'mint' ? 0 : 1 ])),
    token_id: toArrayBuffer(Buffer.from(tokenId.slice(2), 'hex')),
    value: toArrayBuffer(valueBuffer, 16), // 100000000 sats in LE == 1 ccBTC
    merchant: merchantLockMol,
    // Be aware the following fields are encoded as utf-8 strings
    coin_type: toArrayBuffer(Buffer.from(coinType, 'utf-8')),
    tx_hash: txHash ? toArrayBuffer(Buffer.from(txHash, 'utf-8')) : new ArrayBuffer(0),
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
export function toArrayBuffer(buffer: Buffer, length?: number) {
  // Create an ArrayBuffer with the same length as the buffer
  const arrayBuffer = new ArrayBuffer(length ?? buffer.length);
  // Create a view (Uint8Array) to copy the buffer contents to the ArrayBuffer
  const uint8Array = new Uint8Array(arrayBuffer);
  // Copy buffer contents directly
  uint8Array.set(buffer);
  // Return the ArrayBuffer
  return arrayBuffer;
}

/**
 * Converts a BigInt to a little-endian Uint128.
 *
 * @param {BigInt} num - The BigInt to convert.
 * @returns {Buffer} - The resulting little-endian Uint128.
 */
export function bigIntToUint128LE(num: BigInt) {
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

export function deepClone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

export function u128FromLEHex(leHex: string) {
   if (leHex.startsWith('0x')) {
    leHex = leHex.slice(2);
  }
  if (leHex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const buffer = Buffer.from(leHex, 'hex');
  const beHex = buffer.reverse().toString('hex');

  const bigIntValue = BigInt(`0x${beHex}`);
  return bigIntValue;
}

export function u128ToLEHex(num: bigint) {
  if (typeof num !== 'bigint') {
    throw new Error('Input value must be a BigInt');
  }
  let beHex = num.toString(16);
  beHex = beHex.padStart(32, '0');

  const buffer = Buffer.from(beHex, 'hex');
  const leBuffer = buffer.reverse();
  const leHex = leBuffer.toString('hex');
  return '0x' + leHex;
}
