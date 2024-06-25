import { Command } from 'commander'
import { default as CKB } from '@nervosnetwork/ckb-sdk-core'
import paramsFormatter from '@nervosnetwork/ckb-sdk-rpc/lib/paramsFormatter'
import { addressToScript } from '@nervosnetwork/ckb-sdk-utils'

import { addCapacity, deepClone, findConfigCell, findGovernanceMemberCell, findMerchantNormalCells, findMerchantXudtCells, findTypeScriptOutPoint, genTickCellData, toTickCell, toXudtCell, u128ToLEHex } from './util'
import { CONTEXT, TICK_CELL_CAPACITY, XUDT_CELL_CAPACITY } from './const'

export async function burnCommand(options: any, _command: Command) {
  if (CONTEXT.verbose) {
    console.log('Options:', options)
  }

  if (!options.coinType) {
    console.error('Coin type is required.')
    process.exit(1)
  }

  if (!options.to) {
    console.error('The multisig CKB address of the custodians is required.')
    process.exit(1)
  } else {
    try {
      addressToScript(options.to)
    } catch (e: any) {
      console.error('Invalid to address:', options.to)
      process.exit(1)
    }
  }

  try {
    let value = BigInt(options.value)
    if (value < 0 || value > BigInt(2) ** BigInt(128)) {
      console.error('The {CoinType} value must be a valid u128 value.')
      process.exit(1)
    }
  } catch (_) {
    console.error('The {CoinType} value for burning must be specified as an unsigned integer without decimals.')
    process.exit(1)
  }

  const networkParams = CONTEXT.networkParams

  if (!(networkParams.tokenId as any)[options.coinType]) {
    console.error('Unsupported coin type:', options.coinType)
    process.exit(1)
  }

  if (networkParams.custodiansOmniLockAddress !== options.to) {
    console.error('The multisig CKB address of the custodians may be changed, please contact the developer to update the address.')
    // The way to get current custodians omni-lock address:
    // 1. Request /v1/custodians/list to get the omni-lock multisig params.
    // 2. Copy and paste the params to /v1/gen_multi_sig_address to get the final address.
    process.exit(1)
  }

  const tokenId = (networkParams.tokenId as any)[options.coinType];
  const tickCellTypeOutPoint = await findTypeScriptOutPoint(networkParams.tickCellType.typeScript)
  const configCellOutPoint = await findConfigCell(networkParams.configCellType.typeId)
  const governanceMemberCellTypeOutPoint = await findGovernanceMemberCell(networkParams.governanceMemberCellType.typeId)
  const xudtCellTypeOutPoint = await findTypeScriptOutPoint(networkParams.xudtCellType.typeScript)
  const [xudtCells, xudtChange] = await findMerchantXudtCells(CONTEXT.merchantAddress, tokenId, options.value)

  // If the change exists, we need to create an additional XudtCell.
  function getRequiredCellCapacity(): bigint {
    return TICK_CELL_CAPACITY + (xudtChange > 0 ? (BigInt(2) * XUDT_CELL_CAPACITY) : XUDT_CELL_CAPACITY)
  }

  const normalCells: any[] = await findMerchantNormalCells(CONTEXT.merchantAddress, getRequiredCellCapacity() + CONTEXT.fee)

  if (CONTEXT.verbose) {
    console.log('Out point of tick-cell-type:', tickCellTypeOutPoint)
    console.log('Out point of ConfigCell:', configCellOutPoint)
    console.log('Out point of GovernanceMemberCell:', governanceMemberCellTypeOutPoint)
    console.log('Out point of xudt-cell-type:', xudtCellTypeOutPoint)
  }

  let ckb = new CKB(CONTEXT.rpcUrl)
  let cellDeps = [
    ...networkParams.cellDeps,
    {
      outPoint: xudtCellTypeOutPoint,
      depType: 'code'
    },
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
    },
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
    toAddress: networkParams.alwaysSuccessAddress,
    capacity: getRequiredCellCapacity(),
    fee: CONTEXT.fee,
    safeMode: false,
    cells: normalCells,
    deps: cellDeps as any[],
    changeThreshold: BigInt(0),
  })

  rawTx.inputs.unshift(...xudtCells.map((cell: any) => ({ previousOutput: cell.outPoint, since: '0x0' })))
  rawTx.witnesses.push(...xudtCells.map(() => '0x'))

  // console.log('rawTx:', rawTx)

  // Duplicate the first output cell, one for TickCell and one for XudtCell
  rawTx.outputs.unshift(deepClone(rawTx.outputs[0]))
  rawTx.outputsData.unshift(rawTx.outputsData[0])

  // Create the TickCell
  rawTx.outputs[0] = toTickCell(rawTx.outputs[0], networkParams.tickCellType.typeId)
  rawTx.outputsData[0] = genTickCellData('burn', CONTEXT.merchantAddress, tokenId, options.coinType, BigInt(options.value))

  // Create the XudtCell
  rawTx.outputs[1] = toXudtCell(rawTx.outputs[1], networkParams.xudtCellType.typeId, tokenId)
  rawTx.outputs[1].lock = addressToScript(options.to)
  rawTx.outputsData[1] = u128ToLEHex(BigInt(options.value))

  // Add change XudtCell if needed
  if (xudtChange > 0) {
    if (CONTEXT.verbose) {
      console.log(`Create change XudtCell with capacity ${XUDT_CELL_CAPACITY} and value ${xudtChange}`)
    }

    // Insert the change XudtCell
    rawTx.outputs.splice(2, 0, deepClone(rawTx.outputs[1]))
    rawTx.outputsData.splice(2, 0, u128ToLEHex(xudtChange))
    rawTx.outputs[2].lock = addressToScript(CONTEXT.merchantAddress)

    // Collect the capacity of inputs[0] as change and add it to the change cell
    rawTx.outputs[3].capacity = addCapacity(rawTx.outputs[3].capacity, XUDT_CELL_CAPACITY)
  } else {
    // Collect the capacity of inputs[0] as change and add it to the change cell
    if (rawTx.outputs.length > 2) {
      rawTx.outputs[2].capacity = addCapacity(rawTx.outputs[2].capacity, XUDT_CELL_CAPACITY)
    } else {
      rawTx.outputs[2] = deepClone(rawTx.outputs[1])
      rawTx.outputs[2].capacity = `0x${XUDT_CELL_CAPACITY.toString(16)}`
      rawTx.outputs[2].lock = addressToScript(CONTEXT.merchantAddress)
      rawTx.outputs[2].type = null
      rawTx.outputsData[2] = '0x'
    }
  }

  // console.log('rawTx:', rawTx)

  // 0x00726571756573745f6275726e represents [prefix, request_burn] in binary format,
  // which is a key symbol to represent the intention of the transaction.
  // It is a constant value that will remain unchanged.
  rawTx.witnesses.push('0x00726571756573745f6275726e')

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
