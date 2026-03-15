import { Alert, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  DeploymentInstancesPanel,
  DeliveryPreviewPanel,
  DistributionFilters,
  DistributionQueue,
  ReadinessPanel,
  RedirectEditorPanel,
  RedirectFilters,
  RedirectList,
  SummaryCard
} from "./BlogDistributionPanels.jsx";
import {
  PagesBrowserDeliveryPanel,
  PagesRemoteDeploymentPanel,
  PagesRemoteSettingsPanel
} from "./BlogDistributionRemotePanels.jsx";
import { useBlogDistributionWorkspace } from "./useBlogDistributionWorkspace.js";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";

const REDIRECTS_COLLECTION_ID = "blog-redirect-rules";

function Hero({ activeModuleLabel }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        background: "linear-gradient(135deg, #111827 0%, #1d4ed8 100%)",
        color: "common.white"
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.75)" }}>
          {activeModuleLabel}
        </Typography>
        <Typography variant="h4">Pages Desk</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Build single pages and reusable page templates, bind them to approved content sources,
          and inspect the delivery JSON that downstream renderers will consume.
        </Typography>
      </Stack>
    </Paper>
  );
}

function SummaryGrid({ summary }) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" } }}
    >
      <SummaryCard label="Published Pages" value={summary.published} />
      <SummaryCard label="Synced Outputs" value={summary.syncedOutputs} />
      <SummaryCard label="Stale Outputs" value={summary.staleOutputs} tone="attention" />
      <SummaryCard label="Missing Outputs" value={summary.missingOutputs} tone="attention" />
      <SummaryCard label="Active Redirects" value={summary.activeRedirects} />
    </Stack>
  );
}

function OverviewTab({ workspace }) {
  return (
    <Stack spacing={2}>
      <DistributionFilters
        filters={workspace.pageFilters}
        onChangeFilters={(fieldId, value) =>
          workspace.setPageFilters((previous) => ({
            ...previous,
            [fieldId]: value
          }))
        }
        onClear={() =>
          workspace.setPageFilters({
            search: "",
            status: "",
            pageKind: "",
            primarySourceType: "",
            readiness: ""
          })
        }
      />

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", xl: 360 }, flexShrink: 0 }}>
          <DistributionQueue
            pages={workspace.filteredPages}
            selectedPageId={workspace.selectedPageId}
            sourceOptionsByType={workspace.sourceOptionsByType}
            readinessMap={workspace.readinessMap}
            onSelectPage={workspace.selectPage}
            onCreatePage={workspace.startNewPage}
          />
        </Stack>
        <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
          <ReadinessPanel workspace={workspace} />
          <PagesRemoteSettingsPanel
            appMountTagName={workspace.moduleSettingsDomain?.moduleSettingsState?.draftValues?.appMountTagName ?? ""}
            deploymentTargets={workspace.remoteDeploymentTargets}
            browserTargets={workspace.remoteBrowserTargets}
            onChangeField={workspace.moduleSettingsDomain?.handleSettingsFieldChange ?? (() => {})}
            onSave={workspace.saveModuleSettings}
            saveDisabled={!workspace.moduleSettingsDomain}
            settingsState={workspace.moduleSettingsDomain?.moduleSettingsState}
          />
          <PagesRemoteDeploymentPanel
            latestRun={workspace.remoteDeploymentLatestRun}
            onCompare={workspace.compareRemoteDeployment}
            onExecute={workspace.executeRemoteDeployment}
            onOpenRemoteOps={workspace.openRemoteDeploymentTarget}
            onValidate={workspace.validateRemoteDeployment}
            page={workspace.selectedPage}
            procedureState={workspace.remoteOpsSupport.procedureState}
            selectedTarget={workspace.remoteDeploymentTarget}
            bindingSourceLabel={workspace.remoteDeploymentBindingSourceLabel}
          />
          <PagesBrowserDeliveryPanel
            latestRun={workspace.remoteBrowserLatestRun}
            onOpenRemoteOps={workspace.openRemoteBrowserTarget}
            onValidate={workspace.validateRemoteBrowserTarget}
            procedureState={workspace.remoteOpsSupport.procedureState}
            selectedTarget={workspace.remoteBrowserTarget}
            bindingSourceLabel={workspace.remoteBrowserBindingSourceLabel}
          />
          <DeploymentInstancesPanel workspace={workspace} />
          <DeliveryPreviewPanel workspace={workspace} />
        </Stack>
      </Stack>
    </Stack>
  );
}

function RedirectsTab({ workspace }) {
  return (
    <Stack spacing={2}>
      <RedirectFilters
        filters={workspace.redirectFilters}
        pages={workspace.pages}
        onChangeFilters={(fieldId, value) =>
          workspace.setRedirectFilters((previous) => ({
            ...previous,
            [fieldId]: value
          }))
        }
        onClear={() =>
          workspace.setRedirectFilters({
            search: "",
            status: "",
            httpCode: "",
            targetPageId: ""
          })
        }
      />

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", xl: 360 }, flexShrink: 0 }}>
          <RedirectList
            redirects={workspace.filteredRedirects}
            pageById={workspace.pageById}
            selectedRedirectId={workspace.selectedRedirectId}
            onSelectRedirect={workspace.selectRedirect}
            onCreateRedirect={workspace.startNewRedirect}
          />
        </Stack>
        <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
          <RedirectEditorPanel workspace={workspace} />
        </Stack>
      </Stack>
    </Stack>
  );
}

export function BlogDistributionView({
  activeModuleLabel,
  collectionsDomain,
  moduleSettingsDomain = null,
  navigate = null,
  route = {}
}) {
  const [tab, setTab] = useState("overview");
  const workspace = useBlogDistributionWorkspace({
    collectionsDomain
  });
  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const routePageId = typeof route?.pageId === "string" ? route.pageId : "";

  useEffect(() => {
    if (
      workspace.isCreatingNewPage
      || routePageId.length === 0
      || routePageId === workspace.selectedPageId
    ) {
      return;
    }
    if (!workspace.pages.some((page) => page.id === routePageId)) {
      return;
    }
    workspace.selectPage(routePageId);
  }, [
    routePageId,
    workspace.isCreatingNewPage,
    workspace.pages,
    workspace.selectPage,
    workspace.selectedPageId
  ]);

  useEffect(() => {
    if (typeof navigate !== "function") {
      return;
    }
    const nextPageId = workspace.isCreatingNewPage ? "" : workspace.selectedPageId ?? "";
    if (routePageId === nextPageId) {
      return;
    }
    navigate(
      {
        ...route,
        pageId: nextPageId
      },
      { replace: true }
    );
  }, [navigate, route, routePageId, workspace.isCreatingNewPage, workspace.selectedPageId]);

  const openLayoutBuilder = useCallback(() => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate(
      {
        moduleId: "test-modules-layouts",
        layoutId: workspace.pageDraft.layoutId,
        returnModuleId: "test-modules-pages",
        returnPageId: workspace.selectedPageId ?? "",
        returnTab: "overview"
      },
      { replace: false }
    );
  }, [navigate, workspace.pageDraft.layoutId, workspace.selectedPageId]);

  const saveModuleSettings = useCallback(async () => {
    if (!moduleSettingsDomain || typeof moduleSettingsDomain.handleSaveModuleSettings !== "function") {
      return;
    }
    await moduleSettingsDomain.handleSaveModuleSettings();
    await workspace.reloadSupportData();
  }, [moduleSettingsDomain, workspace]);

  const remoteDeploymentTargetId =
    workspace.selectedPage?.remoteDeploymentTargetProfileId
    || moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteDeploymentTargetProfileId
    || "";
  const remoteBrowserTargetId =
    workspace.selectedPage?.remoteBrowserDeliveryTargetProfileId
    || moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteBrowserDeliveryTargetProfileId
    || "";
  const remoteDeploymentTargets = remoteOpsSupport.getTargetsByKind("deployment-storage");
  const remoteBrowserTargets = remoteOpsSupport.getTargetsByKind("browser-delivery");
  const remoteDeploymentTarget = remoteOpsSupport.getTargetById(remoteDeploymentTargetId);
  const remoteBrowserTarget = remoteOpsSupport.getTargetById(remoteBrowserTargetId);
  const remoteDeploymentLatestRun = remoteOpsSupport.getLatestRunForTarget(remoteDeploymentTargetId);
  const remoteBrowserLatestRun = remoteOpsSupport.getLatestRunForTarget(remoteBrowserTargetId);
  const remoteDeploymentBindingSourceLabel = workspace.selectedPage?.remoteDeploymentTargetProfileId
    ? "Selected page override"
    : "Pages module default";
  const remoteBrowserBindingSourceLabel = workspace.selectedPage?.remoteBrowserDeliveryTargetProfileId
    ? "Selected page override"
    : "Pages module default";

  const openRemoteTarget = useCallback(
    (targetId) => {
      if (typeof navigate !== "function") {
        return;
      }
      navigate(
        {
          moduleId: "test-modules-remote-ops",
          tab: "targets",
          targetId: targetId || ""
        },
        { replace: false }
      );
    },
    [navigate]
  );

  const openRemoteDeploymentTarget = useCallback(() => {
    openRemoteTarget(remoteDeploymentTargetId);
  }, [openRemoteTarget, remoteDeploymentTargetId]);

  const openRemoteBrowserTarget = useCallback(() => {
    openRemoteTarget(remoteBrowserTargetId);
  }, [openRemoteTarget, remoteBrowserTargetId]);

  const viewWorkspace = {
    ...workspace,
    moduleSettingsDomain,
    openLayoutBuilder,
    saveModuleSettings,
    remoteOpsSupport,
    remoteDeploymentTargets,
    remoteBrowserTargets,
    remoteDeploymentTarget,
    remoteBrowserTarget,
    remoteDeploymentLatestRun,
    remoteBrowserLatestRun,
    remoteDeploymentBindingSourceLabel,
    remoteBrowserBindingSourceLabel,
    openRemoteDeploymentTarget,
    openRemoteBrowserTarget,
    validateRemoteDeployment: () => remoteOpsSupport.validateTarget(remoteDeploymentTargetId),
    compareRemoteDeployment: () => remoteOpsSupport.compareTarget(remoteDeploymentTargetId),
    executeRemoteDeployment: () => remoteOpsSupport.executeTarget(remoteDeploymentTargetId),
    validateRemoteBrowserTarget: () => remoteOpsSupport.validateTarget(remoteBrowserTargetId)
  };

  if (
    !collectionsDomain.isActiveCollectionAvailable &&
    collectionsDomain.activeCollectionId === REDIRECTS_COLLECTION_ID
  ) {
    return <Alert severity="warning">{collectionsDomain.activeCollectionUnavailableMessage}</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Hero activeModuleLabel={activeModuleLabel} />
      <SummaryGrid summary={workspace.summary} />
      <Paper variant="outlined" sx={{ px: 2 }}>
        <Tabs value={tab} onChange={(_, nextValue) => setTab(nextValue)}>
          <Tab value="overview" label="Pages Overview" />
          <Tab value="redirects" label="Redirect Manager" />
        </Tabs>
      </Paper>
      {tab === "overview" ? <OverviewTab workspace={viewWorkspace} /> : null}
      {tab === "redirects" ? <RedirectsTab workspace={viewWorkspace} /> : null}
    </Stack>
  );
}
