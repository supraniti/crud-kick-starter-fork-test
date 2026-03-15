import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readReferenceModuleSettings,
  updateReferenceModuleSettings
} from "../../api/reference.js";
import { useEmbeddedRemoteOpsSupport } from "../../../../modules/test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";
import {
  createProductRemoteHealth,
  resolveSelectableTargets,
  resolveTargetBindingState
} from "./product-remote-health.js";

const MODULE_IDS = Object.freeze({
  posts: "test-modules-content",
  taxonomies: "test-modules-taxonomy",
  pages: "test-modules-pages",
  media: "test-modules-media-manager"
});

function createDefaultState() {
  return {
    loading: true,
    errorMessage: null,
    modules: {},
    savingByModuleId: {},
    successByModuleId: {}
  };
}

function createSuccessState(modules) {
  return {
    loading: false,
    errorMessage: null,
    modules,
    savingByModuleId: {},
    successByModuleId: {}
  };
}

function createFailureState(message) {
  return {
    loading: false,
    errorMessage: message,
    modules: {},
    savingByModuleId: {},
    successByModuleId: {}
  };
}

async function readSettingsModule(moduleId) {
  const payload = await readReferenceModuleSettings({ moduleId });
  if (!payload?.ok) {
    throw new Error(payload?.error?.message ?? `Failed to load settings for '${moduleId}'`);
  }
  return {
    schema: payload?.settings?.schema ?? { fields: [] },
    values:
      payload?.settings?.values && typeof payload.settings.values === "object"
        ? payload.settings.values
        : {},
    draftValues:
      payload?.settings?.values && typeof payload.settings.values === "object"
        ? { ...payload.settings.values }
        : {}
  };
}

async function loadSettingsState() {
  const [posts, taxonomies, pages, media] = await Promise.all([
    readSettingsModule(MODULE_IDS.posts),
    readSettingsModule(MODULE_IDS.taxonomies),
    readSettingsModule(MODULE_IDS.pages),
    readSettingsModule(MODULE_IDS.media)
  ]);

  return {
    [MODULE_IDS.posts]: posts,
    [MODULE_IDS.taxonomies]: taxonomies,
    [MODULE_IDS.pages]: pages,
    [MODULE_IDS.media]: media
  };
}

function buildDraftFieldChange(previous, moduleId, fieldId, value) {
  return {
    ...previous,
    modules: {
      ...previous.modules,
      [moduleId]: {
        ...(previous.modules[moduleId] ?? {}),
        draftValues: {
          ...(previous.modules[moduleId]?.draftValues ?? {}),
          [fieldId]: value
        }
      }
    },
    successByModuleId: {
      ...previous.successByModuleId,
      [moduleId]: ""
    }
  };
}

function useSettingsTargets(remoteOpsSupport) {
  const projectionTargets = remoteOpsSupport.getTargetsByKind("firestore-projection");
  const selectProjectionTargets = (projectionScope) =>
    projectionTargets.filter((target) => target?.config?.projectionScope === projectionScope);
  return {
    postProjectionTargets: selectProjectionTargets("published-blog-posts"),
    categoryProjectionTargets: selectProjectionTargets("public-blog-categories"),
    tagProjectionTargets: selectProjectionTargets("public-blog-tags"),
    deploymentTargets: remoteOpsSupport.getTargetsByKind("deployment-storage"),
    browserTargets: remoteOpsSupport.getTargetsByKind("browser-delivery"),
    mediaTargets: remoteOpsSupport.getTargetsByKind("media-storage")
  };
}

function useSettingsModules(modulesState) {
  return useMemo(
    () => ({
      posts: modulesState[MODULE_IDS.posts] ?? null,
      taxonomies: modulesState[MODULE_IDS.taxonomies] ?? null,
      pages: modulesState[MODULE_IDS.pages] ?? null,
      media: modulesState[MODULE_IDS.media] ?? null
    }),
    [modulesState]
  );
}

function createTargetFieldState(targets, selectedTargetId, remoteHealth, allTargets = targets) {
  const selectedTarget =
    typeof selectedTargetId === "string" && selectedTargetId.length > 0
      ? (Array.isArray(allTargets) ? allTargets : []).find((target) => target?.id === selectedTargetId) ?? null
      : null;
  const scopeMismatch = Boolean(selectedTarget) && !(Array.isArray(targets) ? targets : []).some(
    (target) => target?.id === selectedTargetId
  );
  const options = resolveSelectableTargets(
    targets,
    selectedTargetId,
    remoteHealth.connectionById,
    allTargets
  );
  const selection = resolveTargetBindingState(selectedTargetId, allTargets, remoteHealth.connectionById);
  const disabled = !remoteHealth.hasValidatedConnection && !selectedTargetId;
  const helperText =
    scopeMismatch
      ? "The selected target exists, but it does not match this product setting."
      : selection.state === "blocked"
      ? selection.message
      : selection.state === "missing" && disabled
        ? "Validate a remote connection in Remotes to unlock this selector."
        : options.length === 0
          ? "No validated targets of this kind are available yet."
          : "";

  return {
    options,
    selection,
    disabled,
    helperText
  };
}

function useRemoteTargetFields({
  postProjectionTargets,
  categoryProjectionTargets,
  tagProjectionTargets,
  deploymentTargets,
  browserTargets,
  mediaTargets,
  modules,
  remoteHealth,
  allTargets
}) {
  return useMemo(
    () => ({
      postsProjection: createTargetFieldState(
        postProjectionTargets,
        modules.posts?.draftValues?.remoteProjectionTargetProfileId ?? "",
        remoteHealth,
        allTargets
      ),
      categoriesProjection: createTargetFieldState(
        categoryProjectionTargets,
        modules.taxonomies?.draftValues?.remoteCategoriesProjectionTargetProfileId ?? "",
        remoteHealth,
        allTargets
      ),
      tagsProjection: createTargetFieldState(
        tagProjectionTargets,
        modules.taxonomies?.draftValues?.remoteTagsProjectionTargetProfileId ?? "",
        remoteHealth,
        allTargets
      ),
      deployment: createTargetFieldState(
        deploymentTargets,
        modules.pages?.draftValues?.remoteDeploymentTargetProfileId ?? "",
        remoteHealth,
        allTargets
      ),
      browser: createTargetFieldState(
        browserTargets,
        modules.pages?.draftValues?.remoteBrowserDeliveryTargetProfileId ?? "",
        remoteHealth,
        allTargets
      ),
      media: createTargetFieldState(
        mediaTargets,
        modules.media?.draftValues?.remoteMediaTargetProfileId ?? "",
        remoteHealth,
        allTargets
      )
    }),
    [
      allTargets,
      browserTargets,
      categoryProjectionTargets,
      deploymentTargets,
      mediaTargets,
      modules.media,
      modules.pages,
      modules.posts,
      modules.taxonomies,
      postProjectionTargets,
      remoteHealth,
      tagProjectionTargets
    ]
  );
}

function useRemoteSettingsState(remoteOpsSupport, modulesState) {
  const {
    postProjectionTargets,
    categoryProjectionTargets,
    tagProjectionTargets,
    deploymentTargets,
    browserTargets,
    mediaTargets
  } = useSettingsTargets(remoteOpsSupport);
  const modules = useSettingsModules(modulesState);
  const remoteHealth = useMemo(
    () => createProductRemoteHealth(remoteOpsSupport.supportState),
    [remoteOpsSupport.supportState]
  );
  const targetFields = useRemoteTargetFields({
    postProjectionTargets,
    categoryProjectionTargets,
    tagProjectionTargets,
    deploymentTargets,
    browserTargets,
    mediaTargets,
    modules,
    remoteHealth,
    allTargets: remoteOpsSupport.supportState.targets
  });

  return {
    postProjectionTargets,
    categoryProjectionTargets,
    tagProjectionTargets,
    deploymentTargets,
    browserTargets,
    mediaTargets,
    modules,
    remoteHealth,
    targetFields
  };
}

export function useProductSystemSettingsWorkspace() {
  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const [state, setState] = useState(createDefaultState);

  const reload = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));
    try {
      const modules = await loadSettingsState();
      setState(createSuccessState(modules));
    } catch (error) {
      setState(createFailureState(error?.message ?? "Failed to load system settings"));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const changeField = useCallback((moduleId, fieldId, value) => {
    setState((previous) => buildDraftFieldChange(previous, moduleId, fieldId, value));
  }, []);

  const saveModule = useCallback(async (moduleId) => {
    const draftValues = state.modules[moduleId]?.draftValues ?? {};
    setState((previous) => ({
      ...previous,
      savingByModuleId: {
        ...previous.savingByModuleId,
        [moduleId]: true
      },
      successByModuleId: {
        ...previous.successByModuleId,
        [moduleId]: ""
      },
      errorMessage: null
    }));

    try {
      const payload = await updateReferenceModuleSettings({
        moduleId,
        settings: draftValues
      });
      if (!payload?.ok) {
        throw new Error(payload?.error?.message ?? `Failed to save settings for '${moduleId}'`);
      }
      const values =
        payload?.settings?.values && typeof payload.settings.values === "object"
          ? payload.settings.values
          : {};
      setState((previous) => ({
        ...previous,
        modules: {
          ...previous.modules,
          [moduleId]: {
            ...(previous.modules[moduleId] ?? {}),
            schema: payload?.settings?.schema ?? { fields: [] },
            values,
            draftValues: { ...values }
          }
        },
        savingByModuleId: {
          ...previous.savingByModuleId,
          [moduleId]: false
        },
        successByModuleId: {
          ...previous.successByModuleId,
          [moduleId]: "Saved"
        }
      }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        savingByModuleId: {
          ...previous.savingByModuleId,
          [moduleId]: false
        },
        errorMessage: error?.message ?? "Failed to save system settings"
      }));
    }
  }, [state.modules]);

  const {
    postProjectionTargets,
    categoryProjectionTargets,
    tagProjectionTargets,
    deploymentTargets,
    browserTargets,
    mediaTargets,
    modules,
    remoteHealth,
    targetFields
  } = useRemoteSettingsState(remoteOpsSupport, state.modules);

  return {
    loading: state.loading,
    errorMessage: state.errorMessage,
    modules,
    savingByModuleId: state.savingByModuleId,
    successByModuleId: state.successByModuleId,
    postProjectionTargets,
    categoryProjectionTargets,
    tagProjectionTargets,
    deploymentTargets,
    browserTargets,
    mediaTargets,
    remoteHealth,
    targetFields,
    remoteLoading: remoteOpsSupport.supportState.loading,
    remoteErrorMessage: remoteOpsSupport.supportState.errorMessage,
    changeField,
    saveModule,
    reload,
    reloadRemotes: remoteOpsSupport.reload
  };
}
