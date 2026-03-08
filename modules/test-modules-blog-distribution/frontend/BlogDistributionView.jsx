import { Alert, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import {
  DistributionFilters,
  DistributionQueue,
  ReadinessPanel,
  RedirectEditorPanel,
  RedirectFilters,
  RedirectList,
  SummaryCard
} from "./BlogDistributionPanels.jsx";
import { useBlogDistributionWorkspace } from "./useBlogDistributionWorkspace.js";

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
        <Typography variant="h4">Distribution Desk</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Coordinate scheduled publishing, permalink redirects, and SEO-social readiness without
          duplicating post ownership.
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
      sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" } }}
    >
      <SummaryCard label="Scheduled Queue" value={summary.scheduled} tone="attention" />
      <SummaryCard label="Published" value={summary.published} />
      <SummaryCard label="Posts With Warnings" value={summary.warnings} tone="attention" />
      <SummaryCard label="Active Redirects" value={summary.activeRedirects} />
    </Stack>
  );
}

function OverviewTab({ workspace }) {
  return (
    <Stack spacing={2}>
      <DistributionFilters
        filters={workspace.postFilters}
        onChangeFilters={(fieldId, value) =>
          workspace.setPostFilters((previous) => ({
            ...previous,
            [fieldId]: value
          }))
        }
        onClear={() =>
          workspace.setPostFilters({
            search: "",
            status: "",
            readiness: ""
          })
        }
      />

      {workspace.supportState.errorMessage ? (
        <Alert severity="error">{workspace.supportState.errorMessage}</Alert>
      ) : null}
      {workspace.postActionState.errorMessage ? (
        <Alert severity="error">{workspace.postActionState.errorMessage}</Alert>
      ) : null}
      {workspace.postActionState.successMessage ? (
        <Alert severity="success">{workspace.postActionState.successMessage}</Alert>
      ) : null}

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", xl: 360 }, flexShrink: 0 }}>
          <DistributionQueue
            posts={workspace.filteredPosts}
            selectedPostId={workspace.selectedPostId}
            authorMap={workspace.authorMap}
            readinessMap={workspace.readinessMap}
            onSelectPost={workspace.setSelectedPostId}
          />
        </Stack>
        <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
          <ReadinessPanel workspace={workspace} />
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
        posts={workspace.posts}
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
            targetPostId: ""
          })
        }
      />

      {workspace.redirectActionState.errorMessage ? (
        <Alert severity="error">{workspace.redirectActionState.errorMessage}</Alert>
      ) : null}
      {workspace.redirectActionState.successMessage ? (
        <Alert severity="success">{workspace.redirectActionState.successMessage}</Alert>
      ) : null}

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", xl: 360 }, flexShrink: 0 }}>
          <RedirectList
            redirects={workspace.filteredRedirects}
            posts={workspace.posts}
            selectedRedirectId={workspace.selectedRedirectId}
            onSelectRedirect={workspace.selectRedirect}
            onCreate={workspace.startNewRedirect}
          />
        </Stack>
        <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
          <RedirectEditorPanel workspace={workspace} />
        </Stack>
      </Stack>
    </Stack>
  );
}

export function BlogDistributionView({ activeModuleLabel, collectionsDomain }) {
  const [tab, setTab] = useState("overview");
  const workspace = useBlogDistributionWorkspace({
    collectionsDomain
  });

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
          <Tab value="overview" label="Distribution Overview" />
          <Tab value="redirects" label="Redirect Manager" />
        </Tabs>
      </Paper>
      {tab === "overview" ? <OverviewTab workspace={workspace} /> : null}
      {tab === "redirects" ? <RedirectsTab workspace={workspace} /> : null}
    </Stack>
  );
}
