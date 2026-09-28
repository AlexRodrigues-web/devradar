import type { ConnectorName, JobConnector } from "./types";

const connectorRegistry = new Map<ConnectorName, JobConnector>();

export function registerConnector(connector: JobConnector) {
  connectorRegistry.set(connector.name, connector);
  return connector;
}

export function registerConnectors(connectors: JobConnector[]) {
  for (const connector of connectors) {
    registerConnector(connector);
  }

  return listConnectors();
}

export function getConnector(name: ConnectorName) {
  return connectorRegistry.get(name) ?? null;
}

export function listConnectors() {
  return Array.from(connectorRegistry.values());
}

export function getEnabledConnectors(selectedSources?: string[]) {
  const selected = new Set((selectedSources ?? []).map((source) => source.trim()).filter(Boolean));

  return listConnectors().filter((connector) => {
    if (!connector.enabled) {
      return false;
    }

    return selected.size === 0 || selected.has(connector.name);
  });
}

export function clearConnectorRegistryForTests() {
  connectorRegistry.clear();
}
