import { resolveManagedProductBindingKey } from "../../../../modules/test-modules-remote-ops/shared/product-binding-support.mjs";

function sortTargetsByTitle(targets = []) {
  return [...targets].sort((left, right) =>
    `${left?.title ?? ""}`.localeCompare(`${right?.title ?? ""}`)
  );
}

const REQUIRED_REMOTE_SERVICES = Object.freeze([
  {
    key: "published-blog-posts",
    label: "posts projection",
    resolveCount: (health) => Number(health.usableProjectionScopes["published-blog-posts"] ?? 0)
  },
  {
    key: "public-blog-categories",
    label: "categories projection",
    resolveCount: (health) => Number(health.usableProjectionScopes["public-blog-categories"] ?? 0)
  },
  {
    key: "public-blog-tags",
    label: "tags projection",
    resolveCount: (health) => Number(health.usableProjectionScopes["public-blog-tags"] ?? 0)
  },
  {
    key: "deployment-storage",
    label: "HTML deployment",
    resolveCount: (health) => Number(health.usableTargetsByKind["deployment-storage"] ?? 0)
  },
  {
    key: "media-storage",
    label: "media sync",
    resolveCount: (health) => Number(health.usableTargetsByKind["media-storage"] ?? 0)
  },
  {
    key: "browser-delivery",
    label: "browser delivery",
    resolveCount: (health) => Number(health.usableTargetsByKind["browser-delivery"] ?? 0)
  }
]);

export function isValidatedConnection(connection) {
  return (
    connection?.connectionStatus === "validated" ||
    connection?.validationSummary?.state === "validated"
  );
}

export function isValidatedTarget(target) {
  return (
    target?.targetStatus === "validated" ||
    target?.validationSummary?.state === "validated"
  );
}

export function resolveTargetBindingState(targetId, targets = [], connectionById = new Map()) {
  if (typeof targetId !== "string" || targetId.length === 0) {
    return {
      state: "missing",
      target: null,
      connection: null,
      message: "Not configured."
    };
  }

  const target = (Array.isArray(targets) ? targets : []).find((item) => item?.id === targetId) ?? null;
  if (!target) {
    return {
      state: "missing",
      target: null,
      connection: null,
      message: "Selected target no longer exists."
    };
  }

  const connection =
    typeof target?.connectionProfileId === "string" && target.connectionProfileId.length > 0
      ? connectionById.get(target.connectionProfileId) ?? null
      : null;

  if (!connection) {
    return {
      state: "blocked",
      target,
      connection: null,
      message: "Selected target is missing its connection profile."
    };
  }

  if (!isValidatedConnection(connection)) {
    return {
      state: "blocked",
      target,
      connection,
      message: "Selected target is bound to a connection that is not validated."
    };
  }

  if (!isValidatedTarget(target)) {
    return {
      state: "blocked",
      target,
      connection,
      message: "Selected target is not validated yet."
    };
  }

  return {
    state: "ready",
    target,
    connection,
    message: "Validated target is ready."
  };
}

export function resolveSelectableTargets(
  targets = [],
  selectedTargetId = "",
  connectionById = new Map(),
  allTargets = targets
) {
  const usableTargets = sortTargetsByTitle(
    (Array.isArray(targets) ? targets : []).filter(
      (target) => resolveTargetBindingState(target?.id ?? "", allTargets, connectionById).state === "ready"
    )
  );
  const selectedTarget =
    typeof selectedTargetId === "string" && selectedTargetId.length > 0
      ? (Array.isArray(allTargets) ? allTargets : []).find((target) => target?.id === selectedTargetId) ?? null
      : null;

  if (!selectedTarget || usableTargets.some((target) => target.id === selectedTarget.id)) {
    return usableTargets.map((target) => ({
      ...target,
      optionLabel: target?.title ?? target?.profileName ?? target?.id
    }));
  }

  const selectedState = resolveTargetBindingState(selectedTarget.id, allTargets, connectionById);
  return [
    ...usableTargets.map((target) => ({
      ...target,
      optionLabel: target?.title ?? target?.profileName ?? target?.id
    })),
    {
      ...selectedTarget,
      optionLabel: `${selectedTarget?.title ?? selectedTarget?.id} (${selectedState.message})`
    }
  ];
}

function countUsableTargetsByKind(targets, connectionById) {
  return (Array.isArray(targets) ? targets : []).reduce(
    (totals, target) => {
      if (resolveTargetBindingState(target?.id ?? "", targets, connectionById).state !== "ready") {
        return totals;
      }
      const targetKind = typeof target?.targetKind === "string" ? target.targetKind : "";
      return {
        ...totals,
        [targetKind]: Number(totals[targetKind] ?? 0) + 1
      };
    },
    {}
  );
}

function countUsableProjectionScopes(targets, connectionById) {
  return (Array.isArray(targets) ? targets : []).reduce((totals, target) => {
    if (target?.targetKind !== "firestore-projection") {
      return totals;
    }
    if (resolveTargetBindingState(target?.id ?? "", targets, connectionById).state !== "ready") {
      return totals;
    }
    const projectionScope =
      typeof target?.config?.projectionScope === "string" ? target.config.projectionScope : "";
    if (!projectionScope) {
      return totals;
    }
    return {
      ...totals,
      [projectionScope]: Number(totals[projectionScope] ?? 0) + 1
    };
  }, {});
}

function countUsableTargetsByBindingKey(targets, connectionById) {
  return (Array.isArray(targets) ? targets : []).reduce((totals, target) => {
    if (resolveTargetBindingState(target?.id ?? "", targets, connectionById).state !== "ready") {
      return totals;
    }
    const bindingKey = resolveManagedProductBindingKey(target);
    if (!bindingKey) {
      return totals;
    }
    return {
      ...totals,
      [bindingKey]: Number(totals[bindingKey] ?? 0) + 1
    };
  }, {});
}

function createRemoteHealthMessage(validatedConnectionCount, health) {
  if (validatedConnectionCount === 0) {
    return "Validate at least one remote connection in Remotes to unlock remote-dependent product settings.";
  }

  const missingKinds = REQUIRED_REMOTE_SERVICES.filter((service) => service.resolveCount(health) === 0).map(
    (service) => service.label
  );

  if (missingKinds.length === 0) {
    return "Validated remote connections and standard product services are ready.";
  }

  return `Validated remote connections exist, but these services still need validated targets: ${missingKinds.join(
    ", "
  )}.`;
}

export function createProductRemoteHealth(supportState) {
  const connections = Array.isArray(supportState?.connections) ? supportState.connections : [];
  const targets = Array.isArray(supportState?.targets) ? supportState.targets : [];
  const connectionById = new Map(connections.map((connection) => [connection.id, connection]));
  const validatedConnections = connections.filter(isValidatedConnection);
  const usableTargetsByKind = countUsableTargetsByKind(targets, connectionById);
  const usableProjectionScopes = countUsableProjectionScopes(targets, connectionById);
  const usableTargetsByBindingKey = countUsableTargetsByBindingKey(targets, connectionById);
  const usableTargetCount = Object.values(usableTargetsByKind).reduce(
    (total, count) => total + Number(count ?? 0),
    0
  );
  const health = {
    totalConnectionCount: connections.length,
    validatedConnectionCount: validatedConnections.length,
    hasValidatedConnection: validatedConnections.length > 0,
    totalTargetCount: targets.length,
    usableTargetCount,
    usableTargetsByKind,
    usableProjectionScopes,
    usableTargetsByBindingKey,
    connectionById
  };

  return {
    ...health,
    message: createRemoteHealthMessage(validatedConnections.length, health)
  };
}
