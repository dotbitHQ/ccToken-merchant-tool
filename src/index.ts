import { program, Command } from 'commander'
import 'dotenv/config'

import { mintCommand } from './mint'
import { burnCommand } from './burn'
import { transferCommand } from './transfer'
import { setupContext } from './util'

program
  .option('-f, --fee <fee>', 'The total fee of the CKB transaction', '10000')
  .option('-p, --private-key <privateKey>', 'Merchant private key. Please use environment variable MERCHANT_PRIVATE_KEY instead in production environment.')
  .option('-a, --merchant-address <address>', 'Merchant address')
  .option('-u, --rpc-url <url>', 'The base url of CKB RPC.')
  .option('-V, --verbose', 'Show verbose debug messages.', false)

// Mint command
program.command('mint')
  .description('Mint xUDT token to the merchant address.')
  .option('-c, --coin-type [type]', 'The coin type defined by Cactus Custody.[available: BTC]', 'BTC')
  .option('-t, --tx-hash <hash>', 'The hash of the {CoinType} transaction.')
  .option('-v, --value <value>', 'The value of the {CoinType} token to mint.(Be aware this value is in minimum unit of the token, e.g. 1 ccBTC = 100000000 sats. And service fee should be deducted, e.g. deposit 1 BTC to mint 0.999 BTC)')
  .action(async (options: any, command: Command) => {
    await setupContext(command.parent?.opts())
    await mintCommand(options, command)
  })

// Burn command
program.command('burn')
  .description('Burn xUDT token from the merchant address.')
  .option('-c, --coin-type [type]', 'The coin type defined by Cactus Custody.[available: BTC]', 'BTC')
  .option('-t, --to <address>', 'The multisig CKB address of the custodians.')
  .option('-v, --value <value>', 'The value of the {CoinType} token to mint.(Be aware this value is in minimum unit of the token, e.g. 1 ccBTC = 100000000 sats. And service fee should be deducted, e.g. deposit 1 BTC to mint 0.999 BTC)')
  .option('-r, --receipt-addr <value>', 'The receipt address of the {CoinType} token, the address WILL NOT BE VERIFIED, please make sure it is the correct one.')
  .action(async (options: any, command: Command) => {
    await setupContext(command.parent?.opts())
    await burnCommand(options, command)
  })

// Transfer command
program.command('transfer')
  .description('Transfer xUDT token from the merchant address to another address.')
  .option('-c, --coin-type [type]', 'The coin type defined by Cactus Custody.[available: BTC]', 'BTC')
  .option('-t, --to <address>', 'The CKB address of the receiver.')
  .option('-v, --value <value>', 'The value of the {CoinType} token to mint.(Be aware this value is in minimum unit of the token, e.g. 1 ccBTC = 100000000 sats. And service fee should be deducted, e.g. deposit 1 BTC to mint 0.999 BTC)')
  .action(async (options: any, command: Command) => {
    await setupContext(command.parent?.opts())
    await transferCommand(options, command)
  })

program.parse()
