import { useCallback, useEffect, useMemo, useState } from "react";
import {
  analyzeConnectionCompatibility,
  compareTarget,
  executeTarget,
  loadRemoteOpsSupportData,
  restoreTarget,
  validateTarget
} from "./remote-ops-workspace-support.js";

function createSupportState() {
  return {
    loading: true,
    errorMessage: null,
    connections: [],
    targets: [],
    runs: []
  };
}

function createProcedureState() {
  return {
    processing: false,
    procedureType: "",
    targetId: "",
    errorMessage: null,
    successMessage: null
  };
}

function createCompatibilityState() {
  return {
    processing: false,
    connectionId: "",
    errorMessage: null,
    reportsByConnectionId: {}
  };
}

function useCompatibilityReports() {
  const [compatibilityState, setCompatibilityState] = useState(createCompatibilityState);

  const analyzeConnection = useCallback(async (connectionId) => {
    if (typeof connectionId !== "string" || connectionId.length === 0) {
      return null;
    }
    setCompatibilityState((previous) => ({
      ...previous,
      processing: true,
      connectionId,
      errorMessage: null
    }));
    try {
      const report = await analyzeConnectionCompatibility(connectionId);
      setCompatibilityState((previous) => ({
        ...previous,
        processing: false,
        connectionId,
        errorMessage: null,
        reportsByConnectionId: {
          ...previous.reportsByConnectionId,
          [connectionId]: report
        }
      }));
      return report;
    } catch (error) {
      setCompatibilityState((previous) => ({
        ...previous,
        processing: false,
        connectionId,
        errorMessage: error?.message ?? "Failed to analyze remote compatibility"
      }));
      return null;
    }
  }, []);

  const getCompatibilityReportForConnection = useCallback(
    (connectionId) =>
      typeof connectionId === "string" && connectionId.length > 0
        ? compatibilityState.reportsByConnectionId[connectionId] ?? null
        : null,
    [compatibilityState.reportsByConnectionId]
  );

  return {
    compatibilityState,
    analyzeConnection,
    getCompatibilityReportForConnection
  };
}

function sortTargets(targets) {
  return [...targets].sort((left, right) => {
    const leftTitle = typeof left?.title === "string" ? left.title : "";
    const rightTitle = typeof right?.title === "string" ? right.title : "";
    return leftTitle.localeCompare(rightTitle);
  });
}

function sortRuns(runs) {
  return [...runs].sort((left, right) => {
    const leftTime = Date.parse(left?.finishedOn ?? left?.startedOn ?? "") || 0;
    const rightTime = Date.parse(right?.finishedOn ?? right?.startedOn ?? "") || 0;
    return rightTime - leftTime;
  });
}

function runTargetProcedureRequest(procedureType, targetId) {
  if (procedureType === "validate") {
    return validateTarget(targetId);
  }
  if (procedureType === "compare") {
    return compareTarget(targetId);
  }
  if (procedureType === "execute") {
    return executeTarget(targetId);
  }
  if (procedureType === "restore") {
    return restoreTarget(targetId);
  }
  throw new Error(`Unsupported procedure '${procedureType}'.`);
}

export function resolveRemoteTargetsByKind(targets, targetKind) {
  return sortTargets(
    (Array.isArray(targets) ? targets : []).filter((target) => target?.targetKind === targetKind)
  );
}

export function resolveLatestRemoteRun(runs, targetId) {
  if (typeof targetId !== "string" || targetId.length === 0) {
    return null;
  }
  return sortRuns(Array.isArray(runs) ? runs : []).find((run) => run?.targetProfileId === targetId) ?? null;
}

export function useEmbeddedRemoteOpsSupport() {
  const [supportState, setSupportState] = useState(createSupportState);
  const [procedureState, setProcedureState] = useState(createProcedureState);
  const compatibility = useCompatibilityReports();

  const reload = useCallback(async () => {
    setSupportState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));
    try {
      const nextState = await loadRemoteOpsSupportData();
      setSupportState({
        loading: false,
        errorMessage: null,
        ...nextState
      });
    } catch (error) {
      setSupportState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load remote ops support",
        connections: [],
        targets: [],
        runs: []
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const connectionById = useMemo(
    () => new Map((supportState.connections ?? []).map((connection) => [connection.id, connection])),
    [supportState.connections]
  );

  const runTargetProcedure = useCallback(
    async (targetId, procedureType) => {
      if (typeof targetId !== "string" || targetId.length === 0) {
        return null;
      }
      setProcedureState({
        processing: true,
        procedureType,
        targetId,
        errorMessage: null,
        successMessage: null
      });
      try {
        const payload = await runTargetProcedureRequest(procedureType, targetId);
        await reload();
        setProcedureState({
          processing: false,
          procedureType,
          targetId,
          errorMessage: null,
          successMessage: payload?.message ?? "Remote procedure completed"
        });
        return payload;
      } catch (error) {
        setProcedureState({
          processing: false,
          procedureType,
          targetId,
          errorMessage: error?.message ?? "Remote procedure failed",
          successMessage: null
        });
        return null;
      }
    },
    [reload]
  );

  const getTargetsByKind = useCallback(
    (targetKind) => resolveRemoteTargetsByKind(supportState.targets, targetKind),
    [supportState.targets]
  );

  const getTargetById = useCallback(
    (targetId) =>
      (Array.isArray(supportState.targets)
        ? supportState.targets.find((target) => target?.id === targetId) ?? null
        : null),
    [supportState.targets]
  );

  const getLatestRunForTarget = useCallback(
    (targetId) => resolveLatestRemoteRun(supportState.runs, targetId),
    [supportState.runs]
  );

  return {
    supportState,
    procedureState,
    compatibilityState: compatibility.compatibilityState,
    connectionById,
    reload,
    getTargetsByKind,
    getTargetById,
    getLatestRunForTarget,
    getCompatibilityReportForConnection: compatibility.getCompatibilityReportForConnection,
    analyzeConnection: compatibility.analyzeConnection,
    validateTarget(targetId) {
      return runTargetProcedure(targetId, "validate");
    },
    compareTarget(targetId) {
      return runTargetProcedure(targetId, "compare");
    },
    executeTarget(targetId) {
      return runTargetProcedure(targetId, "execute");
    },
    restoreTarget(targetId) {
      return runTargetProcedure(targetId, "restore");
    }
  };
}
