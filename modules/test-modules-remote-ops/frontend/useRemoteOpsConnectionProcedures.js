import { useCallback } from "react";
import {
  connectConnection,
  createWorkspaceActionState,
  importConnectionCredentialFile,
  persistConnectionProfile,
  validateConnection
} from "./remote-ops-workspace-support.js";

export function createConnectionActionState(overrides = {}) {
  return {
    ...createWorkspaceActionState(),
    ...overrides
  };
}

async function persistCurrentConnectionDraft(selection) {
  const result = await persistConnectionProfile({
    connectionId: selection.isCreatingConnection ? null : selection.selectedConnectionId,
    draft: selection.connectionDraft
  });
  if (!result?.ok) {
    throw new Error(result?.error?.message ?? "Failed to save connection profile");
  }
  const connectionId = result.item?.id ?? selection.selectedConnectionId;
  selection.setIsCreatingConnection(false);
  selection.setSelectedConnectionId(connectionId);
  return connectionId;
}

function useSaveConnectionProcedure(selection, reload) {
  return useCallback(async () => {
    selection.setConnectionActionState(createConnectionActionState({ saving: true }));
    try {
      await persistCurrentConnectionDraft(selection);
      await reload();
      selection.setConnectionActionState(
        createConnectionActionState({
          successMessage: selection.isCreatingConnection
            ? "Connection profile created"
            : "Connection profile updated"
        })
      );
    } catch (error) {
      selection.setConnectionActionState(
        createConnectionActionState({
          errorMessage: error?.message ?? "Failed to save connection profile"
        })
      );
    }
  }, [reload, selection]);
}

function useConnectProcedure(selection, reload) {
  return useCallback(async () => {
    selection.setConnectionActionState(createConnectionActionState({ processing: true }));
    try {
      const connectionId = await persistCurrentConnectionDraft(selection);
      const payload = await connectConnection(connectionId, selection.connectionDraft.credentialPathHint);
      await reload();
      selection.setConnectionActionState(
        createConnectionActionState({
          successMessage: payload?.message ?? "Service account key loaded"
        })
      );
    } catch (error) {
      selection.setConnectionActionState(
        createConnectionActionState({
          errorMessage: error?.message ?? "Failed to load the service-account key"
        })
      );
    }
  }, [reload, selection]);
}

function useImportCredentialProcedure(selection, reload) {
  return useCallback(
    async (file) => {
      if (!file) {
        return;
      }
      selection.setConnectionActionState(createConnectionActionState({ processing: true }));
      try {
        const connectionId = await persistCurrentConnectionDraft(selection);
        const fileContent = await file.text();
        const payload = await importConnectionCredentialFile(connectionId, file.name, fileContent);
        await reload();
        selection.setConnectionActionState(
          createConnectionActionState({
            successMessage: payload?.message ?? "Service account key imported"
          })
        );
      } catch (error) {
        selection.setConnectionActionState(
          createConnectionActionState({
            errorMessage: error?.message ?? "Failed to import the service-account key"
          })
        );
      }
    },
    [reload, selection]
  );
}

function useValidateConnectionProcedure(selection, reload) {
  return useCallback(async () => {
    selection.setConnectionActionState(createConnectionActionState({ processing: true }));
    try {
      const connectionId = await persistCurrentConnectionDraft(selection);
      const payload = await validateConnection(connectionId);
      await reload();
      const preparedTargetCount = Object.keys(payload?.productBundle?.targetsByBindingKey ?? {}).length;
      const boundSettingsCount = Array.isArray(payload?.productBundle?.settingBindings)
        ? payload.productBundle.settingBindings.filter((binding) => binding.updated === true).length
        : 0;
      const successMessage =
        preparedTargetCount > 0
          ? `${payload?.message ?? "Connection validated"} Prepared ${preparedTargetCount} standard targets and bound ${boundSettingsCount} module settings.`
          : payload?.message ?? "Connection validated";
      selection.setConnectionActionState(
        createConnectionActionState({
          successMessage
        })
      );
    } catch (error) {
      selection.setConnectionActionState(
        createConnectionActionState({
          errorMessage: error?.message ?? "Connection validation failed"
        })
      );
    }
  }, [reload, selection]);
}

export function useConnectionProcedures(selection, reload) {
  return {
    saveConnection: useSaveConnectionProcedure(selection, reload),
    importSelectedCredentialFile: useImportCredentialProcedure(selection, reload),
    connectSelectedConnection: useConnectProcedure(selection, reload),
    validateSelectedConnection: useValidateConnectionProcedure(selection, reload)
  };
}
