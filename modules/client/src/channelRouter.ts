import {
  AppActionBigNumber,
  AppStateBigNumber,
  ChannelProviderConfig,
  makeChecksum,
  makeChecksumOrEthAddress,
  RpcConnection,
  RpcType,
} from "@connext/types";
import { Node as NodeTypes } from "@counterfactual/types";
import { BigNumber } from "ethers/utils";
import { RpcParameters } from "rpc-server";

export class ChannelRouter {
  private type: RpcType;
  private connection: RpcConnection;

  private _config: ChannelProviderConfig;

  private _multisigAddress: string | undefined = undefined;

  private _signerAddress: string | undefined = undefined;

  constructor(connection: RpcConnection, config: ChannelProviderConfig) {
    this.type = config.type;
    this.connection = connection;
    this._config = config;
    this._multisigAddress = config.multisigAddress;
    this._signerAddress = config.signerAddress;
  }

  ///////////////////////////////////////////////
  ///// GETTERS / SETTERS
  get config(): ChannelProviderConfig {
    return this._config;
  }

  get multisigAddress(): string | undefined {
    return this._multisigAddress;
  }

  set multisigAddress(multisigAddress: string) {
    this._multisigAddress = multisigAddress;
  }

  get signerAddress(): string | undefined {
    return this._signerAddress;
  }

  set signerAddress(signerAddress: string) {
    this._signerAddress = signerAddress;
  }

  ///////////////////////////////////////////////
  ///// LISTENER METHODS
  public on = (event: string, listener: (...args: any[]) => void): RpcConnection => {
    this.connection.on(event, listener);
    return this.connection;
  };

  public once = (event: string, listener: (...args: any[]) => void): RpcConnection => {
    this.connection.once(event, listener);
    return this.connection;
  };

  ///////////////////////////////////////////////
  ///// PROVIDER METHODS

  public deposit = async (
    amount: BigNumber,
    assetId: string,
    multisigAddress: string,
    notifyCounterparty: boolean = false,
  ): Promise<NodeTypes.DepositResult> => {
    return await this._send(NodeTypes.RpcMethodName.DEPOSIT, {
      amount,
      multisigAddress,
      notifyCounterparty,
      tokenAddress: makeChecksum(assetId),
    } as NodeTypes.DepositParams);
  };

  public getStateChannel = async (): Promise<{ data: any }> => {
    return await this._send("chan_getStateChannel" as any, {
      multisigAddress: this.multisigAddress,
    });
  };

  public getState = async (appInstanceId: string): Promise<NodeTypes.GetStateResult> => {
    return await this._send(NodeTypes.RpcMethodName.GET_STATE, {
      appInstanceId,
    } as NodeTypes.GetStateParams);
  };

  public getAppInstances = async (): Promise<NodeTypes.GetAppInstancesResult> => {
    return await this._send(
      NodeTypes.RpcMethodName.GET_APP_INSTANCES,
      {} as NodeTypes.GetAppInstancesParams,
    );
  };

  public getFreeBalance = async (
    assetId: string,
    multisigAddress: string,
  ): Promise<NodeTypes.GetFreeBalanceStateResult> => {
    return await this._send(NodeTypes.RpcMethodName.GET_FREE_BALANCE_STATE, {
      multisigAddress,
      tokenAddress: makeChecksum(assetId),
    } as NodeTypes.GetFreeBalanceStateParams);
  };

  public getProposedAppInstances = async (): Promise<
    NodeTypes.GetProposedAppInstancesResult | undefined
  > => {
    return await this._send(
      NodeTypes.RpcMethodName.GET_PROPOSED_APP_INSTANCES,
      {} as NodeTypes.GetProposedAppInstancesParams,
    );
  };

  public getProposedAppInstance = async (
    appInstanceId: string,
  ): Promise<NodeTypes.GetProposedAppInstanceResult | undefined> => {
    return await this._send(NodeTypes.RpcMethodName.GET_PROPOSED_APP_INSTANCES, {
      appInstanceId,
    } as NodeTypes.GetProposedAppInstanceParams);
  };

  public getAppInstanceDetails = async (
    appInstanceId: string,
  ): Promise<NodeTypes.GetAppInstanceDetailsResult | undefined> => {
    return await this._send(NodeTypes.RpcMethodName.GET_APP_INSTANCE_DETAILS, {
      appInstanceId,
    } as NodeTypes.GetAppInstanceDetailsParams);
  };

  public getAppState = async (
    appInstanceId: string,
  ): Promise<NodeTypes.GetStateResult | undefined> => {
    return await this._send(NodeTypes.RpcMethodName.GET_STATE, {
      appInstanceId,
    } as NodeTypes.GetStateParams);
  };

  public takeAction = async (
    appInstanceId: string,
    action: AppActionBigNumber,
  ): Promise<NodeTypes.TakeActionResult> => {
    return await this._send(NodeTypes.RpcMethodName.TAKE_ACTION, {
      action,
      appInstanceId,
    } as NodeTypes.TakeActionParams);
  };

  public updateState = async (
    appInstanceId: string,
    newState: AppStateBigNumber | any,
    // cast to any bc no supported apps use
    // the update state method
  ): Promise<NodeTypes.UpdateStateResult> => {
    return await this._send(NodeTypes.RpcMethodName.UPDATE_STATE, {
      appInstanceId,
      newState,
    } as NodeTypes.UpdateStateParams);
  };

  public proposeInstallVirtualApp = async (
    params: NodeTypes.ProposeInstallVirtualParams, // TODO THIS HAS TO CHANGE
  ): Promise<NodeTypes.ProposeInstallVirtualResult> => {
    return await this._send(
      NodeTypes.RpcMethodName.PROPOSE_INSTALL_VIRTUAL,
      params as NodeTypes.ProposeInstallVirtualParams,
    );
  };

  public proposeInstallApp = async (
    params: NodeTypes.ProposeInstallParams, // TODO THIS HAS TO CHANGE
  ): Promise<NodeTypes.ProposeInstallResult> => {
    return await this._send(
      NodeTypes.RpcMethodName.PROPOSE_INSTALL,
      params as NodeTypes.ProposeInstallParams,
    );
  };

  public installVirtualApp = async (
    appInstanceId: string,
    intermediaryIdentifier: string,
  ): Promise<NodeTypes.InstallVirtualResult> => {
    return await this._send(NodeTypes.RpcMethodName.INSTALL_VIRTUAL, {
      appInstanceId,
      intermediaryIdentifier,
    } as NodeTypes.InstallVirtualParams);
  };

  public installApp = async (appInstanceId: string): Promise<NodeTypes.InstallResult> => {
    return await this._send(NodeTypes.RpcMethodName.INSTALL, {
      appInstanceId,
    } as NodeTypes.InstallParams);
  };

  public uninstallApp = async (appInstanceId: string): Promise<NodeTypes.UninstallResult> => {
    return await this._send(NodeTypes.RpcMethodName.UNINSTALL, {
      appInstanceId,
    } as NodeTypes.UninstallParams);
  };

  public uninstallVirtualApp = async (
    appInstanceId: string,
    intermediary: string, // should be string array
  ): Promise<NodeTypes.UninstallVirtualResult> => {
    return await this._send(NodeTypes.RpcMethodName.UNINSTALL_VIRTUAL, {
      appInstanceId,
      intermediaryIdentifier: intermediary,
    } as NodeTypes.UninstallVirtualParams);
  };

  public rejectInstallApp = async (appInstanceId: string): Promise<NodeTypes.UninstallResult> => {
    return await this._send(NodeTypes.RpcMethodName.REJECT_INSTALL, { appInstanceId });
  };

  public withdraw = async (
    amount: BigNumber,
    multisigAddress: string,
    assetId: string, // optional in cf
    recipient: string, // optional in cf
  ): Promise<NodeTypes.WithdrawResult> => {
    return await this._send(NodeTypes.RpcMethodName.WITHDRAW, {
      amount,
      multisigAddress,
      recipient,
      tokenAddress: makeChecksum(assetId),
    } as NodeTypes.WithdrawParams);
  };

  public withdrawCommitment = async (
    amount: BigNumber,
    assetId?: string,
    recipient?: string,
  ): Promise<NodeTypes.WithdrawCommitmentResult> => {
    return await this._send(NodeTypes.RpcMethodName.WITHDRAW_COMMITMENT, {
      amount,
      recipient,
      tokenAddress: makeChecksumOrEthAddress(assetId),
    } as NodeTypes.WithdrawCommitmentParams);
  };

  ///////////////////////////////////////////////
  ///// PRIVATE METHODS

  // tslint:disable-next-line: function-name
  private async _send(
    methodName: NodeTypes.RpcMethodName,
    parameters: RpcParameters,
  ): Promise<any> {
    let result: any;
    switch (this.type) {
      case RpcType.CounterfactualNode:
        const ret = await this.connection.rpcRouter.dispatch({
          id: Date.now(),
          methodName,
          parameters,
        });
        // cf module nests the return value in a `.result.result`
        // should make sure that the channel provider call
        // does not
        result = ret.result.result;
        break;

      case RpcType.ChannelProvider:
        result = await this.connection._send(methodName, parameters);
        break;

      default:
        throw new Error(`Unknown rpc type: ${this.type}`);
    }
    return result;
  }
}
