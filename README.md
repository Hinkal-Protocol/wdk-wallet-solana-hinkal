# @hinkal/wdk-wallet-solana-hinkal

Adds [Hinkal] private transfer support to Solana wallets built with [WDK](https://docs.wdk.tether.io).

Hinkal is a privacy protocol that shields token transfers on-chain. This package wraps `@tetherto/wdk-wallet-solana` and adds three methods to every account:

- **`privateSend`** — send tokens to any address privately. The transfer is shielded through Hinkal so the link between sender and recipient is hidden on-chain.
- **`withdrawStuckUtxos`** — recover any shielded balances that got stuck in Hinkal back to your own address.
- **`stuckUtxoBalances`** — check how much shielded balance is recoverable per token.

All existing WDK wallet methods work unchanged.

## Installation

```sh
npm install @hinkal-wdk-modules/wdk-wallet-solana-hinkal
```

## Usage

```js
import WalletManagerSolanaHinkal from "@hinkal-wdk-modules/wdk-wallet-solana-hinkal";

const wallet = new WalletManagerSolanaHinkal(seed, {
  provider: "https://api.mainnet-beta.solana.com",
});
const account = await wallet.getAccount(0);

// Send tokens privately through Hinkal
const { hash } = await account.privateSend({
  token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
  recipient: "...", // base58 Solana address
  amount: 1_000_000n, // 1 USDC in base units
});
```

> Requires a bundler (Vite, webpack, Metro, or bare) — `@hinkal/common` is not plain Node.js ESM compatible.

## License

Apache-2.0
