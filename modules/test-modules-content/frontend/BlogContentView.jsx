import { Alert, Paper, Stack, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import {
  ContentFilterBar,
  PostList,
  RevisionPanel,
  SummaryCard,
  optionItems
} from "./BlogContentPanels.jsx";
import { BlogContentEditorPanel } from "./BlogContentEditorPanel.jsx";
import { useBlogContentWorkspace } from "./useBlogContentWorkspace.js";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";

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

const SummaryGrid = memo(function SummaryGrid({ summary }) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" } }}
    >
      <SummaryCard label="Total Posts" value={summary.total} />
      <SummaryCard label="Draft Queue" value={summary.drafts} />
      <SummaryCard label="Scheduled" value={summary.scheduled} />
      <SummaryCard
        label="Published"
        value={summary.published}
        tone={summary.published > 0 ? "attention" : "default"}
      />
    </Stack>
  );
});

function WorkspaceLayout({ workspace }) {
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
    <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
      <Stack sx={{ width: { xs: "100%", xl: 360 }, flexShrink: 0 }}>
        <PostList
          posts={workspace.posts}
          selectedPostId={workspace.selectedPostId}
          postHealthMap={workspace.postHealthMap}
          onSelect={workspace.selectPost}
          onCreate={workspace.startNew}
        />
      </Stack>

      <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
        <BlogContentEditorPanel workspace={workspace} />
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
      </Stack>
    </Stack>
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
        moduleId: "test-modules-pages",
        pageId: workspace.deploymentAwareness.summary.primaryPageId
      },
      { replace: false }
    );
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
      <SummaryGrid summary={workspace.summary} />
      <ContentFilterBar collectionsDomain={collectionsDomain} authorOptions={authorOptions} />
      <WorkspaceLayout
        workspace={{
          ...workspace,
          moduleSettingsDomain,
          remoteOpsSupport,
          remoteProjectionTarget,
          remoteProjectionTargets,
          remoteProjectionLatestRun,
          openPagesDesk,
          openRemoteOpsTarget,
          saveModuleSettings
        }}
      />
    </Stack>
  );
}
