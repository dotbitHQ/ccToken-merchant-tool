import { Command } from 'commander'
import { default as CKB } from '@nervosnetwork/ckb-sdk-core'
import paramsFormatter from '@nervosnetwork/ckb-sdk-rpc/lib/paramsFormatter'

import { findConfigCell, findGovernanceMemberCell, findMerchantNormalCells, findTypeScriptOutPoint, genTickCellData, toTickCell } from './util'
import { TICK_CELL_CAPACITY, CONTEXT } from './const'

export async function mintCommand(options: any, _command: Command) {
  if (CONTEXT.verbose) {
    console.log('Options:', options)
  }

  if (!options.coinType) {
    console.error('Coin type is required.')
    process.exit(1)
  }

  if (!options.txHash) {
    console.error('The hash of the {CoinType} transaction is required.')
    process.exit(1)
  }

  try {
    let value = BigInt(options.value)
    if (value < 0 || value > BigInt(2) ** BigInt(128)) {
      console.error('The {CoinType} value must be a valid u128 value.')
      process.exit(1)
    }
  } catch (_) {
    console.error('The {CoinType} value for minting must be specified as an unsigned integer without decimals.')
    process.exit(1)
  }

  const networkParams = CONTEXT.networkParams

  if (!(networkParams.tokenId as any)[options.coinType]) {
    console.error('Unsupported coin type:', options.coinType)
    process.exit(1)
  }
  const tickCellTypeOutPoint = await findTypeScriptOutPoint(networkParams.tickCellType.typeScript)
  const configCellOutPoint = await findConfigCell(networkParams.configCellType.typeId)
  const governanceMemberCellTypeOutPoint = await findGovernanceMemberCell(networkParams.governanceMemberCellType.typeId)
  const inputs: any[] = await findMerchantNormalCells(CONTEXT.merchantAddress, TICK_CELL_CAPACITY + CONTEXT.fee)

  if (CONTEXT.verbose) {
    console.log('Out point of tick-cell-type:', tickCellTypeOutPoint)
    console.log('Out point of ConfigCell:', configCellOutPoint)
    console.log('Out point of GovernanceMemberCell:', governanceMemberCellTypeOutPoint)
  }

  let ckb = new CKB(CONTEXT.rpcUrl)
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

  if (CONTEXT.verbose) {
    console.log('➡️ Raw cell_deps:\n', JSON.stringify(cellDeps, null, 2))
  }

  if (CONTEXT.verbose) {
    console.log('➡️ Raw inputs:', inputs)
  }

  // Create basic transaction
  const rawTx = ckb.generateRawTransaction({
    fromAddress: CONTEXT.merchantAddress,
    toAddress: networkParams.alwaysSuccessAddress,
    capacity: TICK_CELL_CAPACITY,
    fee: CONTEXT.fee,
    safeMode: false,
    cells: inputs,
    deps: cellDeps as any[],
    changeThreshold: BigInt(0),
  })

  rawTx.outputs[0] = toTickCell(rawTx.outputs[0], networkParams.tickCellType.typeId)
  rawTx.outputsData[0] = genTickCellData('mint', CONTEXT.merchantAddress, (networkParams.tokenId as any)[options.coinType], options.coinType, BigInt(options.value), options.txHash )

  // 0x00726571756573745f6d696e74 represents [prefix, request_mint] in binary format,
  // which is a key symbol to represent the intention of the transaction.
  // It is a constant value that will remain unchanged.
  rawTx.witnesses.push('0x00726571756573745f6d696e74')

  // console.log(JSON.stringify(rawTx, null, 2))

  const signedTx = ckb.signTransaction(CONTEXT.merchantPrivateKey)(rawTx)

  const rpc_format_tx = paramsFormatter.toRawTransaction(signedTx)

  if (CONTEXT.verbose) {
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
}
