// Copyright 2026 Hinkal Protocol
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

import { WalletAccountSolana } from "@tetherto/wdk-wallet-solana";
import {
  getERC20Token,
  currentSolanaChainId,
  getCurrentTimeInSeconds,
  getFeeStructure,
  ExternalActionId,
  HINKAL_PRIVATE_SEND_VARIABLE_RATE,
} from "@hinkal/common";
import { prepareSolanaHinkal } from "@hinkal/common/providers/prepareSolanaHinkal";

/** @typedef {import('@tetherto/wdk-wallet').TransferOptions} TransferOptions */

/**
 * @typedef {Object} StuckUtxoBalance
 * @property {string} token - The token's address.
 * @property {bigint} balance - The recoverable shielded balance, in base units.
 */

const DEFAULT_NULLIFIER_COUNT = 1;

/**
 * A Solana wallet account with Hinkal private-transfer support.
 *
 * Extends the standard {@link WalletAccountSolana} with private sends and recovery of
 * stranded shielded UTXOs through the Hinkal protocol.
 */
export default class WalletAccountSolanaHinkal extends WalletAccountSolana {
  /**
   * Prepares a Hinkal session funded by this account on the Solana chain.
   *
   * @private
   * @returns {Promise<import('@hinkal/common').Hinkal<unknown>>} The initialized Hinkal session.
   * @throws {Error} If the wallet account has been disposed.
   */
  async _prepareSession() {
    if (!this._rawPrivateKey) {
      throw new Error("The wallet account has been disposed.");
    }

    const secretKey = nacl.sign.keyPair.fromSeed(this._rawPrivateKey).secretKey;
    const keypair = Keypair.fromSecretKey(secretKey);

    const signTx = (tx) => {
      if (typeof tx.partialSign === "function") {
        tx.partialSign(keypair);
      } else {
        tx.sign([keypair]);
      }
      return tx;
    };

    const solanaWallet = {
      publicKey: keypair.publicKey,
      async signTransaction(tx) {
        return signTx(tx);
      },
      async signAllTransactions(txs) {
        return txs.map(signTx);
      },
      async signMessage(message) {
        return {
          signature: nacl.sign.detached(message, keypair.secretKey),
          publicKey: keypair.publicKey,
        };
      },
    };

    const hinkal = await prepareSolanaHinkal(solanaWallet);
    hinkal.solanaProviderAdapter.ethereumAddress =
      hinkal.userKeys.getDerivedEthereumAddress();
    return hinkal;
  }

  /**
   * Validates token support and prepares a Hinkal session for the Solana chain.
   *
   * @private
   * @param {string} token - The token address to validate.
   * @returns {Promise<{ hinkal: import('@hinkal/common').Hinkal<unknown>, erc20Token: object }>}
   * @throws {Error} If the wallet account has been disposed.
   * @throws {Error} If the token is not supported by Hinkal on the current chain.
   */
  async _prepareHinkal(token) {
    const erc20Token = getERC20Token(token, currentSolanaChainId);
    if (!erc20Token) {
      throw new Error(
        `The token ${token} is not supported by Hinkal on chain ${currentSolanaChainId}.`,
      );
    }
    const hinkal = await this._prepareSession();
    return { hinkal, erc20Token };
  }

  /**
   * Sends a token to another address privately through Hinkal.
   *
   * @param {TransferOptions} options - The transfer's options (`amount` in base units).
   * @returns {Promise<{ hash: string }>} The transfer's result.
   * @throws {Error} If the recipient address is invalid.
   * @throws {Error} If the amount is not positive.
   * @throws {Error} If the wallet account has been disposed.
   * @throws {Error} If the token is not supported by Hinkal on the current chain.
   */
  async privateSend({ token, recipient, amount }) {
    try {
      new PublicKey(recipient);
    } catch {
      throw new Error("Invalid Solana recipient address.");
    }
    const parsedAmount = BigInt(amount);
    if (parsedAmount <= 0n) {
      throw new Error("Amount must be positive.");
    }
    const { hinkal, erc20Token } = await this._prepareHinkal(token);

    const feeStructure = await getFeeStructure(
      currentSolanaChainId,
      erc20Token.erc20TokenAddress,
      [erc20Token.erc20TokenAddress],
      ExternalActionId.Transact,
      [],
      HINKAL_PRIVATE_SEND_VARIABLE_RATE,
      {
        mintTo: erc20Token.erc20TokenAddress,
        recipient,
        nullifierCount: DEFAULT_NULLIFIER_COUNT,
      },
    );

    const hash = await hinkal.depositAndWithdraw(
      erc20Token,
      [parsedAmount],
      [recipient],
      getCurrentTimeInSeconds(),
      feeStructure,
    );
    return { hash };
  }

  /**
   * Withdraws this account's stuck Hinkal UTXOs of a token back to its own address.
   *
   * @param {{ token: string }} options - The options (only `token` is used).
   * @returns {Promise<{ hashes: string[] }>} The withdrawal transactions' hashes.
   * @throws {Error} If the wallet account has been disposed.
   * @throws {Error} If the token is not supported by Hinkal on the current chain.
   */
  async withdrawStuckUtxos({ token }) {
    const { hinkal, erc20Token } = await this._prepareHinkal(token);
    const recipient = await this.getAddress();
    const hashes = await hinkal.withdrawStuckUtxos(erc20Token, recipient);
    return { hashes };
  }

  /**
   * Returns this account's stuck Hinkal shielded balances (UTXOs awaiting recovery).
   *
   * @returns {Promise<StuckUtxoBalance[]>} The stuck balance per token.
   * @throws {Error} If the wallet account has been disposed.
   */
  async stuckUtxoBalances() {
    const hinkal = await this._prepareSession();
    const balances =
      await hinkal.getStuckShieldedBalances(currentSolanaChainId);
    return balances.map(({ token, balance }) => ({
      token: token.erc20TokenAddress,
      balance,
    }));
  }
}
