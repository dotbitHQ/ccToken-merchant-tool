# CCToken Merchant Tool

This command line tool for merchants of the [CCToken](https://www.crosschain.network/). It is a simple command line tool that allows merchants to send `request_mint/request_burn/transfer` transaction on [CKB](https://www.nervos.org/).


## Building

Because this tool reads your private key to sign the transaction, it is recommended to build the tool from the source code. Since it is built on Node.js, it is relatively easy to do so on Mac OS or Linux. Please note that Windows compatibility has not been tested yet.

After building it will create 3 binariesin the `build/` directory for each platform. This allows one developer to build and distribute the binary to others.

### Prerequisites

- Nodejs(>=20) installed, and the `npm` command can work properly.
- Good network connection to npm registry.

### Building

```bash
npm install
npm run build
```

You may see a lot of warning after building, but it is safe to ignore them. They are cause by the `axios` in `node_modules/`, but the binary is built from single file in `dist/` which is bundled by webpack.

The final binaries are in the `build/` directory.


## Usage

After building the tool, one can use the binary in `build/` directory. The tool requires the following parameters:

```bash
Usage: index [options] [command]

Options:
  -f, --fee <fee>                   The total fee of the CKB transaction (default: "10000")
  -p, --private-key <privateKey>    Merchant private key. Please use environment variable
                                    MERCHANT_PRIVATE_KEY instead in production environment.
  -a, --merchant-address <address>  Merchant address
  -u, --rpc-url <url>               The base url of CKB RPC.
  -V, --verbose                     Show verbose debug messages. (default: false)
  -h, --help                        display help for command

Commands:
  mint [options]
  burn [options]
  transfer [options]
  help [command]                    display help for command
```

There are three subcommands: `mint`, `burn`, and `transfer`. All of them have common parameters:

- `--fee` is the total fee of the CKB transaction.
- `--private-key` is the private key of the merchant.
- `--merchant-address` is the address of the merchant.
- `--rpc-url` is the base url of CKB RPC.

Some of the common parameters can also be passed as environment variables:

- `MERCHANT_PRIVATE_KEY`: Merchant private key.
- `CKB_RPC_URL`: The CKB RPC url.

**Please note that the `--value` parameter always requires a u128 type value. For example, if you wish to mint 0.1 ccBTC with 8 decimal places, you should input `10000000` (10,000,000) as the value. The `--value` cannot be negative or exceed the maximum u128 value.**

Each subcommand has its own parameters. Please refer to the following sections for instructions on how to use them.

### Minting

To mint 0.1 BTC token, and the private key is passed as environment variable, one can use the following command:

```bash
{your_binary_path} --rpc-url http://localhost:8114 \
--merchant-address ckt1... \
mint \
--coin-type BTC \
--tx-hash 0x... \
--value 10000000
```

### Transfer

To transfer 0.1 BTC token, and the private key is passed as environment variable, one can use the following command:

```bash
{your_binary_path} --rpc-url http://localhost:8114 \
--merchant-address ckt1... \
transfer \
--coin-type BTC \
--to ckt1... \
--value 10000000
```

### Burning

To burn 0.1 BTC token, and the private key is passed as environment variable, one can use the following command:

```bash
{your_binary_path} --rpc-url http://localhost:8114 \
--merchant-address ckt1... \
burn \
--to ckt1... \
--coin-type BTC \
--receipt_addr tb1... \
--value 10000000
```

Please note that the `--to` parameter represents the multisig address of custodians, so the available value may vary
depending on the CCToken's daily management. Therefore, **it is essential to always verify if the address has been updated**.

The current multisig address of custodians are:

> The multisig address of cusodians:
>
> - Mainnet: ckb1qzdcr9un5ezx8tkh03s46m9jymh22jruelq8svzr5krj2nx69dhjvqgxvm0a2jw0q85l0mf687m7ksdkyj5cejaxqqpthcud
> - Testnet: ckt1qpa0qahsffdrsxtuu97tc2u2wzwaeel3dc7fjjm3vurvtggrggqquqgx2a48py5vhs2ew4g9tsr988r9mvtz8xn8qq388fz6

The `--receipt_addr` parameter is the receipt address of the BTC, the address WILL NOT BE VERIFIED, please make sure it is in the your whitelist on the CCToken's platform.
