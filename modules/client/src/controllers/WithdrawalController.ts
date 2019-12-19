import { TransactionResponse } from "ethers/providers";
import { getAddress, bigNumberify } from "ethers/utils";

import { stringify, withdrawalKey } from "../lib";
import { BigNumber, CFCoreTypes, convert, WithdrawalResponse, WithdrawParameters } from "../types";
import { invalidAddress, notLessThanOrEqualTo, validate } from "../validation";

import { AbstractController } from "./AbstractController";

export class WithdrawalController extends AbstractController {
  public async withdraw(params: WithdrawParameters): Promise<WithdrawalResponse> {
    params.assetId = params.assetId ? getAddress(params.assetId) : undefined;
    const myFreeBalanceAddress = this.connext.freeBalanceAddress;

    const { amount, assetId, recipient, userSubmitted } = convert.Withdraw("bignumber", params);
    const freeBalance = await this.connext.getFreeBalance(assetId);
    const preWithdrawalBal = freeBalance[this.connext.freeBalanceAddress];
    validate(
      notLessThanOrEqualTo(amount, preWithdrawalBal),
      invalidAddress(assetId), // check address of asset
    );
    if (recipient) {
      validate(invalidAddress(recipient));
    }

    const preWithdrawBalances = await this.connext.getFreeBalance(assetId);

    this.log.info(
      `\nWithdrawing ${amount} wei from ${this.connext.multisigAddress} to ${recipient}\n`,
    );

    // register listeners
    this.registerListeners();

    let transaction: TransactionResponse | undefined;
    try {
      this.log.info(`Calling this.connext.rescindDepositRights before withdrawal for ${assetId}`);
      await this.connext.rescindDepositRights({ assetId });
      if (!userSubmitted) {
        this.log.info(`Calling ${CFCoreTypes.RpcMethodNames.chan_withdrawCommitment}`);
        const withdrawResponse = await this.connext.withdrawCommitment(amount, assetId, recipient);
        this.log.info(`Withdraw Response: ${stringify(withdrawResponse)}`);
        const minTx: CFCoreTypes.MinimalTransaction = withdrawResponse.transaction;
        // set the withdrawal tx in the store
        await this.connext.channelProvider.send("chan_storeSet", {
          pairs: [
            { path: withdrawalKey(this.connext.publicIdentifier), value: { tx: minTx, retry: 0 } },
          ],
        });

        transaction = await this.node.withdraw(minTx);

        await this.connext.watchForUserWithdrawal();

        this.log.info(`Node Withdraw Response: ${stringify(transaction)}`);
      } else {
        this.log.info(`Calling ${CFCoreTypes.RpcMethodNames.chan_withdraw}`);
        // user submitting the withdrawal
        const withdrawResponse = await this.connext.providerWithdraw(
          assetId,
          new BigNumber(amount),
          recipient,
        );
        this.log.info(`Withdraw Response: ${stringify(withdrawResponse)}`);
        transaction = await this.ethProvider.getTransaction(withdrawResponse.txHash);
      }
      const postWithdrawBalances = await this.connext.getFreeBalance(assetId);

      this.log.info(`Pre-Withdraw Balances: ${stringify(preWithdrawBalances)}`);
      const expectedFreeBal = bigNumberify(preWithdrawBalances[myFreeBalanceAddress]).sub(amount);

      // sanity check the free balance decrease
      if (postWithdrawBalances && !postWithdrawBalances[myFreeBalanceAddress].eq(expectedFreeBal)) {
        this.log.error(`My free balance was not decreased by the expected amount.`);
      }

      this.log.info("Withdrawn!");
    } catch (e) {
      this.log.error(`Failed to withdraw: ${e.stack || e.message}`);
      this.removeListeners();
      throw new Error(e);
    }

    return {
      apps: await this.connext.getAppInstances(this.connext.multisigAddress),
      freeBalance: await this.connext.getFreeBalance(),
      transaction,
    };
  }

  /////////////////////////////////
  ////// PRIVATE METHODS
  ////// Listener callbacks
  private withdrawConfirmedCallback = async (data: any): Promise<void> => {
    this.log.info(`Withdrawal confimed.`);
    this.removeListeners();
  };

  private withdrawFailedCallback = (data: any): void => {
    this.log.warn(`Withdrawal failed with data: ${stringify(data)}`);
    this.removeListeners();
  };

  ////// Listener registration/deregistration
  private registerListeners(): void {
    this.listener.registerCfListener(
      CFCoreTypes.EventNames.WITHDRAWAL_CONFIRMED_EVENT as CFCoreTypes.EventName,
      this.withdrawConfirmedCallback,
    );

    this.listener.registerCfListener(
      CFCoreTypes.EventNames.WITHDRAWAL_FAILED_EVENT as CFCoreTypes.EventName,
      this.withdrawFailedCallback,
    );
  }

  private removeListeners(): void {
    this.listener.removeCfListener(
      CFCoreTypes.EventNames.WITHDRAWAL_CONFIRMED_EVENT as CFCoreTypes.EventName,
      this.withdrawConfirmedCallback,
    );

    this.listener.removeCfListener(
      CFCoreTypes.EventNames.WITHDRAWAL_FAILED_EVENT as CFCoreTypes.EventName,
      this.withdrawFailedCallback,
    );
  }
}
