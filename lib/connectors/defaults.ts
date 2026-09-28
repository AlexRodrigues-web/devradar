import { ArbeitnowConnector } from "./arbeitnowConnector";
import { registerConnectors } from "./registry";
import { RemotiveConnector } from "./remotiveConnector";
import { RemoteOkConnector } from "./remoteOkConnector";
import { WwrRssConnector } from "./wwrRssConnector";
import { AdzunaConnector } from "./adzunaConnector";
import { ManualConnector } from "./manualConnector";

export const defaultConnectors = [RemotiveConnector, ArbeitnowConnector, RemoteOkConnector, WwrRssConnector, AdzunaConnector, ManualConnector];

export function registerDefaultConnectors() {
  return registerConnectors(defaultConnectors);
}
