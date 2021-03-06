import { Interface } from "ethers/utils";

import { ConditionalTransactionDelegateTarget } from "../contracts";
import { AppIdentity, MultisigOperation, MultisigTransaction, NetworkContext } from "../types";

import { MultisigCommitment } from "./multisig-commitment";
import { appIdentityToHash } from "./utils/app-identity";

const iface = new Interface(ConditionalTransactionDelegateTarget.abi);

export class SetupCommitment extends MultisigCommitment {
  public constructor(
    public readonly networkContext: NetworkContext,
    public readonly multisigAddress: string,
    public readonly multisigOwners: string[],
    public readonly freeBalanceAppIdentity: AppIdentity,
  ) {
    super(multisigAddress, multisigOwners);
  }

  public getTransactionDetails(): MultisigTransaction {
    return {
      data: iface.functions.executeEffectOfFreeBalance.encode([
        this.networkContext.ChallengeRegistry,
        appIdentityToHash(this.freeBalanceAppIdentity),
        this.networkContext.MultiAssetMultiPartyCoinTransferInterpreter,
      ]),
      operation: MultisigOperation.DelegateCall,
      to: this.networkContext.ConditionalTransactionDelegateTarget,
      value: 0,
    };
  }
}
