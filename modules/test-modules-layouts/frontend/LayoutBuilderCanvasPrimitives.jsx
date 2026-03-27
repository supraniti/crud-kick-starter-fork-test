import { Box, ButtonBase, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { LayoutBuilderAddMenu } from "./LayoutBuilderAddMenu.jsx";
import {
  BLOCK_PLACEHOLDER_TYPES,
  getBlockPlaceholderDefinition,
  STRUCTURAL_LAYOUT_PRESETS
} from "./layout-builder-palette.js";
import { DEFAULT_WIDGET_COMPONENT_REGISTRY } from "../shared/widget-component-schema.mjs";
import { summarizeWidgetInstance } from "../../test-modules-pages/shared/page-widget-compatibility.mjs";

function CompactActionButton({ ariaLabel, title, onClick, children, active = false, tone = "default" }) {
  const backgroundColor = tone === "primary"
    ? "rgba(37,99,235,0.12)"
    : tone === "warning"
      ? "rgba(245,158,11,0.16)"
      : tone === "danger"
        ? "rgba(239,68,68,0.14)"
        : "rgba(255,255,255,0.96)";
  const color = tone === "warning"
    ? "warning.dark"
    : tone === "primary"
      ? "primary.main"
      : tone === "danger"
        ? "error.main"
        : "text.secondary";

  return (
    <Tooltip title={title}>
      <ButtonBase
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        sx={{
          minWidth: 0,
          height: 28,
          px: 1,
          borderRadius: 999,
          border: active ? "1px solid rgba(245,158,11,0.42)" : "1px solid rgba(15,23,42,0.08)",
          backgroundColor,
          color,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          whiteSpace: "nowrap"
        }}
      >
        {children}
      </ButtonBase>
    </Tooltip>
  );
}

function SurfaceBadge({ label, tone = "default" }) {
  return (
    <Box
      sx={{
        maxWidth: 160,
        px: 1,
        py: 0.4,
        borderRadius: 999,
        border: "1px solid rgba(15,23,42,0.08)",
        backgroundColor: tone === "primary" ? "rgba(219,234,254,0.96)" : "rgba(255,255,255,0.96)",
        color: tone === "primary" ? "primary.dark" : "text.secondary",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }}
    >
      {label}
    </Box>
  );
}

function readSurfaceLabel(label, isContainer, placeholderType) {
  if (isContainer && label === "Container") {
    return "Container";
  }
  if (!isContainer) {
    return getBlockPlaceholderDefinition(placeholderType).shortLabel;
  }
  return label;
}

export function NodeHeader({
  label,
  mode,
  sizeLabel,
  placeholderType,
  isSelected,
  isContainer,
  isMoveMode,
  canMove,
  canDelete,
  onOpenNodeDialog,
  onToggleMoveMode,
  onDuplicateNode,
  onDeleteNode,
  onAddLayoutPreset,
  onAddBlockType,
  dragHandleProps
}) {
  const surfaceLabel = readSurfaceLabel(label, isContainer, placeholderType);
  const labelTone = !isContainer || isSelected ? "primary" : "default";

  return (
    <Box
      sx={{
        position: "absolute",
        top: 10,
        left: 10,
        right: 10,
        zIndex: 6,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 1,
        pointerEvents: "none"
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ minWidth: 0 }}>
        <SurfaceBadge label={surfaceLabel} tone={labelTone} />
        {mode && isContainer ? <SurfaceBadge label={mode} tone="default" /> : null}
        {sizeLabel ? <SurfaceBadge label={sizeLabel} tone="default" /> : null}
      </Stack>
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        useFlexGap
        flexWrap="wrap"
        className="node-toolbar"
        sx={{
          pointerEvents: "auto",
          opacity: isSelected ? 1 : 0,
          transition: "opacity 120ms ease"
        }}
      >
        {isContainer ? (
          <LayoutBuilderAddMenu
            ariaLabel="Add section"
            title="Add section"
            triggerLabel="+"
            layoutPresets={STRUCTURAL_LAYOUT_PRESETS}
            blockTypes={BLOCK_PLACEHOLDER_TYPES}
            onAddLayoutPreset={onAddLayoutPreset}
            onAddBlockType={onAddBlockType}
          />
        ) : null}
        <CompactActionButton
          ariaLabel="Duplicate node"
          title="Duplicate node"
          onClick={onDuplicateNode}
        >
          copy
        </CompactActionButton>
        {canMove ? (
          <CompactActionButton
            ariaLabel={isMoveMode ? "Cancel move mode" : "Move selected node"}
            title={isMoveMode ? "Cancel move mode" : "Move selected node"}
            onClick={onToggleMoveMode}
            tone={isMoveMode ? "warning" : "default"}
            active={isMoveMode}
          >
            {isMoveMode ? "done" : "move"}
          </CompactActionButton>
        ) : null}
        <CompactActionButton
          ariaLabel="Edit node"
          title="Edit node"
          onClick={onOpenNodeDialog}
          tone={isSelected ? "primary" : "default"}
        >
          edit
        </CompactActionButton>
        {canDelete ? (
          <CompactActionButton
            ariaLabel="Delete node"
            title="Delete node"
            onClick={onDeleteNode}
            tone="danger"
          >
            del
          </CompactActionButton>
        ) : null}
        <DragHandle
          setActivatorNodeRef={dragHandleProps.setActivatorNodeRef}
          attributes={dragHandleProps.attributes}
          listeners={dragHandleProps.listeners}
        />
      </Stack>
    </Box>
  );
}

function DragHandle({ setActivatorNodeRef, attributes, listeners }) {
  return (
    <Tooltip title="Drag to move">
      <ButtonBase
        ref={setActivatorNodeRef}
        aria-label="Drag node"
        onClick={(event) => event.stopPropagation()}
        sx={{
          height: 28,
          px: 1,
          borderRadius: 999,
          border: "1px solid rgba(15,23,42,0.08)",
          backgroundColor: "rgba(255,255,255,0.96)",
          color: "text.secondary",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase"
        }}
        {...attributes}
        {...listeners}
      >
        ::
      </ButtonBase>
    </Tooltip>
  );
}

export function DropSlot({ slotId, axis, showDropSlots, label, onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  const isVertical = axis === "vertical";
  const isInteractive = typeof onClick === "function";

  return (
    <ButtonBase
      ref={setNodeRef}
      component="div"
      onClick={onClick}
      aria-label={label}
      sx={{
        position: "absolute",
        zIndex: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: showDropSlots ? "auto" : "none",
        opacity: showDropSlots || isOver ? 1 : 0,
        transition: "opacity 120ms ease",
        cursor: isInteractive ? "pointer" : "default",
        backgroundColor: showDropSlots || isOver ? "rgba(37,99,235,0.05)" : "transparent",
        ...(isVertical
          ? {
              left: 10,
              right: 10,
              top: -26,
              height: 52
            }
          : {
              top: 10,
              bottom: 10,
              left: -26,
              width: 52
            })
      }}
    >
      <Box
        sx={{
          borderRadius: 999,
          backgroundColor: isOver ? "primary.main" : "rgba(37,99,235,0.22)",
          boxShadow: isOver ? "0 0 0 6px rgba(37,99,235,0.16)" : "none",
          transition: "all 120ms ease",
          ...(isVertical
            ? {
                width: "100%",
                height: isOver ? 12 : 6
              }
            : {
                width: isOver ? 12 : 6,
                height: "100%"
              })
        }}
      />
    </ButtonBase>
  );
}

export function ContainerEndSlot({ slotId, axis, showDropSlots, label, onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  const isInteractive = typeof onClick === "function";

  return (
    <ButtonBase
      ref={setNodeRef}
      component="div"
      onClick={onClick}
      aria-label={label}
      sx={{
        mt: axis === "vertical" ? 1.5 : 2,
        minHeight: axis === "vertical" ? 32 : 48,
        borderRadius: 999,
        border: showDropSlots || isOver ? "1px dashed rgba(37,99,235,0.28)" : "1px dashed transparent",
        backgroundColor: isOver ? "rgba(37,99,235,0.12)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 120ms ease",
        pointerEvents: showDropSlots ? "auto" : "none",
        opacity: showDropSlots || isOver ? 1 : 0,
        cursor: isInteractive ? "pointer" : "default",
        gridColumn: axis === "horizontal" ? "1 / -1" : undefined
      }}
    >
      <Box
        sx={{
          borderRadius: 999,
          backgroundColor: isOver ? "primary.main" : "rgba(37,99,235,0.22)",
          boxShadow: isOver ? "0 0 0 6px rgba(37,99,235,0.16)" : "none",
          transition: "all 120ms ease",
          width: axis === "vertical" ? "100%" : 6,
          height: axis === "vertical" ? (isOver ? 8 : 4) : "100%"
        }}
      />
    </ButtonBase>
  );
}

export function ContainerEmptyState({ isRoot, onAddLayoutPreset, onAddBlockType }) {
  const isCompact = !isRoot;

  return (
    <Stack
      spacing={isRoot ? 2.25 : 1.25}
      alignItems="center"
      justifyContent="center"
      sx={{
        width: "100%",
        justifySelf: "stretch",
        gridColumn: "1 / -1",
        minHeight: isRoot ? 420 : 180,
        borderRadius: 0,
        border: "2px dashed rgba(15,23,42,0.12)",
        backgroundColor: "rgba(255,255,255,0.82)",
        px: isRoot ? 4 : 2.5,
        py: isRoot ? 5 : 3,
        textAlign: "center"
      }}
    >
      <Stack spacing={1} alignItems="center">
        <Typography variant={isRoot ? "overline" : "caption"} color="text.secondary">
          {isRoot ? "Empty Page" : "Empty Container"}
        </Typography>
        <Typography variant={isRoot ? "h5" : "subtitle1"} sx={{ maxWidth: isRoot ? 560 : 240 }}>
          {isRoot ? "Start with a section" : "Add structure here"}
        </Typography>
        {isRoot ? (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
            Use structural layouts and placeholder blocks directly on the canvas instead of building through a sidebar first.
          </Typography>
        ) : null}
      </Stack>
      <LayoutBuilderAddMenu
        ariaLabel={isRoot ? "Add page section" : "Add section to container"}
        title="Add section"
        triggerLabel={isCompact ? "Add" : "Add Section"}
        layoutPresets={STRUCTURAL_LAYOUT_PRESETS}
        blockTypes={BLOCK_PLACEHOLDER_TYPES}
        onAddLayoutPreset={onAddLayoutPreset}
        onAddBlockType={onAddBlockType}
      />
    </Stack>
  );
}

function resolvePlaceholderVisual(node) {
  const definition = getBlockPlaceholderDefinition(node.props?.placeholderType);
  const paletteByType = {
    hero: {
      background: "linear-gradient(180deg, rgba(254,240,138,0.95), rgba(250,204,21,0.26))",
      border: "rgba(202,138,4,0.28)"
    },
    text: {
      background: "linear-gradient(180deg, rgba(255,255,255,1), rgba(226,232,240,0.88))",
      border: "rgba(71,85,105,0.18)"
    },
    image: {
      background: "linear-gradient(180deg, rgba(224,242,254,1), rgba(125,211,252,0.28))",
      border: "rgba(2,132,199,0.22)"
    },
    feature: {
      background: "linear-gradient(180deg, rgba(224,231,255,1), rgba(129,140,248,0.2))",
      border: "rgba(79,70,229,0.22)"
    },
    cta: {
      background: "linear-gradient(180deg, rgba(254,226,226,1), rgba(248,113,113,0.22))",
      border: "rgba(220,38,38,0.22)"
    },
    sidebar: {
      background: "linear-gradient(180deg, rgba(241,245,249,1), rgba(148,163,184,0.18))",
      border: "rgba(71,85,105,0.18)"
    },
    content: {
      background: "linear-gradient(180deg, rgba(239,246,255,1), rgba(59,130,246,0.14))",
      border: "rgba(37,99,235,0.2)"
    }
  };

  return {
    definition,
    palette: paletteByType[definition.id] ?? paletteByType.content
  };
}

export function BlockVisual({ node, parentMode, isSelected }) {
  const useMeasuredMinHeight = parentMode !== "grid";
  const widgetSummary = summarizeWidgetInstance(node.componentInstance ?? null, DEFAULT_WIDGET_COMPONENT_REGISTRY);
  const widgetDescriptor = node.componentInstance?.componentKey
    ? DEFAULT_WIDGET_COMPONENT_REGISTRY.get(node.componentInstance.componentKey) ?? null
    : null;
  if (widgetDescriptor) {
    return (
      <Box
        sx={{
          flex: 1,
          width: "100%",
          minWidth: 0,
          height: parentMode === "grid" ? "100%" : "auto",
          minHeight: useMeasuredMinHeight ? `${node.props?.minHeight ?? 160}px` : 0,
          borderRadius: 0,
          border: "1px solid rgba(37,99,235,0.24)",
          background: "linear-gradient(180deg, rgba(239,246,255,0.98), rgba(219,234,254,0.94))",
          position: "relative",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "stretch",
          overflow: "hidden",
          boxShadow: isSelected
            ? "inset 0 0 0 1px rgba(255,255,255,0.72), 0 0 0 2px rgba(37,99,235,0.16)"
            : "inset 0 0 0 1px rgba(255,255,255,0.48)"
        }}
      >
        <Stack
          spacing={1.25}
          sx={{
            width: "100%",
            justifyContent: "space-between",
            px: { xs: 2, lg: 3 },
            py: { xs: 2, lg: 3 }
          }}
        >
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <Typography variant="subtitle2">{widgetDescriptor.displayName}</Typography>
              <Chip size="small" color="primary" variant="outlined" label={widgetDescriptor.group} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {widgetSummary.detail}
            </Typography>
          </Stack>
          <Stack spacing={0.75}>
            {widgetDescriptor.componentKey === "post-title" ? (
              <>
                <SampleLine width="55%" height={10} strong />
                <SampleLine width="88%" height={18} strong />
              </>
            ) : null}
            {widgetDescriptor.componentKey === "post-rich-text" ? (
              <>
                <SampleLine width="92%" />
                <SampleLine width="82%" />
                <SampleLine width="87%" />
                <SampleLine width="64%" />
              </>
            ) : null}
            {widgetDescriptor.componentKey === "media-image" ? (
              <Box
                sx={{
                  height: 120,
                  borderRadius: 0,
                  border: "1px solid rgba(2,132,199,0.18)",
                  background: "linear-gradient(135deg, rgba(186,230,253,0.9), rgba(125,211,252,0.48))"
                }}
              />
            ) : null}
            {widgetDescriptor.componentKey === "category-chips" ? (
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                <Chip size="small" label="Category" />
                <Chip size="small" label="Category" />
              </Stack>
            ) : null}
            {widgetDescriptor.componentKey === "author-card" ? (
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 0,
                    backgroundColor: "rgba(148,163,184,0.24)"
                  }}
                />
                <Stack spacing={0.5} sx={{ flex: 1 }}>
                  <SampleLine width="48%" strong />
                  <SampleLine width="74%" />
                </Stack>
              </Stack>
            ) : null}
            {widgetDescriptor.componentKey === "tabs" ? (
              <Stack spacing={1}>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  <Chip size="small" label="Overview" color="primary" />
                  <Chip size="small" label="Author" variant="outlined" />
                </Stack>
                <SampleLine width="88%" />
                <SampleLine width="72%" />
              </Stack>
            ) : null}
          </Stack>
        </Stack>
      </Box>
    );
  }
  const { definition, palette } = resolvePlaceholderVisual(node);
  const sampleContent = renderPlaceholderSample(definition.id, isSelected);

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        minWidth: 0,
        height: parentMode === "grid" ? "100%" : "auto",
        minHeight: useMeasuredMinHeight ? `${node.props?.minHeight ?? 160}px` : 0,
        borderRadius: 0,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch",
        overflow: "hidden",
        boxShadow: isSelected
          ? "inset 0 0 0 1px rgba(255,255,255,0.62), 0 0 0 2px rgba(37,99,235,0.12)"
          : "inset 0 0 0 1px rgba(255,255,255,0.4)"
      }}
    >
      <Stack
        spacing={1.5}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          justifyContent: "space-between",
          px: { xs: 2, lg: 3 },
          py: { xs: 2, lg: 3 }
        }}
      >
        <Stack spacing={0.4}>
          <Typography variant="subtitle2">{definition.label}</Typography>
          <Typography variant="caption" color="text.secondary">
            {definition.description}
          </Typography>
        </Stack>
        {sampleContent}
      </Stack>
    </Box>
  );
}

function SampleLine({ width, height = 8, strong = false }) {
  return (
    <Box
      sx={{
        width,
        height,
        borderRadius: 999,
        backgroundColor: strong ? "rgba(15,23,42,0.18)" : "rgba(15,23,42,0.1)"
      }}
    />
  );
}

function SampleCard({ title, body }) {
  return (
    <Stack
      spacing={0.75}
      sx={{
        p: 1.25,
        borderRadius: 0,
        bgcolor: "rgba(255,255,255,0.62)",
        border: "1px solid rgba(15,23,42,0.08)"
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {body}
      </Typography>
    </Stack>
  );
}

function renderPlaceholderSample(type, isSelected) {
  const opacity = isSelected ? 0.9 : 0.74;
  if (type === "hero") {
    return (
      <Stack spacing={1.1} sx={{ opacity }}>
        <Chip size="small" label="Feature Story" sx={{ alignSelf: "flex-start", bgcolor: "rgba(255,255,255,0.72)" }} />
        <SampleLine width="72%" height={16} strong />
        <SampleLine width="58%" height={16} strong />
        <SampleLine width="96%" />
        <SampleLine width="82%" />
        <Stack direction="row" spacing={1.25} alignItems="stretch">
          <Box sx={{ flex: 1 }}>
            <SampleLine width="42%" />
          </Box>
          <Box
            sx={{
              width: 110,
              minWidth: 110,
              borderRadius: 0,
              bgcolor: "rgba(255,255,255,0.56)",
              border: "1px solid rgba(15,23,42,0.1)"
            }}
          />
        </Stack>
      </Stack>
    );
  }
  if (type === "image") {
    return (
      <Stack spacing={1} sx={{ opacity }}>
        <Box
          sx={{
            width: "100%",
            minHeight: 150,
            borderRadius: 0,
            bgcolor: "rgba(255,255,255,0.52)",
            border: "1px solid rgba(15,23,42,0.08)"
          }}
        />
        <SampleLine width="52%" />
      </Stack>
    );
  }
  if (type === "feature") {
    return (
      <Stack spacing={1.1} sx={{ opacity }}>
        <Stack direction="row" spacing={1}>
          <SampleCard title="Top Story" body="A short feature summary with one clear invitation." />
          <SampleCard title="Secondary" body="Another highlight living beside the lead." />
        </Stack>
      </Stack>
    );
  }
  if (type === "cta") {
    return (
      <Stack spacing={1.1} sx={{ opacity }}>
        <SampleLine width="46%" height={14} strong />
        <SampleLine width="82%" />
        <SampleLine width="68%" />
        <Box
          sx={{
            width: 112,
            height: 32,
            borderRadius: 999,
            bgcolor: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(15,23,42,0.12)"
          }}
        />
      </Stack>
    );
  }
  if (type === "sidebar") {
    return (
      <Stack spacing={1.1} sx={{ opacity }}>
        <SampleLine width="58%" height={12} strong />
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          <Chip size="small" label="Topic" variant="outlined" />
          <Chip size="small" label="Archive" variant="outlined" />
          <Chip size="small" label="Guide" variant="outlined" />
        </Stack>
        <SampleLine width="92%" />
        <SampleLine width="76%" />
        <SampleLine width="88%" />
      </Stack>
    );
  }
  if (type === "text") {
    return (
      <Stack spacing={0.85} sx={{ opacity }}>
        <SampleLine width="60%" height={12} strong />
        <SampleLine width="100%" />
        <SampleLine width="94%" />
        <SampleLine width="98%" />
        <SampleLine width="74%" />
      </Stack>
    );
  }
  return (
    <Stack spacing={1} sx={{ opacity }}>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Chip size="small" label="Category" variant="outlined" />
        <SampleLine width={88} />
        <SampleLine width={72} />
      </Stack>
      <SampleLine width="78%" height={14} strong />
      <SampleLine width="92%" />
      <SampleLine width="94%" />
      <SampleLine width="86%" />
      <SampleLine width="64%" />
    </Stack>
  );
}
