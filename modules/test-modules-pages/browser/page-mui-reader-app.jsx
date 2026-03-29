import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ThemeProvider,
  Typography
} from "@mui/material";
import { buildWidgetContextScope } from "../shared/page-widget-context.mjs";
import { PageStudioWidgetRenderer } from "../../test-modules-page-studio/frontend/page-studio-widget-renderer.jsx";
import {
  createPageStudioMuiTheme,
  usePageStudioThemeStylesheet
} from "../../test-modules-page-studio/frontend/page-studio-theme-runtime.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function getReaderBreakpoint(width) {
  if (!Number.isFinite(width)) {
    return "desktop";
  }
  if (width <= 640) {
    return "mobile";
  }
  if (width <= 960) {
    return "tablet";
  }
  return "desktop";
}

function useReaderBreakpoint() {
  const [width, setWidth] = useState(
    typeof window === "undefined" ? 1440 : window.innerWidth
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    function handleResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return getReaderBreakpoint(width);
}

function buildContainerSx(node) {
  const props = node?.props ?? {};
  if (node?.layoutMode === "grid") {
    return {
      display: "grid",
      gap: `${Number(props.gap ?? 0)}px`,
      p: `${Number(props.padding ?? 0)}px`,
      minHeight: `${Number(props.minHeight ?? 0)}px`,
      gridTemplateColumns: `repeat(${Math.max(Number(props.columns ?? 1), 1)}, minmax(0, 1fr))`,
      gridAutoRows: `minmax(${Math.max(Number(props.autoRows ?? 120), 24)}px, auto)`,
      minWidth: 0,
      boxSizing: "border-box"
    };
  }
  return {
    display: "flex",
    flexDirection: normalizeText(props.direction, "column"),
    flexWrap: normalizeText(props.wrap, "nowrap"),
    justifyContent: normalizeText(props.justifyContent, "flex-start"),
    alignItems: normalizeText(props.alignItems, "stretch"),
    gap: `${Number(props.gap ?? 0)}px`,
    p: `${Number(props.padding ?? 0)}px`,
    minHeight: `${Number(props.minHeight ?? 0)}px`,
    minWidth: 0,
    boxSizing: "border-box"
  };
}

function buildChildPlacementSx(parentNode, childNode) {
  const placement = childNode?.placement ?? {};
  if (parentNode?.layoutMode === "grid") {
    const grid = placement.grid ?? {};
    return {
      gridColumn: `${Number(grid.x ?? 0) + 1} / span ${Math.max(Number(grid.w ?? 1), 1)}`,
      gridRow: `${Number(grid.y ?? 0) + 1} / span ${Math.max(Number(grid.h ?? 1), 1)}`,
      minWidth: 0,
      minHeight: 0
    };
  }
  const flex = placement.flex ?? {};
  const isColumnFlow =
    parentNode?.layoutMode === "flex" &&
    normalizeText(parentNode?.props?.direction, "column") === "column";
  return {
    order: Number(flex.order ?? 0),
    flexBasis: isColumnFlow ? "auto" : normalizeText(flex.basis, "100%"),
    width: isColumnFlow ? normalizeText(flex.basis, "100%") : undefined,
    flexGrow: Number(flex.grow ?? 0),
    flexShrink: Number(flex.shrink ?? 0),
    minWidth: 0,
    minHeight: 0
  };
}

function createReaderLibraries(widgetRenderContract = null) {
  const mediaById = widgetRenderContract?.libraries?.mediaById ?? {};
  return {
    mediaById: new Map(Object.entries(mediaById))
  };
}

function ReaderLocaleMenu({
  activeLocale,
  supportedLocales,
  onSelectLocale
}) {
  const options = toArray(supportedLocales);
  if (options.length <= 1) {
    return null;
  }
  return (
    <FormControl size="small" sx={{ minWidth: 220 }}>
      <InputLabel id="page-mui-reader-locale-label">Locale</InputLabel>
      <Select
        labelId="page-mui-reader-locale-label"
        id="page-mui-reader-locale"
        label="Locale"
        value={activeLocale}
        onChange={(event) => onSelectLocale?.(event.target.value)}
      >
        {options.map((entry) => (
          <MenuItem key={entry.code} value={entry.code}>
            {entry.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function ReaderCommentsSection({
  comments,
  onRefreshComments,
  onSubmitComment
}) {
  const [authorDisplayName, setAuthorDisplayName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setBody("");
  }, [comments?.postId]);

  if (!comments?.enabled) {
    return null;
  }

  const items = [...toArray(comments.approved), ...toArray(comments.pending)];

  async function handleSubmit(event) {
    event.preventDefault();
    if (!authorDisplayName.trim() || !body.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      const ok = await onSubmitComment?.({
        authorDisplayName: authorDisplayName.trim(),
        authorEmail: authorEmail.trim(),
        body: body.trim()
      });
      if (ok) {
        setBody("");
        setAuthorEmail("");
        setAuthorDisplayName("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack spacing={2} sx={{ pt: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
      >
        <Typography variant="h2">Comments</Typography>
        <Button size="small" variant="outlined" onClick={() => onRefreshComments?.()}>
          Refresh Comments
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {normalizeText(
          comments.note,
          items.length > 0
            ? `${items.length} comment${items.length === 1 ? "" : "s"}`
            : "No public comments yet. Be the first reader to respond."
        )}
      </Typography>
      {comments.loading ? <Alert severity="info">Refreshing comments…</Alert> : null}
      {items.length > 0 ? (
        <Stack spacing={1.25}>
          {items.map((item) => (
            <Card key={item.id ?? `${item.authorDisplayName}-${item.createdAt ?? item.createdOn ?? ""}`} variant="outlined" square>
              <CardContent>
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography variant="subtitle2">
                      {normalizeText(item.authorDisplayName, "Reader")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.status === "pending"
                        ? "Awaiting moderation"
                        : normalizeText(item.createdOn ?? item.createdAt, "")}
                    </Typography>
                  </Stack>
                  <Typography variant="body2">{normalizeText(item.body, "")}</Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Alert severity="info">No comments are visible yet.</Alert>
      )}
      <Card variant="outlined" square>
        <CardContent component="form" onSubmit={handleSubmit}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                id="page-mui-comment-name"
                name="authorDisplayName"
                label="Name"
                size="small"
                value={authorDisplayName}
                onChange={(event) => setAuthorDisplayName(event.target.value)}
                fullWidth
              />
              <TextField
                id="page-mui-comment-email"
                name="authorEmail"
                label="Email"
                size="small"
                value={authorEmail}
                onChange={(event) => setAuthorEmail(event.target.value)}
                fullWidth
              />
            </Stack>
            <TextField
              id="page-mui-comment-body"
              name="body"
              label="Comment"
              size="small"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              multiline
              minRows={4}
              fullWidth
            />
            <Stack direction="row" justifyContent="flex-end">
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? "Sending..." : "Send Comment"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function ContractNode({
  nodeId,
  widgetRenderContract,
  context,
  libraries,
  onNavigate
}) {
  const node = widgetRenderContract?.nodes?.[nodeId] ?? null;
  if (!node) {
    return null;
  }

  if (node.kind === "container") {
    return (
      <Box sx={buildContainerSx(node)}>
        {toArray(node.children).map((childId) => {
          const childNode = widgetRenderContract?.nodes?.[childId] ?? null;
          if (!childNode) {
            return null;
          }
          return (
            <Box key={childId} sx={buildChildPlacementSx(node, childNode)}>
              <ContractNode
                nodeId={childId}
                widgetRenderContract={widgetRenderContract}
                context={context}
                libraries={libraries}
                onNavigate={onNavigate}
              />
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: `${Number(node?.props?.minHeight ?? 0)}px`,
        minWidth: 0,
        overflow: "hidden"
      }}
    >
      <Box sx={{ height: "100%", minHeight: 0, overflow: "auto" }}>
        {node.widget ? (
          <PageStudioWidgetRenderer
            widget={node.widget}
            context={context}
            libraries={libraries}
            onNavigate={onNavigate}
          />
        ) : (
          <Alert severity="info">No widget is assigned to this block yet.</Alert>
        )}
      </Box>
    </Box>
  );
}

export function PageMuiReaderApp({
  application,
  model,
  themeDocument,
  widgetRenderContract,
  activeLocale,
  supportedLocales,
  comments,
  onNavigate,
  onSelectLocale,
  onRefreshComments,
  onSubmitComment
}) {
  const breakpoint = useReaderBreakpoint();
  usePageStudioThemeStylesheet(themeDocument);
  const muiTheme = useMemo(
    () => createPageStudioMuiTheme(themeDocument, breakpoint, 1),
    [breakpoint, themeDocument]
  );
  const context = useMemo(
    () => buildWidgetContextScope({ page: application, model }),
    [application, model]
  );
  const libraries = useMemo(
    () => createReaderLibraries(widgetRenderContract),
    [widgetRenderContract]
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 }
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="flex-end">
            <ReaderLocaleMenu
              activeLocale={activeLocale}
              supportedLocales={supportedLocales}
              onSelectLocale={onSelectLocale}
            />
          </Stack>
          {widgetRenderContract?.rootId ? (
            <ContractNode
              nodeId={widgetRenderContract.rootId}
              widgetRenderContract={widgetRenderContract}
              context={context}
              libraries={libraries}
              onNavigate={onNavigate}
            />
          ) : (
            <Alert severity="warning">
              This page does not expose a widget render contract for the MUI reader.
            </Alert>
          )}
          <ReaderCommentsSection
            comments={comments}
            onRefreshComments={onRefreshComments}
            onSubmitComment={onSubmitComment}
          />
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
