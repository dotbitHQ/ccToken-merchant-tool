import { Command } from 'commander'
import { default as CKB } from '@nervosnetwork/ckb-sdk-core'
import paramsFormatter from '@nervosnetwork/ckb-sdk-rpc/lib/paramsFormatter'
import { addressToScript } from '@nervosnetwork/ckb-sdk-utils'

import { deepClone, findMerchantNormalCells, findMerchantXudtCells, findTypeScriptOutPoint, genTickCellData, toTickCell, toXudtCell, u128ToLEHex } from './util'
import { CONTEXT, XUDT_CELL_CAPACITY } from './const'

export async function transferCommand(options: any, _command: Command) {
  if (CONTEXT.verbose) {
    console.log('Options:', options)
  }

  if (!options.coinType) {
    console.error('Coin type is required.')
    process.exit(1)
  }

  if (!options.to) {
    console.error('The CKB address of the receiver is required.')
    process.exit(1)
  }

  try {
    BigInt(options.value)
  } catch (_) {
    console.error('The {CoinType} value for transfer must be specified as an unsigned integer without decimals.')
    process.exit(1)
  }

  const networkParams = CONTEXT.networkParams

  if (!(networkParams.tokenId as any)[options.coinType]) {
    console.error('Unsupported coin type:', options.coinType)
    process.exit(1)
  }

  const tokenId = (networkParams.tokenId as any)[options.coinType];
  const xudtCellTypeOutPoint = await findTypeScriptOutPoint(networkParams.xudtCellType.typeScript)
  const [xudtCells, xudtChange] = await findMerchantXudtCells(CONTEXT.merchantAddress, tokenId, options.value)

  // If the change exists, we need to create an additional XudtCell.
  function getRequiredCellCapacity(): bigint {
    return xudtChange > 0 ? (BigInt(2) * XUDT_CELL_CAPACITY) : XUDT_CELL_CAPACITY
  }

  const normalCells: any[] = await findMerchantNormalCells(CONTEXT.merchantAddress, getRequiredCellCapacity() + CONTEXT.fee)

  if (CONTEXT.verbose) {
    console.log('Out point of xudt-cell-type:', xudtCellTypeOutPoint)
  }

  let ckb = new CKB(CONTEXT.rpcUrl)
  let cellDeps = [
    ...networkParams.cellDeps,
    {
      outPoint: xudtCellTypeOutPoint,
      depType: 'code'
    }
  ]

  if (CONTEXT.verbose) {
    console.log('➡️ Raw cell_deps:\n', JSON.stringify(cellDeps, null, 2))
  }

  if (CONTEXT.verbose) {
    console.log('➡️ Raw xudt cells:', xudtCells)
    console.log('➡️ Raw normal cells:', normalCells)
  }

  // Create basic transaction
  const rawTx = ckb.generateRawTransaction({
    fromAddress: CONTEXT.merchantAddress,
    toAddress: options.to,
    capacity: getRequiredCellCapacity(),
    fee: CONTEXT.fee,
    safeMode: false,
    cells: normalCells,
    deps: cellDeps as any[],
    changeThreshold: BigInt(0),
  })

  // console.log('rawTx:', rawTx)

  rawTx.inputs.unshift(...xudtCells.map((cell: any) => ({ previousOutput: cell.outPoint, since: '0x0' })))
  rawTx.witnesses.push(...xudtCells.map(() => '0x'))

  rawTx.outputs[0] = toXudtCell(rawTx.outputs[0], networkParams.xudtCellType.typeId, tokenId)
  rawTx.outputsData[0] = u128ToLEHex(BigInt(options.value))

  // Add change XudtCell if needed
  if (xudtChange > 0) {
    if (CONTEXT.verbose) {
      console.log(`Create change XudtCell with capacity ${XUDT_CELL_CAPACITY} and value ${xudtChange}`)
    }

    rawTx.outputs[2] = rawTx.outputs[1]
    rawTx.outputsData[2] = rawTx.outputsData[1]

    // Split the capacity for two XudtCells
    rawTx.outputs[0].capacity = '0x' + XUDT_CELL_CAPACITY.toString(16)

    // Create the change XudtCell
    rawTx.outputs[1] = deepClone(rawTx.outputs[0])
    rawTx.outputs[1].lock = addressToScript(CONTEXT.merchantAddress)
    rawTx.outputsData[1] = u128ToLEHex(xudtChange)
  }

  // 0x007472616e73666572 represents [prefix, transfer] in binary format,
  // which is a key symbol to represent the intention of the transaction.
  // It is a constant value that will remain unchanged.
  rawTx.witnesses.push('0x007472616e73666572')

  const signedTx = ckb.signTransaction(CONTEXT.merchantPrivateKey)(rawTx)

  const rpc_format_tx = paramsFormatter.toRawTransaction(signedTx)

  if (CONTEXT.verbose) {
    console.log('')
    console.log(JSON.stringify(rpc_format_tx, null, 2))
  }

  try {
    // const txHash = await ckb.rpc.sendTransaction(signedTx)
    // console.log(txHash)
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
}
