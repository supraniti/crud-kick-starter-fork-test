import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { LayoutRenderPreview } from "./LayoutRenderPreview.jsx";
import { summarizeWidgetInstance } from "../../test-modules-pages/shared/page-widget-compatibility.mjs";
import { DEFAULT_WIDGET_COMPONENT_REGISTRY } from "../shared/widget-component-schema.mjs";

function SummaryExpandIcon() {
  return (
    <Typography component="span" variant="caption" sx={{ fontWeight: 700 }}>
      v
    </Typography>
  );
}

function LayoutRecordSection({ draft, isExisting, onChangeField }) {
  return (
    <Accordion defaultExpanded disableGutters sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <AccordionSummary expandIcon={<SummaryExpandIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1">Layout Basics</Typography>
          <Chip size="small" label={isExisting ? "saved" : "draft"} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <TextField
            label="Layout Title"
            value={draft.title}
            onChange={(event) => onChangeField("title", event.target.value)}
          />
          <TextField
            label="Layout Key"
            value={draft.layoutKey}
            onChange={(event) => onChangeField("layoutKey", event.target.value)}
          />
          <TextField
            label="Summary"
            multiline
            minRows={4}
            value={draft.summary}
            onChange={(event) => onChangeField("summary", event.target.value)}
          />
          <TextField
            select
            label="Status"
            value={draft.status}
            onChange={(event) => onChangeField("status", event.target.value)}
          >
            <MenuItem value="draft">draft</MenuItem>
            <MenuItem value="ready">ready</MenuItem>
          </TextField>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function LayoutUsageSection({ selectedLayout, deploymentImpact, onOpenPage }) {
  const pages = deploymentImpact?.pages ?? [];

  return (
    <Accordion defaultExpanded disableGutters sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <AccordionSummary expandIcon={<SummaryExpandIcon />}>
        <Typography variant="subtitle1">Used In Pages</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          {selectedLayout ? (
            <Alert severity={pages.length > 0 ? "warning" : "info"}>
              {pages.length > 0
                ? `This layout is already used by ${pages.length} page template${pages.length === 1 ? "" : "s"}.`
                : "This layout is not currently assigned to any page templates."}
            </Alert>
          ) : (
            <Typography color="text.secondary">
              Save or select a layout to inspect where it is already in use.
            </Typography>
          )}
          {pages.map((page) => (
            <Stack
              key={page.id}
              spacing={0.75}
              sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}
            >
              <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                <Typography variant="subtitle2">{page.title || page.id}</Typography>
                <Chip size="small" label={page.status || "draft"} />
                <Chip size="small" variant="outlined" label={page.deploymentStatus || "unknown"} />
              </Stack>
              <Button variant="text" size="small" sx={{ alignSelf: "flex-start" }} onClick={() => onOpenPage?.(page.id)}>
                Open Page
              </Button>
            </Stack>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function SelectedNodeSection({
  draft,
  selectedNode,
  selectedPathIds,
  isMoveMode,
  isSelectedNodeMovable,
  canMoveSelectedBackward,
  canMoveSelectedForward,
  onOpenNodeDialog,
  onStartMoveMode,
  onCancelMoveMode,
  onMoveSelectedBackward,
  onMoveSelectedForward,
  onMoveSelectedToStart,
  onMoveSelectedToEnd
}) {
  const widgetSummary = summarizeWidgetInstance(selectedNode?.componentInstance ?? null, DEFAULT_WIDGET_COMPONENT_REGISTRY);

  return (
    <Accordion defaultExpanded disableGutters sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <AccordionSummary expandIcon={<SummaryExpandIcon />}>
        <Typography variant="subtitle1">Selected Node</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {!selectedNode ? (
          <Typography color="text.secondary">Select a block or container from the canvas or the layers rail.</Typography>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {selectedPathIds.map((nodeId) => {
                const pathNode = draft.layoutDocument.nodes[nodeId];
                return pathNode ? <Chip key={nodeId} size="small" variant="outlined" label={pathNode.label} /> : null;
              })}
            </Stack>
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                <Typography variant="subtitle1">{selectedNode.label}</Typography>
                <Chip size="small" label={selectedNode.kind} />
                {selectedNode.kind === "container" ? (
                  <Chip size="small" variant="outlined" color="primary" label={selectedNode.layoutMode} />
                ) : null}
                {selectedNode.kind === "block" ? (
                  <Chip
                    size="small"
                    color={selectedNode.componentInstance ? "primary" : "default"}
                    variant={selectedNode.componentInstance ? "filled" : "outlined"}
                    label={widgetSummary.displayName}
                  />
                ) : null}
              </Stack>
              <Alert severity="info">
                {selectedNode.kind === "block"
                  ? `${widgetSummary.detail} Open the node dialog to assign or configure its widget.`
                  : "Node settings now open in a dialog so edits can be observed while the selected node stays visible on the canvas."}
              </Alert>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
              <Button variant="contained" onClick={onOpenNodeDialog}>
                Edit Selected Node
              </Button>
              {isSelectedNodeMovable ? (
                <Button
                  variant={isMoveMode ? "contained" : "outlined"}
                  color={isMoveMode ? "warning" : "primary"}
                  onClick={isMoveMode ? onCancelMoveMode : onStartMoveMode}
                >
                  {isMoveMode ? "Cancel Move" : "Move On Canvas"}
                </Button>
              ) : null}
            </Stack>
            {isSelectedNodeMovable ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Reorder In Parent</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
                  <Button variant="text" onClick={onMoveSelectedToStart}>
                    Move To Start
                  </Button>
                  <Button variant="text" onClick={onMoveSelectedBackward} disabled={!canMoveSelectedBackward}>
                    Move Back
                  </Button>
                  <Button variant="text" onClick={onMoveSelectedForward} disabled={!canMoveSelectedForward}>
                    Move Forward
                  </Button>
                  <Button variant="text" onClick={onMoveSelectedToEnd}>
                    Move To End
                  </Button>
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export function LayoutBuilderInspector({
  draft,
  selectedLayout,
  selectedNode,
  selectedPathIds,
  isExisting,
  isMoveMode,
  isSelectedNodeMovable,
  canMoveSelectedBackward,
  canMoveSelectedForward,
  deploymentImpact,
  onChangeField,
  onOpenNodeDialog,
  onStartMoveMode,
  onCancelMoveMode,
  onMoveSelectedBackward,
  onMoveSelectedForward,
  onMoveSelectedToStart,
  onMoveSelectedToEnd,
  onOpenPage
}) {
  const widgetizedBlockCount = Object.values(draft.layoutDocument?.nodes ?? {}).filter(
    (node) => node?.kind === "block" && node?.componentInstance
  ).length;
  const totalBlockCount = Object.values(draft.layoutDocument?.nodes ?? {}).filter(
    (node) => node?.kind === "block"
  ).length;

  return (
    <Stack spacing={2} sx={{ height: "100%", overflow: "auto" }}>
      <LayoutRecordSection
        draft={draft}
        isExisting={isExisting}
        onChangeField={onChangeField}
      />
      <LayoutUsageSection
        selectedLayout={selectedLayout}
        deploymentImpact={deploymentImpact}
        onOpenPage={onOpenPage}
      />
      <SelectedNodeSection
        draft={draft}
        selectedNode={selectedNode}
        selectedPathIds={selectedPathIds}
        isMoveMode={isMoveMode}
        isSelectedNodeMovable={isSelectedNodeMovable}
        canMoveSelectedBackward={canMoveSelectedBackward}
        canMoveSelectedForward={canMoveSelectedForward}
        onOpenNodeDialog={onOpenNodeDialog}
        onStartMoveMode={onStartMoveMode}
        onCancelMoveMode={onCancelMoveMode}
        onMoveSelectedBackward={onMoveSelectedBackward}
        onMoveSelectedForward={onMoveSelectedForward}
        onMoveSelectedToStart={onMoveSelectedToStart}
        onMoveSelectedToEnd={onMoveSelectedToEnd}
      />
      <Accordion disableGutters sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
        <AccordionSummary expandIcon={<SummaryExpandIcon />}>
          <Typography variant="subtitle1">Widget Coverage</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <Alert severity={widgetizedBlockCount > 0 ? "success" : "info"}>
              {widgetizedBlockCount > 0
                ? `${widgetizedBlockCount} of ${totalBlockCount} block${totalBlockCount === 1 ? "" : "s"} already host authored widgets.`
                : "This layout still behaves like a structural shell. Assign widgets to blocks to turn it into authored page output."}
            </Alert>
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Accordion disableGutters sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
        <AccordionSummary expandIcon={<SummaryExpandIcon />}>
          <Typography variant="subtitle1">Rendered Base Preview</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <Alert severity="info">
              This preview shows the base container and block structure only. It does not run page controllers or injected runtime behavior.
            </Alert>
            <LayoutRenderPreview document={draft.layoutDocument} />
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Accordion disableGutters sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
        <AccordionSummary expandIcon={<SummaryExpandIcon />}>
          <Typography variant="subtitle1">Advanced JSON</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField multiline minRows={16} value={JSON.stringify(draft.layoutDocument, null, 2)} InputProps={{ readOnly: true }} />
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
