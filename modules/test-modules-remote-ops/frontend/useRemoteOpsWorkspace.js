import { useCallback, useEffect, useMemo, useState } from "react";
import {
  analyzeConnectionCompatibility,
  compareTarget,
  createPendingConnectionValidationSummary,
  createEmptyConnectionDraft,
  createEmptyTargetDraft,
  createTargetConfigForKind,
  createWorkspaceActionState,
  executeTarget,
  loadRemoteOpsSupportData,
  persistTargetProfile,
  provisionConnectionCompatibility,
  restoreTarget,
  seedTargetRemoteExtra,
  validateTarget
} from "./remote-ops-workspace-support.js";
import {
  createConnectionActionState,
  useConnectionProcedures
} from "./useRemoteOpsConnectionProcedures.js";

function useSupportData() {
  const [supportState, setSupportState] = useState({
    loading: true,
    errorMessage: null,
    connections: [],
    targets: [],
    runs: []
  });

  const reload = useCallback(async () => {
    setSupportState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));
    try {
      const next = await loadRemoteOpsSupportData();
      setSupportState({
        loading: false,
        errorMessage: null,
        ...next
      });
    } catch (error) {
      setSupportState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load remote ops data",
        connections: [],
        targets: [],
        runs: []
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    supportState,
    reload
  };
}

function sortRuns(runs = []) {
  return [...runs].sort((left, right) => {
    const leftTime = Date.parse(left.finishedOn ?? left.startedOn ?? 0);
    const rightTime = Date.parse(right.finishedOn ?? right.startedOn ?? 0);
    return rightTime - leftTime;
  });
}

function createTargetActionState(overrides = {}) {
  return {
    ...createWorkspaceActionState(),
    ...overrides
  };
}

function createCompatibilityActionState(overrides = {}) {
  return {
    ...createWorkspaceActionState(),
    ...overrides
  };
}

function createProvisioningActionState(overrides = {}) {
  return {
    ...createWorkspaceActionState(),
    ...overrides
  };
}

function useRemoteOpsSelection(supportState) {
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [isCreatingConnection, setIsCreatingConnection] = useState(true);
  const [isCreatingTarget, setIsCreatingTarget] = useState(false);
  const [connectionDraft, setConnectionDraft] = useState(createEmptyConnectionDraft);
  const [targetDraft, setTargetDraft] = useState(createEmptyTargetDraft);
  const [connectionActionState, setConnectionActionState] = useState(createConnectionActionState);
  const [targetActionState, setTargetActionState] = useState(createTargetActionState);

  useEffect(() => {
    if (isCreatingConnection) {
      return;
    }
    if (selectedConnectionId && supportState.connections.some((item) => item.id === selectedConnectionId)) {
      return;
    }
    setSelectedConnectionId(supportState.connections[0]?.id ?? null);
  }, [isCreatingConnection, selectedConnectionId, supportState.connections]);

  useEffect(() => {
    if (isCreatingTarget) {
      return;
    }
    if (selectedTargetId && supportState.targets.some((item) => item.id === selectedTargetId)) {
      return;
    }
    setSelectedTargetId(supportState.targets[0]?.id ?? null);
  }, [isCreatingTarget, selectedTargetId, supportState.targets]);

  useEffect(() => {
    if (isCreatingConnection) {
      setConnectionDraft(createEmptyConnectionDraft());
      return;
    }
    const selectedConnection = supportState.connections.find((item) => item.id === selectedConnectionId) ?? null;
    setConnectionDraft(
      selectedConnection
        ? { ...createEmptyConnectionDraft(), ...selectedConnection }
        : createEmptyConnectionDraft()
    );
  }, [isCreatingConnection, selectedConnectionId, supportState.connections]);

  useEffect(() => {
    if (isCreatingTarget) {
      setTargetDraft(createEmptyTargetDraft());
      return;
    }
    const selectedTarget = supportState.targets.find((item) => item.id === selectedTargetId) ?? null;
    setTargetDraft(
      selectedTarget
        ? { ...createEmptyTargetDraft(), ...selectedTarget }
        : createEmptyTargetDraft()
    );
  }, [isCreatingTarget, selectedTargetId, supportState.targets]);

  return {
    selectedConnectionId,
    selectedTargetId,
    isCreatingConnection,
    isCreatingTarget,
    connectionDraft,
    targetDraft,
    connectionActionState,
    targetActionState,
    setSelectedConnectionId,
    setSelectedTargetId,
    setIsCreatingConnection,
    setIsCreatingTarget,
    setConnectionDraft,
    setTargetDraft,
    setConnectionActionState,
    setTargetActionState
  };
}

function useRemoteOpsDerivedState({ supportState, selection }) {
  const sortedRuns = useMemo(() => sortRuns(supportState.runs), [supportState.runs]);
  const selectedConnection = useMemo(
    () => supportState.connections.find((item) => item.id === selection.selectedConnectionId) ?? null,
    [selection.selectedConnectionId, supportState.connections]
  );
  const selectedTarget = useMemo(
    () => supportState.targets.find((item) => item.id === selection.selectedTargetId) ?? null,
    [selection.selectedTargetId, supportState.targets]
  );
  const runsForSelectedTarget = useMemo(
    () => sortedRuns.filter((item) => !selection.selectedTargetId || item.targetProfileId === selection.selectedTargetId),
    [selection.selectedTargetId, sortedRuns]
  );
  const summary = useMemo(
    () => ({
      connections: supportState.connections.length,
      targets: supportState.targets.length,
      warnings: supportState.targets.filter((item) => item.targetStatus === "warning").length,
      ready: supportState.targets.filter((item) => item.targetStatus === "validated").length,
      runs: sortedRuns.length
    }),
    [sortedRuns.length, supportState.connections, supportState.targets]
  );

  return {
    sortedRuns,
    selectedConnection,
    selectedTarget,
    runsForSelectedTarget,
    summary
  };
}

async function runTargetProcedureRequest(procedure, targetId) {
  if (procedure === "validate") {
    return validateTarget(targetId);
  }
  if (procedure === "compare") {
    return compareTarget(targetId);
  }
  if (procedure === "execute") {
    return executeTarget(targetId);
  }
  if (procedure === "restore") {
    return restoreTarget(targetId);
  }
  return seedTargetRemoteExtra(targetId);
}

function useTargetProcedures(selection, reload) {
  const saveTarget = useCallback(async () => {
    selection.setTargetActionState(createTargetActionState({ saving: true }));
    try {
      const result = await persistTargetProfile({
        targetId: selection.isCreatingTarget ? null : selection.selectedTargetId,
        draft: selection.targetDraft
      });
      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to save target profile");
      }
      await reload();
      selection.setIsCreatingTarget(false);
      selection.setSelectedTargetId(result.item?.id ?? selection.selectedTargetId);
      selection.setTargetActionState(
        createTargetActionState({
          successMessage: selection.isCreatingTarget ? "Target profile created" : "Target profile updated"
        })
      );
    } catch (error) {
      selection.setTargetActionState(
        createTargetActionState({
          errorMessage: error?.message ?? "Failed to save target profile"
        })
      );
    }
  }, [reload, selection]);

  const runTargetProcedure = useCallback(
    async (procedure) => {
      if (!selection.selectedTargetId) {
        return;
      }
      selection.setTargetActionState(createTargetActionState({ processing: true }));
      try {
        const payload = await runTargetProcedureRequest(procedure, selection.selectedTargetId);
        await reload();
        selection.setTargetActionState(
          createTargetActionState({
            successMessage: payload?.message ?? "Target procedure completed"
          })
        );
      } catch (error) {
        selection.setTargetActionState(
          createTargetActionState({
            errorMessage: error?.message ?? "Target procedure failed"
          })
        );
      }
    },
    [reload, selection]
  );

  return {
    saveTarget,
    validateSelectedTarget() {
      return runTargetProcedure("validate");
    },
    compareSelectedTarget() {
      return runTargetProcedure("compare");
    },
    executeSelectedTarget() {
      return runTargetProcedure("execute");
    },
    restoreSelectedTarget() {
      return runTargetProcedure("restore");
    },
    seedSelectedTargetRemoteExtra() {
      return runTargetProcedure("seed");
    }
  };
}

function createSelectionActions(selection) {
  return {
    startNewConnection() {
      selection.setIsCreatingConnection(true);
      selection.setSelectedConnectionId(null);
      selection.setConnectionDraft(createEmptyConnectionDraft());
      selection.setConnectionActionState(createConnectionActionState());
    },
    startNewTarget() {
      selection.setIsCreatingTarget(true);
      selection.setSelectedTargetId(null);
      selection.setTargetDraft(createEmptyTargetDraft());
      selection.setTargetActionState(createTargetActionState());
    },
    selectConnection(connectionId) {
      selection.setIsCreatingConnection(false);
      selection.setSelectedConnectionId(connectionId);
      selection.setConnectionActionState(createConnectionActionState());
    },
    selectTarget(targetId) {
      selection.setIsCreatingTarget(false);
      selection.setSelectedTargetId(targetId);
      selection.setTargetActionState(createTargetActionState());
    },
    changeConnectionField(fieldId, value) {
      selection.setConnectionDraft((previous) => ({
        ...previous,
        [fieldId]: value,
        connectionStatus: "draft",
        lastValidatedOn: null,
        validationSummary: createPendingConnectionValidationSummary(
          fieldId === "credentialPathHint"
            ? "Credential path changed. Save and load the key again before validating."
            : fieldId === "projectId"
              ? "Project changed. Validate the connection to confirm live access."
              : "Connection details changed. Validate again after updating the setup."
        ),
        ...(fieldId === "credentialPathHint"
          ? {
              lastConnectedOn: null,
              serviceAccountEmail: "",
              serviceAccountKeyId: "",
              credentialLabel: ""
            }
          : {})
      }));
    },
    changeConnectionProject(projectId) {
      selection.setConnectionDraft((previous) => ({
        ...previous,
        projectId,
        projectNumber: "",
        projectDisplayName: "",
        connectionStatus: previous.connectionStatus === "connected" || previous.connectionStatus === "validated"
          ? "connected"
          : "draft",
        lastValidatedOn: null,
        validationSummary: createPendingConnectionValidationSummary(
          projectId
            ? "Project selected. Validate the connection to confirm live access."
            : "Choose a discovered project before validating the connection."
        )
      }));
    },
    changeTargetField(fieldId, value) {
      selection.setTargetDraft((previous) => ({
        ...previous,
        [fieldId]: value,
        ...(fieldId === "targetKind"
          ? {
              config: createTargetConfigForKind(value)
            }
          : {})
      }));
    },
    changeTargetConfigField(fieldId, value) {
      selection.setTargetDraft((previous) => ({
        ...previous,
        config: {
          ...previous.config,
          [fieldId]: value
        }
      }));
    },
    changeTargetPolicyField(fieldId, value) {
      selection.setTargetDraft((previous) => ({
        ...previous,
        policy: {
          ...previous.policy,
          [fieldId]: value
        }
      }));
    }
  };
}

function useRemoteOpsWorkspaceInternal() {
  const { supportState, reload } = useSupportData();
  const selection = useRemoteOpsSelection(supportState);
  const derived = useRemoteOpsDerivedState({
    supportState,
    selection
  });
  const [compatibilityReports, setCompatibilityReports] = useState({});
  const [compatibilityActionState, setCompatibilityActionState] = useState(createCompatibilityActionState);
  const [provisioningActionState, setProvisioningActionState] = useState(createProvisioningActionState);
  const [confirmedSafeguardIds, setConfirmedSafeguardIds] = useState([]);
  const connectionProcedures = useConnectionProcedures(selection, reload);
  const targetProcedures = useTargetProcedures(selection, reload);
  const selectionActions = createSelectionActions(selection);

  const compatibilityReport = selection.selectedConnectionId
    ? compatibilityReports[selection.selectedConnectionId] ?? null
    : null;

  useEffect(() => {
    setProvisioningActionState(createProvisioningActionState());
    setConfirmedSafeguardIds([]);
  }, [selection.selectedConnectionId]);

  const analyzeSelectedConnectionCompatibility = useCallback(async () => {
    if (!selection.selectedConnectionId) {
      return;
    }
    setCompatibilityActionState(createCompatibilityActionState({ processing: true }));
    try {
      const payload = await analyzeConnectionCompatibility(selection.selectedConnectionId);
      setCompatibilityReports((previous) => ({
        ...previous,
        [selection.selectedConnectionId]: payload?.report ?? null
      }));
      await reload();
      setCompatibilityActionState(
        createCompatibilityActionState({
          successMessage: payload?.message ?? "Loaded compatibility analysis."
        })
      );
    } catch (error) {
      setCompatibilityActionState(
        createCompatibilityActionState({
          errorMessage: error?.message ?? "Failed to analyze remote compatibility."
        })
      );
    }
  }, [reload, selection.selectedConnectionId]);

  const toggleProvisioningSafeguard = useCallback((safeguardId) => {
    setConfirmedSafeguardIds((previous) =>
      previous.includes(safeguardId)
        ? previous.filter((item) => item !== safeguardId)
        : [...previous, safeguardId]
    );
  }, []);

  const provisionSelectedConnectionCompatibility = useCallback(async () => {
    if (!selection.selectedConnectionId) {
      return;
    }
    setProvisioningActionState(createProvisioningActionState({ processing: true }));
    try {
      const payload = await provisionConnectionCompatibility(selection.selectedConnectionId, confirmedSafeguardIds);
      setCompatibilityReports((previous) => ({
        ...previous,
        [selection.selectedConnectionId]: payload?.report ?? null
      }));
      await reload();
      setProvisioningActionState(
        createProvisioningActionState({
          successMessage: payload?.message ?? "Provisioned missing remote requirements."
        })
      );
    } catch (error) {
      setProvisioningActionState(
        createProvisioningActionState({
          errorMessage: error?.message ?? "Failed to provision missing remote requirements."
        })
      );
    }
  }, [confirmedSafeguardIds, reload, selection.selectedConnectionId]);

  return {
    loading: supportState.loading,
    errorMessage: supportState.errorMessage,
    connections: supportState.connections,
    targets: supportState.targets,
    runs: derived.sortedRuns,
    runsForSelectedTarget: derived.runsForSelectedTarget,
    summary: derived.summary,
    selectedConnection: derived.selectedConnection,
    selectedTarget: derived.selectedTarget,
    ...selection,
    ...selectionActions,
    ...connectionProcedures,
    ...targetProcedures,
    compatibilityReport,
    compatibilityActionState,
    provisioningActionState,
    confirmedSafeguardIds,
    analyzeSelectedConnectionCompatibility,
    toggleProvisioningSafeguard,
    provisionSelectedConnectionCompatibility,
    reload
  };
}

export function useRemoteOpsWorkspace() {
  return useRemoteOpsWorkspaceInternal();
}
