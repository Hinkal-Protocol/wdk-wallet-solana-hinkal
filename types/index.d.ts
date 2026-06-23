import WalletManagerSolana, { WalletAccountSolana } from '@tetherto/wdk-wallet-solana'

export interface PrivateSendOptions {
  /** The token's address. */
  token: string
  /** The recipient's base58 Solana address. */
  recipient: string
  /** The amount to send, in base units. */
  amount: bigint | number | string
}

export interface StuckUtxoBalance {
  /** The token's address. */
  token: string
  /** The recoverable shielded balance, in base units. */
  balance: bigint
}

/** A Solana wallet account with Hinkal private-transfer support. */
export class WalletAccountSolanaHinkal extends WalletAccountSolana {
  /** Sends a token to another address privately through Hinkal. */
  privateSend (options: PrivateSendOptions): Promise<{ hash: string }>
  /** Withdraws this account's stuck Hinkal UTXOs of a token back to its own address. */
  withdrawStuckUtxos (options: { token: string }): Promise<{ hashes: string[] }>
  /** Returns this account's stuck Hinkal shielded balances. */
  stuckUtxoBalances (): Promise<StuckUtxoBalance[]>
}

/** A wallet manager for Solana whose accounts support Hinkal private transfers. */
export default class WalletManagerSolanaHinkal extends WalletManagerSolana {
  getAccount (index?: number): Promise<WalletAccountSolanaHinkal>
  getAccountByPath (path: string): Promise<WalletAccountSolanaHinkal>
}
