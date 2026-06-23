# wdk-wallet-solana-hinkal

A [WDK](https://docs.wdk.tether.io) community wallet module that adds [Hinkal](https://hinkal.pro)
private transfers to Solana wallet accounts.

It extends [`@tetherto/wdk-wallet-solana`](https://www.npmjs.com/package/@tetherto/wdk-wallet-solana),
so every standard account method keeps working and three Hinkal methods are added on top:

- `privateSend` — shielded deposit and scheduled withdrawal to a recipient in a single call.
- `withdrawStuckUtxos` — recover stranded shielded UTXOs back to your own address.
- `stuckUtxoBalances` — list recoverable shielded balances per token.

## Installation

```sh
npm install @hinkal/wdk-wallet-solana-hinkal
```

> **Note:** This module depends on `@hinkal/common`, which is distributed for bundled
> environments. Use it through a bundler (Vite, webpack, React Native / Metro, or bare) rather
> than plain Node.js ESM.

## Usage

```js
import WalletManagerSolanaHinkal from '@hinkal/wdk-wallet-solana-hinkal'

const wallet = new WalletManagerSolanaHinkal(seed, { provider: 'https://api.mainnet-beta.solana.com' })
const account = await wallet.getAccount(0)

// Send 1 USDC privately through Hinkal.
const { hash } = await account.privateSend({
  token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  recipient: '...', // base58 Solana address
  amount: 1_000_000n
})

// Inspect and recover stuck shielded balances.
const balances = await account.stuckUtxoBalances()
if (balances.length > 0) {
  await account.withdrawStuckUtxos({ token: balances[0].token })
}
```

## API

### `account.privateSend({ token, recipient, amount }) => Promise<{ hash }>`

Privately transfers `amount` (base units) of `token` to a base58 `recipient` via Hinkal's
`depositAndWithdraw`. Throws if the recipient is not a valid Solana address, the amount is not
positive, or the token is unsupported.

### `account.withdrawStuckUtxos({ token }) => Promise<{ hashes }>`

Recovers stranded shielded UTXOs of `token` back to the account's own address.

### `account.stuckUtxoBalances() => Promise<Array<{ token, balance }>>`

Returns the recoverable shielded balance per token. An empty array means nothing is stuck.

## License

Apache-2.0
