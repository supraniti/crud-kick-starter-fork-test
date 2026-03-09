import { Alert, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import {
  DeliveryPreviewPanel,
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
        <Typography variant="h4">Standalone Pages Desk</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Build standalone pages, bind them to approved content sources, and inspect the delivery
          JSON that downstream renderers will consume.
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
      <SummaryCard label="Scheduled Pages" value={summary.scheduled} tone="attention" />
      <SummaryCard label="Published" value={summary.published} />
      <SummaryCard label="Pages With Warnings" value={summary.warnings} tone="attention" />
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
          <Tab value="overview" label="Pages Overview" />
          <Tab value="redirects" label="Redirect Manager" />
        </Tabs>
      </Paper>
      {tab === "overview" ? <OverviewTab workspace={workspace} /> : null}
      {tab === "redirects" ? <RedirectsTab workspace={workspace} /> : null}
    </Stack>
  );
}
