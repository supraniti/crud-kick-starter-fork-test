import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DEFAULT_WIDGET_COMPONENT_REGISTRY } from "../shared/widget-component-schema.mjs";
import {
  buildCustomWidgetLibraryEntries,
  createComponentInstanceFromWidgetLibraryEntry
} from "../../test-modules-page-studio/shared/page-studio-custom-widget-library.mjs";
import { LayoutBuilderWidgetInspector } from "./LayoutBuilderWidgetInspector.jsx";

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readAvailableBuiltInEntries(pageContextManifest = null) {
  const pageKind = pageContextManifest?.pageKind ?? "post-detail";
  const primarySourceType = pageContextManifest?.primarySourceType ?? "blog-post";
  return [...DEFAULT_WIDGET_COMPONENT_REGISTRY.values()].filter((descriptor) => {
    if (descriptor.hiddenInLibrary === true) {
      return false;
    }
    const pageKindAllowed =
      !Array.isArray(descriptor.supportedPageKinds) || descriptor.supportedPageKinds.length === 0
        ? true
        : descriptor.supportedPageKinds.includes(pageKind);
    const sourceAllowed =
      !Array.isArray(descriptor.supportedPrimarySourceTypes) || descriptor.supportedPrimarySourceTypes.length === 0
        ? true
        : descriptor.supportedPrimarySourceTypes.includes(primarySourceType);
    return pageKindAllowed && sourceAllowed;
  });
}

function buildLegacyWidgetLibrarySections(pageContextManifest = null, customWidgets = []) {
  const builtInEntries = readAvailableBuiltInEntries(pageContextManifest).map((descriptor) => ({
    libraryKey: descriptor.componentKey,
    componentKey: descriptor.componentKey,
    displayName: descriptor.displayName,
    icon: descriptor.icon ?? "widgets",
    libraryCategory: descriptor.libraryCategory ?? descriptor.group ?? "General",
    group: descriptor.group ?? "General",
    description: descriptor.description ?? "Reusable page widget",
    useCase: descriptor.useCase ?? descriptor.description ?? "Reusable page widget",
    complexity: descriptor.complexity ?? "basic",
    keywords: descriptor.keywords ?? [],
    originLabel: "Built-in",
    sourceLabel: descriptor.wrapperKind ?? "primitive",
    disabled: false,
    disabledReason: ""
  }));
  const customEntries = buildCustomWidgetLibraryEntries(customWidgets);
  const sections = [];
  if (customEntries.some((entry) => entry.templateMode === "composition")) {
    sections.push({
      id: "custom-widgets",
      label: "Custom Widgets",
      entries: customEntries.filter((entry) => entry.templateMode === "composition")
    });
  }
  if (customEntries.some((entry) => entry.templateMode !== "composition")) {
    sections.push({
      id: "widget-templates",
      label: "Widget Templates",
      entries: customEntries.filter((entry) => entry.templateMode !== "composition")
    });
  }
  sections.push({
    id: "built-in-widgets",
    label: "Built-in Widgets",
    entries: builtInEntries
  });
  return sections;
}

function NumberField({ label, value, onChange, min = 0, max = 999 }) {
  return (
    <TextField
      label={label}
      type="number"
      value={value ?? ""}
      onChange={(event) => onChange(Number(event.target.value))}
      inputProps={{ min, max }}
    />
  );
}

function PresetButtons({ label, presets, onApply }) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {presets.map((preset) => (
          <Button key={preset.label} size="small" variant="outlined" onClick={() => onApply(preset.value)}>
            {preset.label}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}

function GridPlacementFields({ node, onUpdateNode }) {
  return (
    <Stack spacing={2}>
      <PresetButtons
        label="Quick Width"
        presets={[
          { label: "Full", value: 12 },
          { label: "1/2", value: 6 },
          { label: "1/3", value: 4 },
          { label: "2/3", value: 8 }
        ]}
        onApply={(width) =>
          onUpdateNode({
            placement: {
              ...node.placement,
              grid: {
                ...node.placement?.grid,
                w: width
              }
            }
          })
        }
      />
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <NumberField
          label="Grid Width"
          value={node.placement?.grid?.w}
          min={1}
          max={12}
          onChange={(value) =>
            onUpdateNode({
              placement: {
                ...node.placement,
                grid: {
                  ...node.placement?.grid,
                  w: value
                }
              }
            })
          }
        />
        <NumberField
          label="Grid Height"
          value={node.placement?.grid?.h}
          min={1}
          max={24}
          onChange={(value) =>
            onUpdateNode({
              placement: {
                ...node.placement,
                grid: {
                  ...node.placement?.grid,
                  h: value
                }
              }
            })
          }
        />
      </Stack>
    </Stack>
  );
}

function FlexPlacementFields({ node, onUpdateNode }) {
  return (
    <Stack spacing={2}>
      <PresetButtons
        label="Quick Basis"
        presets={[
          { label: "100%", value: "100%" },
          { label: "50%", value: "50%" },
          { label: "33%", value: "33.333%" },
          { label: "66%", value: "66.666%" }
        ]}
        onApply={(basis) =>
          onUpdateNode({
            placement: {
              ...node.placement,
              flex: {
                ...node.placement?.flex,
                basis
              }
            }
          })
        }
      />
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          label="Flex Basis"
          value={node.placement?.flex?.basis ?? "100%"}
          onChange={(event) =>
            onUpdateNode({
              placement: {
                ...node.placement,
                flex: {
                  ...node.placement?.flex,
                  basis: event.target.value
                }
              }
            })
          }
        />
        <NumberField
          label="Grow"
          value={node.placement?.flex?.grow}
          min={0}
          max={12}
          onChange={(value) =>
            onUpdateNode({
              placement: {
                ...node.placement,
                flex: {
                  ...node.placement?.flex,
                  grow: value
                }
              }
            })
          }
        />
        <NumberField
          label="Shrink"
          value={node.placement?.flex?.shrink}
          min={0}
          max={12}
          onChange={(value) =>
            onUpdateNode({
              placement: {
                ...node.placement,
                flex: {
                  ...node.placement?.flex,
                  shrink: value
                }
              }
            })
          }
        />
      </Stack>
    </Stack>
  );
}

function ContainerFields({ draft, node, parentNode, onUpdateNode }) {
  const isRoot = node.id === draft.layoutDocument.rootId;
  const parentMode = parentNode?.layoutMode ?? "flex";

  return (
    <Stack spacing={2}>
      <TextField
        label={isRoot ? "Page Label" : "Container Label"}
        value={node.label}
        onChange={(event) => onUpdateNode({ label: event.target.value })}
      />
      {isRoot ? (
        <Alert severity="info">
          The page stage stacks top-level containers vertically. Use child containers to create grid or flex structure inside the page.
        </Alert>
      ) : (
        <TextField
          select
          label="Container Layout"
          value={node.layoutMode}
          onChange={(event) => onUpdateNode({ layoutMode: event.target.value })}
        >
          <MenuItem value="grid">grid</MenuItem>
          <MenuItem value="flex">flex</MenuItem>
        </TextField>
      )}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <NumberField
          label="Gap"
          value={node.props?.gap}
          min={0}
          max={96}
          onChange={(value) =>
            onUpdateNode({
              props: {
                ...node.props,
                gap: value
              }
            })
          }
        />
        <NumberField
          label="Padding"
          value={node.props?.padding}
          min={0}
          max={96}
          onChange={(value) =>
            onUpdateNode({
              props: {
                ...node.props,
                padding: value
              }
            })
          }
        />
        <NumberField
          label="Min Height"
          value={node.props?.minHeight}
          min={0}
          max={2400}
          onChange={(value) =>
            onUpdateNode({
              props: {
                ...node.props,
                minHeight: value
              }
            })
          }
        />
      </Stack>
      {node.layoutMode === "grid" && !isRoot ? (
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <NumberField
              label="Columns"
              value={node.props?.columns}
              min={1}
              max={12}
              onChange={(value) =>
                onUpdateNode({
                  props: {
                    ...node.props,
                    columns: value
                  }
                })
              }
            />
            <NumberField
              label="Auto Rows"
              value={node.props?.autoRows}
              min={24}
              max={360}
              onChange={(value) =>
                onUpdateNode({
                  props: {
                    ...node.props,
                    autoRows: value
                  }
                })
              }
            />
          </Stack>
          {parentMode === "grid" ? <GridPlacementFields node={node} onUpdateNode={onUpdateNode} /> : null}
        </Stack>
      ) : null}
      {node.layoutMode === "flex" && !isRoot ? (
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Direction"
              value={node.props?.direction ?? "column"}
              onChange={(event) =>
                onUpdateNode({
                  props: {
                    ...node.props,
                    direction: event.target.value
                  }
                })
              }
            >
              <MenuItem value="row">row</MenuItem>
              <MenuItem value="column">column</MenuItem>
            </TextField>
            <TextField
              select
              label="Wrap"
              value={node.props?.wrap ?? "nowrap"}
              onChange={(event) =>
                onUpdateNode({
                  props: {
                    ...node.props,
                    wrap: event.target.value
                  }
                })
              }
            >
              <MenuItem value="nowrap">nowrap</MenuItem>
              <MenuItem value="wrap">wrap</MenuItem>
            </TextField>
          </Stack>
          {parentMode === "flex" ? <FlexPlacementFields node={node} onUpdateNode={onUpdateNode} /> : null}
        </Stack>
      ) : null}
    </Stack>
  );
}

function BlockFields({
  draft,
  node,
  parentNode,
  pageContextManifest,
  widgetBindingManifestNote,
  mediaItems,
  customWidgets,
  onUpdateNode
}) {
  const parentMode = parentNode?.layoutMode ?? "grid";
  const librarySections = buildLegacyWidgetLibrarySections(pageContextManifest, customWidgets);
  const selectedLibraryKey =
    node?.componentInstance?.componentKey === "custom-widget" &&
    node?.componentInstance?.props?.customWidgetId?.mode === "static"
      ? `custom:${normalizeText(node.componentInstance.props.customWidgetId.value, "")}`
      : node?.componentInstance?.componentKey ?? "";

  return (
    <Stack spacing={2}>
      <TextField
        label="Block Label"
        value={node.label}
        onChange={(event) => onUpdateNode({ label: event.target.value })}
      />
      <NumberField
        label="Min Height"
        value={node.props?.minHeight}
        min={0}
        max={2400}
        onChange={(value) =>
          onUpdateNode({
            props: {
              ...node.props,
              minHeight: value
            }
          })
        }
      />
      {parentMode === "grid" ? <GridPlacementFields node={node} onUpdateNode={onUpdateNode} /> : null}
      {parentMode === "flex" ? <FlexPlacementFields node={node} onUpdateNode={onUpdateNode} /> : null}
      <LayoutBuilderWidgetInspector
        node={node}
        pageContextManifest={pageContextManifest}
        widgetBindingManifestNote={widgetBindingManifestNote}
        mediaItems={mediaItems}
        availableLibrarySections={librarySections}
        selectedLibraryKey={selectedLibraryKey}
        translationTarget={{
          entityType: "page-layouts",
          entityId: draft?.id ?? null,
          entityLabel: draft?.title ?? "Layout",
          sourceLocale: draft?.locale ?? "en-US"
        }}
        onChangeComponentInstance={(componentInstance) =>
          onUpdateNode({
            componentInstance
          })
        }
        onSelectLibraryEntry={(entry) => createComponentInstanceFromWidgetLibraryEntry(entry)}
      />
    </Stack>
  );
}

export function LayoutBuilderNodeDialog({
  open,
  draft,
  selectedNode,
  selectedPathIds,
  parentNode,
  pageContextManifest,
  widgetBindingManifestNote,
  mediaItems,
  customWidgets = [],
  onClose,
  onUpdateNode,
  onRemoveNode
}) {
  if (!selectedNode) {
    return null;
  }

  const isRoot = selectedNode.id === draft.layoutDocument.rootId;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="h6">Edit {selectedNode.kind === "container" ? "Container" : "Block"}</Typography>
          <Chip size="small" label={selectedNode.kind} />
          {selectedNode.kind === "container" ? (
            <Chip size="small" variant="outlined" label={selectedNode.layoutMode} />
          ) : null}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedPathIds.map((nodeId) => {
              const pathNode = draft.layoutDocument.nodes[nodeId];
              return pathNode ? <Chip key={nodeId} size="small" variant="outlined" label={pathNode.label} /> : null;
            })}
          </Stack>
          {selectedNode.kind === "container" ? (
            <ContainerFields
              draft={draft}
              node={selectedNode}
              parentNode={parentNode}
              onUpdateNode={onUpdateNode}
            />
          ) : (
            <BlockFields
              draft={draft}
              node={selectedNode}
              parentNode={parentNode}
              pageContextManifest={pageContextManifest}
              widgetBindingManifestNote={widgetBindingManifestNote}
              mediaItems={mediaItems}
              customWidgets={customWidgets}
              onUpdateNode={onUpdateNode}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        <Button color="warning" onClick={onRemoveNode} disabled={isRoot}>
          Delete Node
        </Button>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
