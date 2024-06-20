# CCToken Mint Tool

This tool is used to mint tokens for the [CCToken](https://www.crosschain.network/). It is a simple command line tool that allows merchants to send `request_mint` transaction on [CKB](https://www.nervos.org/).


## Building

Because this tool reads your private key to sign the transaction, it is recommended to build the tool from the source code. Since it is built on Node.js, it is relatively easy to do so on Mac OS or Linux. Please note that Windows compatibility has not been tested yet.

After building it will create 3 binariesin the `build/` directory for each platform. This allows one developer to build and distribute the binary to others.

### Prerequisites

- Nodejs(>=18) installed, and the `npm` command can work properly.
- Good network connection to npm registry.

### Building

```bash
npm install
npm run build
```

You may see a lot of warning after building, but it is safe to ignore them. They are cause by the `axios` in `node_modules/`, but the binary is built from single file in `dist/` which is bundled by webpack.


## Usage

After building the tool, one can use the binary in `build/` directory. The tool requires the following parameters:

```bash
Usage: index [options]

Options:
  -f, --fee <fee>                   The total fee of the CKB transaction (default: "10000")
  -p, --private-key <privateKey>    Merchant private key. Please use environment variable MERCHANT_PRIVATE_KEY instead in production environment.
  -a, --merchant-address <address>  Merchant address
  -u, --rpc-url <url>               The base url of CKB RPC.
  -c, --coin-type [type]            The coin type defined by Cactus Custody.[available: BTC] (default: "BTC")
  -t, --tx-hash <hash>              The hash of the {CoinType} transaction.
  -v, --value <value>               The value of the {CoinType} token to mint.(Be aware this value is in minimum unit of the token, e.g. 1 ccBTC =
                                    100000000 sats. And service fee should be deducted, e.g. deposit 1 BTC to mint 0.999 BTC)
  -V, --verbose                     Show verbose debug messages. (default: false)
  -h, --help                        display help for command
```

Some of the parameters can also be passed as environment variables:

- `MERCHANT_PRIVATE_KEY`: Merchant private key.
- `CKB_RPC_URL`: The CKB RPC url.

For example, to mint 1 BTC token, and the private key is passed as environment variable, one can use the following command:

```bash

{your_binary_path} --merchant-address {ckt1...} \
--rpc-url http://localhost:8114 \
--coin-type BTC \
--tx-hash 0x000000000 \
--value 100000000
```
