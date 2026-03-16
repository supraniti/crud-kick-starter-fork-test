import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  DeploymentInstancesPanel,
  DeliveryPreviewPanel,
  DistributionFilters,
  OutputForecastPanel,
  DistributionQueue,
  ReadinessPanel,
  RedirectEditorPanel,
  RedirectFilters,
  RedirectList,
  SummaryCard
} from "./BlogDistributionPanels.jsx";
import { RuntimeContractPanel } from "./BlogDistributionRuntimeContractPanel.jsx";
import {
  PagesBrowserDeliveryPanel,
  PagesRemoteDeploymentPanel,
  PagesRemoteSettingsPanel
} from "./BlogDistributionRemotePanels.jsx";
import { useBlogDistributionWorkspace } from "./useBlogDistributionWorkspace.js";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";
import { DeskSplitLayout } from "../../../frontend/src/ui/DeskSplitLayout.jsx";
import { DeskTabsCard } from "../../../frontend/src/ui/DeskTabsCard.jsx";

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
          Create standalone pages and reusable templates, preview what they will publish, and keep delivery operations secondary until you are ready to release.
        </Typography>
      </Stack>
    </Paper>
  );
}

function SecondaryOverviewSection({ collapsedLabel, expandedLabel, title, description, children }) {
  const [open, setOpen] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={() => setOpen((previous) => !previous)}>
            {open ? expandedLabel : collapsedLabel}
          </Button>
        </Stack>
        {open ? children : null}
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
  const [section, setSection] = useState("authoring");

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Normal flow: select or create a page, define its layout and SEO, inspect the forecast and delivery preview, then use the delivery operations section only when you are ready to validate or sync remote outputs.
      </Alert>
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
      <DeskSplitLayout
        sidebar={
          <DistributionQueue
            pages={workspace.filteredPages}
            selectedPageId={workspace.selectedPageId}
            sourceOptionsByType={workspace.sourceOptionsByType}
            readinessMap={workspace.readinessMap}
            onSelectPage={workspace.selectPage}
            onCreatePage={workspace.startNewPage}
            loading={workspace.supportState.loading}
          />
        }
        main={
          <>
            <DeskTabsCard
              value={section}
              onChange={setSection}
              tabs={[
                { value: "authoring", label: "Authoring" },
                { value: "preview", label: "Output Preview" },
                { value: "deployment", label: "Deployment Status" },
                { value: "advanced", label: "Advanced" }
              ]}
            />

            {section === "authoring" ? <ReadinessPanel workspace={workspace} /> : null}

            {section === "preview" ? (
              <Stack spacing={2}>
                <OutputForecastPanel workspace={workspace} />
                <DeliveryPreviewPanel workspace={workspace} />
              </Stack>
            ) : null}

            {section === "deployment" ? <DeploymentInstancesPanel workspace={workspace} /> : null}

            {section === "advanced" ? (
              <Stack spacing={2}>
                <SecondaryOverviewSection
                  title="Delivery Operations"
                  description="Use this when you want to validate browser delivery or compare and sync the local deployment output to remote storage."
                  collapsedLabel="Show Delivery Operations"
                  expandedLabel="Hide Delivery Operations"
                >
                  <Stack spacing={2}>
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
                  </Stack>
                </SecondaryOverviewSection>
                <SecondaryOverviewSection
                  title="Pages Defaults"
                  description="Pages-level default targets and mount behavior. Most operators should set this once during setup and leave it alone."
                  collapsedLabel="Show Pages Defaults"
                  expandedLabel="Hide Pages Defaults"
                >
                  <PagesRemoteSettingsPanel
                    appMountTagName={workspace.moduleSettingsDomain?.moduleSettingsState?.draftValues?.appMountTagName ?? ""}
                    deploymentTargets={workspace.remoteDeploymentTargets}
                    browserTargets={workspace.remoteBrowserTargets}
                    onChangeField={workspace.moduleSettingsDomain?.handleSettingsFieldChange ?? (() => {})}
                    onSave={workspace.saveModuleSettings}
                    saveDisabled={!workspace.moduleSettingsDomain}
                    settingsState={workspace.moduleSettingsDomain?.moduleSettingsState}
                  />
                </SecondaryOverviewSection>
                <SecondaryOverviewSection
                  title="Client Runtime Contract"
                  description="Runtime payload details for the deployed HTML. Use this when you need to inspect the exact browser bootstrap contract."
                  collapsedLabel="Show Client Runtime Contract"
                  expandedLabel="Hide Client Runtime Contract"
                >
                  <RuntimeContractPanel workspace={workspace} />
                </SecondaryOverviewSection>
              </Stack>
            ) : null}
          </>
        }
      />
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
  const routeModuleId = typeof route?.moduleId === "string" ? route.moduleId : "pages";
  const routePageId = typeof route?.pageId === "string" ? route.pageId : "";
  const syncRoutePageId = useCallback((nextPageId, replace = true) => {
    if (typeof navigate !== "function") {
      return;
    }
    const normalizedNextPageId = typeof nextPageId === "string" ? nextPageId : "";
    if (routePageId === normalizedNextPageId) {
      return;
    }
    navigate(
      {
        moduleId: routeModuleId,
        pageId: normalizedNextPageId
      },
      { replace }
    );
  }, [navigate, routeModuleId, routePageId]);

  useEffect(() => {
    if (
      workspace.isCreatingNewPage
      || routePageId.length === 0
      || routePageId === workspace.selectedPageId
    ) {
      return;
    }
    if (!workspace.pages.some((page) => page.id === routePageId)) {
      if (workspace.pages.length > 0) {
        syncRoutePageId(workspace.pages[0].id, true);
      }
      return;
    }
    workspace.selectPage(routePageId);
  }, [
    routePageId,
    workspace.isCreatingNewPage,
    workspace.pages,
    workspace.selectPage,
    workspace.selectedPageId,
    syncRoutePageId
  ]);

  useEffect(() => {
    if (workspace.isCreatingNewPage) {
      return;
    }
    const nextPageId = workspace.selectedPageId ?? "";
    if (!nextPageId || routePageId === nextPageId) {
      return;
    }
    syncRoutePageId(nextPageId, true);
  }, [routePageId, syncRoutePageId, workspace.isCreatingNewPage, workspace.selectedPageId]);

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
    selectPage: (pageId) => {
      workspace.selectPage(pageId);
      syncRoutePageId(pageId, true);
    },
    startNewPage: () => {
      workspace.startNewPage();
      syncRoutePageId("", true);
    },
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
      <DeskTabsCard
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "overview", label: "Pages Overview" },
          { value: "redirects", label: "Redirect Manager" }
        ]}
      />
      {tab === "overview" ? <OverviewTab workspace={viewWorkspace} /> : null}
      {tab === "redirects" ? <RedirectsTab workspace={viewWorkspace} /> : null}
    </Stack>
  );
}
