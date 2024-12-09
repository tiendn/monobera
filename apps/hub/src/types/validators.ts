import { type ActiveIncentive, type CuttingBoardWeight } from "@bera/berajs";

export interface ActiveIncentiveWithVault extends ActiveIncentive {
  // TODO: this should be required
  cuttingBoard?: CuttingBoardWeight;
}
