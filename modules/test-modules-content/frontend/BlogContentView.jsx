import { Alert, Paper, Stack, Typography } from "@mui/material";
import { memo, useMemo, useState } from "react";
import {
  ContentFilterBar,
  PostList,
  RevisionPanel,
  SummaryCard,
  optionItems
} from "./BlogContentPanels.jsx";
import { BlogContentEditorPanel } from "./BlogContentEditorPanel.jsx";
import { BlogContentDeploymentImpactPanel } from "./BlogContentDeploymentImpactPanel.jsx";
import { BlogContentAuthoringReadinessPanel } from "./BlogContentAuthoringReadinessPanel.jsx";
import { BlogContentRemoteProjectionPanel } from "./BlogContentRemoteProjectionPanel.jsx";
import { useBlogContentWorkspace } from "./useBlogContentWorkspace.js";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";
import {
  createContentDeploymentSummary,
  createContentProjectionState,
  resolvePostDeploymentState
} from "./blog-content-release-state.js";
import { resolvePagePublicOutput } from "../../test-modules-pages/frontend/page-public-link-support.js";
import { DeskSplitLayout } from "../../../frontend/src/ui/DeskSplitLayout.jsx";
import { DeskTabsCard } from "../../../frontend/src/ui/DeskTabsCard.jsx";

const POSTS_COLLECTION_ID = "blog-posts";

const Hero = memo(function Hero({ activeModuleLabel }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        background: "linear-gradient(135deg, #111827 0%, #7c2d12 100%)",
        color: "common.white"
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.75)" }}>
          {activeModuleLabel}
        </Typography>
        <Typography variant="h4">Content Desk</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Workflow-oriented editing for posts, editorial lifecycle states, and deterministic revision
          history.
        </Typography>
      </Stack>
    </Paper>
  );
});

const SummaryGrid = memo(function SummaryGrid({ summary, deploymentSummary, projectionState }) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(6, 1fr)" } }}
    >
      <SummaryCard label="Total Posts" value={summary.total} />
      <SummaryCard label="Draft Queue" value={summary.drafts} />
      <SummaryCard
        label="Published"
        value={summary.published}
        tone={summary.published > 0 ? "attention" : "default"}
      />
      <SummaryCard
        label="Deployed Posts"
        value={deploymentSummary.deployedCount}
        tone={deploymentSummary.deployedCount > 0 ? "attention" : "default"}
      />
      <SummaryCard
        label="Need Deployment"
        value={deploymentSummary.needsDeploymentCount}
        tone={deploymentSummary.needsDeploymentCount > 0 ? "attention" : "default"}
      />
      <SummaryCard
        label="Published Without Page"
        value={deploymentSummary.noPageCount}
        tone={deploymentSummary.noPageCount > 0 ? "attention" : "default"}
      />
      <SummaryCard label="Remote Projection" value={projectionState.label} tone={projectionState.tone === "warning" ? "attention" : "default"} />
    </Stack>
  );
});

function WorkspaceLayout({ workspace }) {
  const [section, setSection] = useState("authoring");
  const authorOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "blog-authors"),
    [workspace.referenceOptions]
  );
  const categoryOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "blog-categories"),
    [workspace.referenceOptions]
  );
  const tagOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "blog-tags"),
    [workspace.referenceOptions]
  );

  return (
    <DeskSplitLayout
      sidebar={
        <PostList
          posts={workspace.posts}
          selectedPostId={workspace.selectedPostId}
          postHealthMap={workspace.postHealthMap}
          postDeploymentStateMap={workspace.postDeploymentStateMap}
          onSelect={workspace.selectPost}
          onCreate={workspace.startNew}
        />
      }
      main={
        <>
          <DeskTabsCard
            value={section}
            onChange={setSection}
            tabs={[
              { value: "authoring", label: "Authoring" },
              { value: "release", label: "Release Context" },
              { value: "revisions", label: "Revisions" }
            ]}
          />

          {section === "authoring" ? <BlogContentEditorPanel workspace={workspace} /> : null}

          {section === "release" ? (
            <Stack spacing={2}>
              <BlogContentDeploymentImpactPanel
                impactedTemplates={workspace.enrichedImpactedTemplates}
                loading={workspace.deploymentAwareness.state.loading}
                errorMessage={workspace.deploymentAwareness.state.errorMessage}
                onOpenPages={workspace.openPagesDesk}
              />
              <BlogContentAuthoringReadinessPanel
                draft={workspace.draft}
                authorOptions={authorOptions}
                categoryOptions={categoryOptions}
                tagOptions={tagOptions}
                mediaOptions={workspace.mediaOptions}
                deploymentAwareness={workspace.deploymentAwareness}
                onOpenAuthors={workspace.openAuthorsDesk}
                onOpenTaxonomies={workspace.openTaxonomiesDesk}
                onOpenMedia={workspace.openMediaDesk}
                onOpenPages={workspace.openPagesDesk}
              />
              <BlogContentRemoteProjectionPanel
                latestRun={workspace.remoteProjectionLatestRun}
                moduleSettingsDomain={workspace.moduleSettingsDomain}
                onCompare={() =>
                  workspace.remoteOpsSupport.compareTarget(
                    workspace.moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? ""
                  )
                }
                onExecute={() =>
                  workspace.remoteOpsSupport.executeTarget(
                    workspace.moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? ""
                  )
                }
                onOpenRemoteOps={workspace.openRemoteOpsTarget}
                onSaveSettings={workspace.saveModuleSettings}
                onValidate={() =>
                  workspace.remoteOpsSupport.validateTarget(
                    workspace.moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? ""
                  )
                }
                post={workspace.selectedPost}
                procedureState={workspace.remoteOpsSupport.procedureState}
                selectedTarget={workspace.remoteProjectionTarget}
                targetOptions={workspace.remoteProjectionTargets}
              />
            </Stack>
          ) : null}

          {section === "revisions" ? (
            <RevisionPanel
              revisions={workspace.revisionState.items}
              selectedRevision={workspace.selectedRevision}
              loading={workspace.revisionState.loading}
              errorMessage={workspace.revisionState.errorMessage}
              authorOptions={authorOptions}
              categoryOptions={categoryOptions}
              tagOptions={tagOptions}
              onSelectRevision={workspace.selectRevision}
              onRestoreRevision={workspace.restoreRevision}
            />
          ) : null}
        </>
      }
    />
  );
}

export function BlogContentView({
  activeModuleLabel,
  collectionsDomain,
  moduleSettingsDomain = null,
  navigate = null
}) {
  const workspace = useBlogContentWorkspace({
    collectionsDomain
  });
  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const authorOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "blog-authors"),
    [workspace.referenceOptions]
  );
  const remoteProjectionTargetId =
    moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? "";
  const remoteProjectionTargets = remoteOpsSupport.getTargetsByKind("firestore-projection");
  const remoteProjectionTarget = remoteOpsSupport.getTargetById(remoteProjectionTargetId);
  const remoteProjectionLatestRun = remoteOpsSupport.getLatestRunForTarget(remoteProjectionTargetId);
  const allTargets = remoteOpsSupport.supportState.targets ?? [];
  const fallbackBrowserTarget = allTargets.find((target) => target?.productBindingKey === "browser-delivery") ?? null;
  const fallbackDeploymentTarget = allTargets.find((target) => target?.productBindingKey === "deployment-storage") ?? null;
  const fallbackMediaTarget = allTargets.find((target) => target?.productBindingKey === "media-storage") ?? null;
  const postDeploymentStateMap = useMemo(
    () =>
      new Map(
        workspace.posts.map((post) => [
          post.id,
          resolvePostDeploymentState(post, workspace.deploymentAwareness.state.pages)
        ])
      ),
    [workspace.deploymentAwareness.state.pages, workspace.posts]
  );
  const deploymentSummary = useMemo(
    () => createContentDeploymentSummary(workspace.posts, workspace.deploymentAwareness.state.pages),
    [workspace.deploymentAwareness.state.pages, workspace.posts]
  );
  const projectionState = useMemo(
    () =>
      createContentProjectionState({
        posts: workspace.posts,
        target: remoteProjectionTarget,
        latestRun: remoteProjectionLatestRun
      }),
    [remoteProjectionLatestRun, remoteProjectionTarget, workspace.posts]
  );
  const mediaOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "media-items"),
    [workspace.referenceOptions]
  );
  const enrichedImpactedTemplates = useMemo(
    () =>
      workspace.deploymentAwareness.impactedTemplates.map((page) => ({
        ...page,
        publicationOutput: resolvePagePublicOutput({
          page,
          sourceRecord: workspace.selectedPost,
          targets: allTargets,
          fallbackBrowserTarget,
          fallbackDeploymentTarget,
          fallbackMediaTarget
        })
      })),
    [
      allTargets,
      fallbackBrowserTarget,
      fallbackDeploymentTarget,
      fallbackMediaTarget,
      workspace.deploymentAwareness.impactedTemplates,
      workspace.selectedPost
    ]
  );

  if (
    !collectionsDomain.isActiveCollectionAvailable &&
    collectionsDomain.activeCollectionId === POSTS_COLLECTION_ID
  ) {
    return <Alert severity="warning">{collectionsDomain.activeCollectionUnavailableMessage}</Alert>;
  }

  const openPagesDesk = () => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate(
      {
        moduleId: "pages",
        pageId: workspace.deploymentAwareness.summary.primaryPageId
      },
      { replace: false }
    );
  };

  const openAuthorsDesk = () => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId: "authors" }, { replace: false });
  };

  const openTaxonomiesDesk = () => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId: "taxonomies" }, { replace: false });
  };

  const openMediaDesk = () => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId: "media" }, { replace: false });
  };

  const openRemoteOpsTarget = () => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate(
      {
        moduleId: "test-modules-remote-ops",
        tab: "targets",
        targetId: remoteProjectionTargetId
      },
      { replace: false }
    );
  };

  const saveModuleSettings = async () => {
    if (!moduleSettingsDomain || typeof moduleSettingsDomain.handleSaveModuleSettings !== "function") {
      return;
    }
    await moduleSettingsDomain.handleSaveModuleSettings();
    await remoteOpsSupport.reload();
  };

  return (
    <Stack spacing={2}>
      <Hero activeModuleLabel={activeModuleLabel} />
      <SummaryGrid
        summary={workspace.summary}
        deploymentSummary={deploymentSummary}
        projectionState={projectionState}
      />
      <Alert severity={projectionState.tone === "warning" ? "warning" : "info"}>
        {projectionState.detail}
      </Alert>
      <ContentFilterBar collectionsDomain={collectionsDomain} authorOptions={authorOptions} />
      <WorkspaceLayout
        workspace={{
          ...workspace,
          moduleSettingsDomain,
          remoteOpsSupport,
          remoteProjectionTarget,
          remoteProjectionTargets,
          remoteProjectionLatestRun,
          openAuthorsDesk,
          openTaxonomiesDesk,
        openMediaDesk,
        openPagesDesk,
        enrichedImpactedTemplates,
        mediaOptions,
        postDeploymentStateMap,
        openRemoteOpsTarget,
        saveModuleSettings
        }}
      />
    </Stack>
  );
}
