import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import { NetworkContextForTestSuite } from "../contracts";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import { validAction } from "./tic-tac-toe";
import {
  collateralizeChannel,
  constructTakeActionRpc,
  constructUninstallVirtualRpc,
  createChannel,
  installApp,
  installVirtualApp,
} from "./utils";
import { UPDATE_STATE_EVENT, UNINSTALL_VIRTUAL_EVENT } from "@connext/types";

expect.extend({ toBeLt });

jest.setTimeout(15000);

const { TicTacToeApp } = global["networkContext"] as NetworkContextForTestSuite;

describe("Concurrently taking action on regular app and uninstallling virtual app without issue", () => {
  let multisigAddressAB: string;
  let multisigAddressBC: string;
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  let virtualId: string;
  let appId: string;

  beforeEach(async () => {
    const context: SetupContext = await setup(global, true);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    nodeC = context["C"].node;

    multisigAddressAB = await createChannel(nodeA, nodeB);
    multisigAddressBC = await createChannel(nodeB, nodeC);

    await collateralizeChannel(multisigAddressAB, nodeA, nodeB, parseEther("2"));

    await collateralizeChannel(multisigAddressBC, nodeB, nodeC, parseEther("2"));

    // install a virtual app to uninstall
    virtualId = await installVirtualApp(nodeA, nodeB, nodeC, TicTacToeApp);

    // install regular app to take action
    [appId] = await installApp(nodeA, nodeB, TicTacToeApp);
  });

  it("can handle concurrent uninstall virtual and take action by the same node", async done => {
    let executedActions = 0;

    const incrementAndEnd = () => {
      executedActions += 1;
      if (executedActions === 2) done();
    };

    nodeC.on(UNINSTALL_VIRTUAL_EVENT, () => {
      incrementAndEnd();
    });

    nodeB.on(UPDATE_STATE_EVENT, async () => {
      incrementAndEnd();
    });

    const takeActionReq = (appId: string) => constructTakeActionRpc(appId, validAction);

    const uninstallReq = (appId: string) =>
      constructUninstallVirtualRpc(appId, nodeB.publicIdentifier);
    nodeB.rpcRouter.dispatch(takeActionReq(appId));
    nodeA.rpcRouter.dispatch(uninstallReq(virtualId));
  });
});
