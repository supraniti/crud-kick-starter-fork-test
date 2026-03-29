import { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import { DEFAULT_WIDGET_COMPONENT_REGISTRY } from "../../test-modules-layouts/shared/widget-component-schema.mjs";
import { resolveWidgetContextBindingValue } from "../../test-modules-pages/shared/page-widget-context.mjs";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function renderParagraphs(text) {
  return normalizeText(text, "")
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function uniqueById(items = []) {
  const seen = new Set();
  return toArray(items).filter((item) => {
    const itemId = item?.id ?? null;
    if (!itemId || seen.has(itemId)) {
      return false;
    }
    seen.add(itemId);
    return true;
  });
}

function pickStoryRecord(record = null) {
  return record && typeof record === "object" ? record : null;
}

function resolveBindingTree(rawValue, context, libraries) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((entry) => resolveBindingTree(entry, context, libraries));
  }
  if (!rawValue || typeof rawValue !== "object") {
    return rawValue ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(rawValue, "mode")) {
    if (rawValue.mode === "static") {
      return rawValue.value ?? null;
    }
    if (rawValue.source === "context" || rawValue.source === "item") {
      const resolved = resolveWidgetContextBindingValue(rawValue.path, context);
      return resolved ?? rawValue.fallback ?? null;
    }
    if (rawValue.source === "library" && rawValue.libraryKey === "media") {
      return libraries.mediaById.get(rawValue.itemId) ?? rawValue.snapshot ?? rawValue.fallback ?? null;
    }
    return rawValue.fallback ?? null;
  }
  return Object.fromEntries(
    Object.entries(rawValue).map(([key, value]) => [key, resolveBindingTree(value, context, libraries)])
  );
}

function PreviewLink({ href, onNavigate, children }) {
  if (!href) {
    return <>{children}</>;
  }
  return (
    <Link
      href={href}
      underline="hover"
      color="inherit"
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.(href);
      }}
      sx={{ cursor: "pointer" }}
    >
      {children}
    </Link>
  );
}

function resolveWidgetAction(widget, descriptor, actionKey) {
  const configuredAction = toArray(widget?.actions).find((entry) => entry?.actionKey === actionKey);
  if (configuredAction) {
    return configuredAction;
  }
  const definition = descriptor?.actionDefinitions?.[actionKey];
  if (!definition) {
    return null;
  }
  return {
    actionKey,
    kind: definition.targetKind === "event" ? "emit" : "navigate",
    targetKind: definition.targetKind,
    eventName: definition.targetKind === "event" ? `widget:${actionKey}` : null
  };
}

function runWidgetAction({ action, context, record = null, fallbackHref = null, onNavigate = null }) {
  if (!action) {
    if (fallbackHref) {
      onNavigate?.(fallbackHref);
    }
    return;
  }

  if (action.kind === "emit") {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(
        new CustomEvent(action.eventName || "page-studio:widget-action", {
          detail: {
            actionKey: action.actionKey,
            record
          }
        })
      );
    }
    return;
  }

  let href = fallbackHref;
  if (action.targetKind === "route") {
    href = action.targetHref ?? href;
  } else if (action.targetKind === "previousPost") {
    href = context.navigation?.previousPost?.publicUrl ?? context.navigation?.previousPost?.path ?? href;
  } else if (action.targetKind === "nextPost") {
    href = context.navigation?.nextPost?.publicUrl ?? context.navigation?.nextPost?.path ?? href;
  } else if (action.targetKind === "primaryCategory") {
    href = context.navigation?.primaryCategory?.publicUrl ?? context.navigation?.primaryCategory?.path ?? href;
  } else if (action.targetKind === "authorPage") {
    href = context.author?.publicUrl ?? context.author?.path ?? href;
  } else if (action.targetKind === "bound-record") {
    href = record?.publicUrl ?? record?.path ?? href;
  }

  if (href) {
    onNavigate?.(href);
  }
}

function TabsWidget({ tabs = [] }) {
  const [tabValue, setTabValue] = useState(0);
  if (!tabs.length) {
    return <Alert severity="info">No tabs are configured for this block yet.</Alert>;
  }
  return (
    <Stack spacing={2}>
      <Tabs value={tabValue} onChange={(_event, value) => setTabValue(value)} variant="scrollable">
        {tabs.map((tab, index) => (
          <Tab key={index} label={normalizeText(tab?.header, `Tab ${index + 1}`)} />
        ))}
      </Tabs>
      <Paper variant="outlined" square sx={{ p: 2.5 }}>
        <Typography variant="body1">
          {normalizeText(tabs[tabValue]?.body, "No tab content is available.")}
        </Typography>
      </Paper>
    </Stack>
  );
}

export function createPageStudioPreviewLibraries(collections = {}) {
  return {
    mediaById: new Map(
      toArray(collections.mediaItems).map((item) => [
        item.id,
        {
          ...item,
          preferredUrl:
            item.preferredUrl ??
            item.localContentUrl ??
            `/api/reference/modules/test-modules-media-manager/media-items/${encodeURIComponent(item.id)}/content`
        }
      ])
    ),
    customWidgetsById: new Map(
      toArray(collections.customWidgets).map((item) => [item.id, item])
    ),
    runtimeBreakpoint: "desktop",
    customWidgetStack: []
  };
}

function renderCustomWidgetComposition({
  customWidget,
  context,
  libraries,
  onNavigate,
  customWidgetDepth
}) {
  const breakpointKey = normalizeText(libraries?.runtimeBreakpoint, "desktop");
  const runtimeBreakpoint =
    customWidget?.composition?.runtimeLayoutContract?.breakpoints?.[breakpointKey] ??
    customWidget?.composition?.runtimeLayoutContract?.breakpoints?.desktop ??
    null;
  const blocksById = new Map(
    toArray(customWidget?.composition?.blocks).map((block) => [block.id, block])
  );

  if (!runtimeBreakpoint || blocksById.size === 0) {
    return <Alert severity="info">This custom widget has no composed body yet.</Alert>;
  }

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${Math.max(Number(runtimeBreakpoint.columns ?? 1), 1)}, minmax(0, 1fr))`,
        gridAutoRows: `${Math.max(Number(runtimeBreakpoint.rowHeight ?? 24), 12)}px`,
        gap: `${Math.max(Number(runtimeBreakpoint.gap ?? 0), 0) * 8}px`,
        p: `${Math.max(Number(runtimeBreakpoint.padding ?? 0), 0) * 8}px`,
        boxSizing: "border-box",
        alignContent: "start"
      }}
    >
      {toArray(runtimeBreakpoint.items).map((item) => {
        const block = blocksById.get(item.blockId) ?? null;
        return (
          <Box
            key={item.blockId}
            sx={{
              gridColumn: `${item.colStart} / span ${item.colSpan}`,
              gridRow: `${item.rowStart} / span ${item.rowSpan}`,
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden"
            }}
          >
            <Box sx={{ width: "100%", height: "100%", minHeight: 0, overflow: "auto" }}>
              {block?.componentInstance ? (
                <PageStudioWidgetRenderer
                  widget={block.componentInstance}
                  context={context}
                  libraries={{
                    ...libraries,
                    customWidgetStack: [
                      ...toArray(libraries?.customWidgetStack),
                      customWidget?.id ?? customWidget?.widgetKey ?? customWidget?.title ?? "custom-widget"
                    ]
                  }}
                  onNavigate={onNavigate}
                  customWidgetDepth={customWidgetDepth + 1}
                />
              ) : (
                <Alert severity="info">This custom widget block has no assigned widget yet.</Alert>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export function PageStudioWidgetRenderer({ widget, context, libraries, onNavigate, customWidgetDepth = 0 }) {
  const descriptor = widget?.componentKey ? DEFAULT_WIDGET_COMPONENT_REGISTRY.get(widget.componentKey) ?? null : null;
  const content = resolveBindingTree(widget?.content ?? {}, context, libraries);
  const props = resolveBindingTree(widget?.props ?? {}, context, libraries);

  if (!descriptor) {
    return <Alert severity="warning">Unsupported widget.</Alert>;
  }

  if (widget.componentKey === "custom-widget") {
    const customWidgetId = normalizeText(props?.customWidgetId, "");
    const customWidget = customWidgetId ? libraries?.customWidgetsById?.get?.(customWidgetId) ?? null : null;
    const stack = toArray(libraries?.customWidgetStack);
    if (!customWidgetId) {
      return <Alert severity="warning">Custom widget id is missing.</Alert>;
    }
    if (!customWidget) {
      return <Alert severity="warning">{`Custom widget '${customWidgetId}' is not available in this runtime.`}</Alert>;
    }
    if (stack.includes(customWidgetId) || customWidgetDepth > 6) {
      return <Alert severity="warning">Custom widget recursion was blocked for safety.</Alert>;
    }
    if (customWidget?.composition?.blocks?.length > 0) {
      return renderCustomWidgetComposition({
        customWidget,
        context,
        libraries,
        onNavigate,
        customWidgetDepth
      });
    }
    if (customWidget?.templateInstance?.componentKey) {
      return (
        <PageStudioWidgetRenderer
          widget={customWidget.templateInstance}
          context={context}
          libraries={{
            ...libraries,
            customWidgetStack: [...stack, customWidgetId]
          }}
          onNavigate={onNavigate}
          customWidgetDepth={customWidgetDepth + 1}
        />
      );
    }
    return <Alert severity="info">This custom widget does not have a renderable body yet.</Alert>;
  }

  if (widget.componentKey === "post-title") {
    const tag = normalizeText(props?.tag, "h1");
    return (
      <Box sx={{ minHeight: 0 }}>
        <Typography component={tag} variant={tag} sx={{ textWrap: "balance" }}>
          {normalizeText(content?.text, "Untitled story")}
        </Typography>
      </Box>
    );
  }

  if (widget.componentKey === "category-title") {
    const tag = normalizeText(props?.tag, "h1");
    return (
      <Box sx={{ minHeight: 0 }}>
        <Typography component={tag} variant={tag} sx={{ textWrap: "balance" }}>
          {normalizeText(content?.text, "Untitled category")}
        </Typography>
      </Box>
    );
  }

  if (widget.componentKey === "post-rich-text") {
    const paragraphs = renderParagraphs(content?.body ?? "");
    return (
      <Stack spacing={2}>
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => (
            <Typography key={index} variant="body1">
              {paragraph}
            </Typography>
          ))
        ) : (
          <Alert severity="info">No body content is available for this route.</Alert>
        )}
      </Stack>
    );
  }

  if (widget.componentKey === "category-description") {
    const paragraphs = renderParagraphs(content?.body ?? "");
    return (
      <Stack spacing={2}>
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => (
            <Typography key={index} variant="body1">
              {paragraph}
            </Typography>
          ))
        ) : (
          <Alert severity="info">No category description is available for this route.</Alert>
        )}
      </Stack>
    );
  }

  if (widget.componentKey === "media-image") {
    const media = content?.media;
    if (!media?.preferredUrl) {
      return <Alert severity="info">No media is available for this block.</Alert>;
    }
    return (
      <Box sx={{ height: "100%", minHeight: 0 }}>
        <Box
          component="img"
          src={media.preferredUrl}
          alt={normalizeText(media.altText, normalizeText(media.displayName, "Media"))}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: normalizeText(props?.fit, "cover"),
            border: "1px solid",
            borderColor: "divider",
            display: "block"
          }}
        />
      </Box>
    );
  }

  if (widget.componentKey === "section-heading") {
    const tag = normalizeText(props?.tag, "h2");
    return (
      <Stack spacing={0.75} sx={{ minHeight: 0 }}>
        {normalizeText(content?.kicker, "").length > 0 ? (
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">
            {content.kicker}
          </Typography>
        ) : null}
        <Typography component={tag} variant={tag}>
          {normalizeText(content?.text, "Section Heading")}
        </Typography>
        {normalizeText(content?.supportingText, "").length > 0 ? (
          <Typography variant="body2" color="text.secondary">
            {content.supportingText}
          </Typography>
        ) : null}
      </Stack>
    );
  }

  if (widget.componentKey === "button-cta") {
    const action = resolveWidgetAction(widget, descriptor, "primary");
    return (
      <Button
        variant={normalizeText(props?.variant, "contained")}
        color={normalizeText(props?.color, "primary")}
        onClick={() =>
          runWidgetAction({
            action,
            context,
            fallbackHref: typeof action?.targetHref === "string" ? action.targetHref : null,
            onNavigate
          })
        }
        sx={{ alignSelf: "flex-start" }}
      >
        {normalizeText(content?.text, "Call To Action")}
      </Button>
    );
  }

  if (widget.componentKey === "hero-story") {
    const record = pickStoryRecord(content?.record);
    const action = resolveWidgetAction(widget, descriptor, "openRecord");
    if (!record) {
      return <Alert severity="info">No lead story is available for this block yet.</Alert>;
    }
    return (
      <Card variant="outlined" square sx={{ height: "100%" }}>
        <CardContent sx={{ display: "grid", gap: 1.5, height: "100%" }}>
          {record.featuredMedia?.preferredUrl ? (
            <Box
              component="img"
              src={record.featuredMedia.preferredUrl}
              alt={normalizeText(record.featuredMedia.altText, normalizeText(record.title, "Story"))}
              sx={{
                width: "100%",
                height: 280,
                objectFit: "cover",
                border: "1px solid",
                borderColor: "divider"
              }}
            />
          ) : null}
          <Stack spacing={1}>
            {normalizeText(record.primaryCategory?.name, "").length > 0 ? (
              <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">
                {record.primaryCategory.name}
              </Typography>
            ) : null}
            <Link
              href={record.publicUrl ?? record.path}
              underline="hover"
              color="inherit"
              onClick={(event) => {
                event.preventDefault();
                runWidgetAction({
                  action,
                  context,
                  record,
                  fallbackHref: record.publicUrl ?? record.path,
                  onNavigate
                });
              }}
            >
              <Typography variant="h2" sx={{ textWrap: "balance" }}>
                {normalizeText(record.title, "Untitled story")}
              </Typography>
            </Link>
            {props?.showExcerpt !== false && record.excerpt ? (
              <Typography variant="body1" color="text.secondary">
                {record.excerpt}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (widget.componentKey === "metadata-strip") {
    const author = content?.author;
    const categories = uniqueById(content?.categories);
    return (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
        {normalizeText(author?.displayName, "").length > 0 ? (
          <Chip size="small" variant="outlined" label={author.displayName} />
        ) : null}
        {categories.map((item) => (
          <Chip
            key={item.id ?? item.name}
            size="small"
            color={props?.emphasizeCategories !== false ? "primary" : "default"}
            variant={props?.emphasizeCategories !== false ? "filled" : "outlined"}
            label={normalizeText(item?.name, "Category")}
          />
        ))}
        {!author && categories.length === 0 ? (
          <Alert severity="info">No metadata is available for this block yet.</Alert>
        ) : null}
      </Stack>
    );
  }

  if (widget.componentKey === "promo-panel") {
    const action = resolveWidgetAction(widget, descriptor, "primary");
    const tone = normalizeText(props?.tone, "soft");
    const toneStyles =
      tone === "strong"
        ? { backgroundColor: "primary.main", color: "primary.contrastText" }
        : tone === "default"
          ? { backgroundColor: "background.paper", color: "text.primary" }
          : { backgroundColor: "action.hover", color: "text.primary" };
    return (
      <Paper variant="outlined" square sx={{ p: 2, ...toneStyles }}>
        <Stack spacing={1.25}>
          {normalizeText(content?.kicker, "").length > 0 ? (
            <Typography variant="caption" sx={{ opacity: 0.84, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {content.kicker}
            </Typography>
          ) : null}
          <Typography variant="h3">{normalizeText(content?.title, "Promo title")}</Typography>
          {normalizeText(content?.body, "").length > 0 ? (
            <Typography variant="body2" sx={{ opacity: 0.92 }}>
              {content.body}
            </Typography>
          ) : null}
          <Button
            variant={tone === "strong" ? "contained" : "outlined"}
            color={tone === "strong" ? "inherit" : "primary"}
            onClick={() =>
              runWidgetAction({
                action,
                context,
                fallbackHref: typeof action?.targetHref === "string" ? action.targetHref : null,
                onNavigate
              })
            }
            sx={{ alignSelf: "flex-start" }}
          >
            {normalizeText(content?.ctaText, "Learn more")}
          </Button>
        </Stack>
      </Paper>
    );
  }

  if (widget.componentKey === "divider-rule") {
    const label = normalizeText(content?.label, "");
    return (
      <Stack spacing={1}>
        {label ? (
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing="0.08em">
            {label}
          </Typography>
        ) : null}
        <Divider sx={{ borderBottomWidth: Number(props?.thickness) || 1 }} />
      </Stack>
    );
  }

  if (widget.componentKey === "story-card") {
    const record = pickStoryRecord(content?.record);
    const action = resolveWidgetAction(widget, descriptor, "openRecord");
    if (!record) {
      return <Alert severity="info">No story record is available for this card yet.</Alert>;
    }
    return (
      <Card variant="outlined" square sx={{ height: "100%" }}>
        <CardContent sx={{ display: "grid", gap: 1.25, height: "100%" }}>
          {props?.emphasizeImage !== false && record.featuredMedia?.preferredUrl ? (
            <Box
              component="img"
              src={record.featuredMedia.preferredUrl}
              alt={normalizeText(record.featuredMedia.altText, normalizeText(record.title, "Story"))}
              sx={{
                width: "100%",
                height: 180,
                objectFit: "cover",
                border: "1px solid",
                borderColor: "divider"
              }}
            />
          ) : null}
          <Stack spacing={0.75}>
            {normalizeText(record.author?.displayName, "").length > 0 ? (
              <Typography variant="caption" color="text.secondary">
                {record.author.displayName}
              </Typography>
            ) : null}
            <Link
              href={record.publicUrl ?? record.path}
              underline="hover"
              color="inherit"
              onClick={(event) => {
                event.preventDefault();
                runWidgetAction({
                  action,
                  context,
                  record,
                  fallbackHref: record.publicUrl ?? record.path,
                  onNavigate
                });
              }}
            >
              <Typography variant="h3">{normalizeText(record.title, "Untitled story")}</Typography>
            </Link>
            {record.excerpt ? <Typography variant="body2">{record.excerpt}</Typography> : null}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (widget.componentKey === "category-chips") {
    const items = toArray(content?.items);
    const action = resolveWidgetAction(widget, descriptor, "openCategory");
    return items.length > 0 ? (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignContent: "flex-start" }}>
        {items.map((item) => (
          <Chip
            key={item.id ?? item.name}
            label={normalizeText(item?.name, "Category")}
            clickable
            onClick={() =>
              runWidgetAction({
                action,
                context,
                record: item,
                fallbackHref: item.publicUrl ?? item.path,
                onNavigate
              })
            }
          />
        ))}
      </Stack>
    ) : (
      <Alert severity="info">No categories are attached to this page yet.</Alert>
    );
  }

  if (widget.componentKey === "author-card") {
    const author = content?.author;
    const action = resolveWidgetAction(widget, descriptor, "openAuthor");
    if (!author) {
      return <Alert severity="info">No author is attached to this post yet.</Alert>;
    }
    return (
      <Card variant="outlined" square sx={{ height: "100%" }}>
        <CardContent sx={{ height: "100%", overflow: "auto" }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar src={author.avatarMedia?.preferredUrl ?? undefined} alt={normalizeText(author.displayName, "Author")}>
              {normalizeText(author.displayName, "A").slice(0, 1)}
            </Avatar>
            <Stack spacing={0.75}>
              <Link
                href={author.publicUrl ?? author.path}
                underline="hover"
                color="inherit"
                onClick={(event) => {
                  event.preventDefault();
                  runWidgetAction({
                    action,
                    context,
                    record: author,
                    fallbackHref: author.publicUrl ?? author.path,
                    onNavigate
                  });
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  {normalizeText(author.displayName, "Author")}
                </Typography>
              </Link>
              {author.role ? <Typography variant="caption" color="text.secondary">{author.role}</Typography> : null}
              {author.bio ? <Typography variant="body2">{author.bio}</Typography> : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (widget.componentKey === "breadcrumbs") {
    const items = toArray(context.navigation?.breadcrumbs);
    return items.length > 0 ? (
      <Breadcrumbs>
        {items.map((item) => (
          <PreviewLink key={item.id ?? item.name} href={item.publicUrl ?? item.path} onNavigate={onNavigate}>
            <Typography variant="caption">{normalizeText(item?.name, "Category")}</Typography>
          </PreviewLink>
        ))}
      </Breadcrumbs>
    ) : (
      <Alert severity="info">No breadcrumb route is available for this page yet.</Alert>
    );
  }

  if (widget.componentKey === "post-navigation") {
    const heading = normalizeText(props?.heading, "Keep Reading");
    const items = [
      { label: "Previous Story", record: context.navigation?.previousPost, action: resolveWidgetAction(widget, descriptor, "previous") },
      { label: "Next Story", record: context.navigation?.nextPost, action: resolveWidgetAction(widget, descriptor, "next") }
    ].filter((entry) => entry.record);
    return (
      <Stack spacing={2}>
        <Typography variant="h2">{heading}</Typography>
        {items.length > 0 ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {items.map((entry) => (
              <Card key={entry.label} variant="outlined" square sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {entry.label}
                  </Typography>
                  <Link
                    href={entry.record.publicUrl ?? entry.record.path}
                    underline="hover"
                    color="inherit"
                    onClick={(event) => {
                      event.preventDefault();
                      runWidgetAction({
                        action: entry.action,
                        context,
                        record: entry.record,
                        fallbackHref: entry.record.publicUrl ?? entry.record.path,
                        onNavigate
                      });
                    }}
                  >
                    <Typography variant="h3" sx={{ mt: 0.75, mb: 1 }}>
                      {normalizeText(entry.record.title, "Untitled story")}
                    </Typography>
                  </Link>
                  {entry.record.excerpt ? <Typography variant="body2">{entry.record.excerpt}</Typography> : null}
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Alert severity="info">No adjacent stories are available for this route yet.</Alert>
        )}
      </Stack>
    );
  }

  if (widget.componentKey === "related-posts") {
    const heading = normalizeText(props?.heading, "Related Stories");
    const source = normalizeText(props?.source, "combined");
    const limit = Number(props?.limit);
    const maxItems = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 3;
    const related = context.related ?? {};
    const action = resolveWidgetAction(widget, descriptor, "openRecord");
    let selectedItems = [];
    if (source === "moreFromAuthor") {
      selectedItems = toArray(related.moreFromAuthor);
    } else if (source === "byCategory") {
      selectedItems = toArray(related.byCategory);
    } else if (source === "byTag") {
      selectedItems = toArray(related.byTag);
    } else {
      selectedItems = uniqueById([
        ...toArray(related.moreFromAuthor),
        ...toArray(related.byCategory),
        ...toArray(related.byTag)
      ]);
    }
    selectedItems = selectedItems.slice(0, maxItems);
    return (
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Typography variant="h2">{heading}</Typography>
        {selectedItems.length > 0 ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 2,
              overflow: "auto",
              pr: 0.5
            }}
          >
            {selectedItems.map((item) => (
              <Card key={item.id ?? item.title} variant="outlined" square sx={{ height: "100%" }}>
                <CardContent sx={{ display: "grid", gap: 1.25 }}>
                  {item.featuredMedia?.preferredUrl ? (
                    <Box
                      component="img"
                      src={item.featuredMedia.preferredUrl}
                      alt={normalizeText(item.featuredMedia.altText, normalizeText(item.title, "Related story"))}
                      sx={{
                        width: "100%",
                        height: 120,
                        objectFit: "cover",
                        border: "1px solid",
                        borderColor: "divider"
                      }}
                    />
                  ) : null}
                  <Link
                    href={item.publicUrl ?? item.path}
                    underline="hover"
                    color="inherit"
                    onClick={(event) => {
                      event.preventDefault();
                      runWidgetAction({
                        action,
                        context,
                        record: item,
                        fallbackHref: item.publicUrl ?? item.path,
                        onNavigate
                      });
                    }}
                  >
                    <Typography variant="h3">{normalizeText(item.title, "Untitled story")}</Typography>
                  </Link>
                  {item.excerpt ? <Typography variant="body2">{item.excerpt}</Typography> : null}
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Alert severity="info">No related stories are available for this route yet.</Alert>
        )}
      </Stack>
    );
  }

  if (widget.componentKey === "tabs") {
    return <TabsWidget tabs={toArray(content?.tabs)} />;
  }

  if (widget.componentKey === "post-list") {
    const heading = normalizeText(props?.heading, "Stories");
    const limit = Number(props?.limit);
    const variant = normalizeText(props?.variant, "cards");
    const maxItems = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 6;
    const items = toArray(content?.items).slice(0, maxItems);
    const action = resolveWidgetAction(widget, descriptor, "openRecord");
    return (
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Typography variant="h2">{heading}</Typography>
        {items.length > 0 ? (
          variant === "compact" ? (
            <Stack spacing={1.5} sx={{ overflow: "auto", pr: 0.5 }}>
              {items.map((item) => (
                <Paper key={item.id ?? item.title} variant="outlined" square sx={{ p: 1.5 }}>
                  <Stack spacing={0.75}>
                    <Link
                      href={item.publicUrl ?? item.path}
                      underline="hover"
                      color="inherit"
                      onClick={(event) => {
                        event.preventDefault();
                        runWidgetAction({
                          action,
                          context,
                          record: item,
                          fallbackHref: item.publicUrl ?? item.path,
                          onNavigate
                        });
                      }}
                    >
                      <Typography variant="subtitle1">{normalizeText(item.title, "Untitled story")}</Typography>
                    </Link>
                    {item.excerpt ? <Typography variant="body2" color="text.secondary">{item.excerpt}</Typography> : null}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : variant === "hero-list" ? (
            <Stack spacing={2} sx={{ overflow: "auto", pr: 0.5 }}>
              <PageStudioWidgetRenderer
                widget={{
                  componentKey: "story-card",
                  content: {
                    record: {
                      mode: "static",
                      value: items[0]
                    }
                  },
                  props: {
                    emphasizeImage: {
                      mode: "static",
                      value: true
                    }
                  },
                  actions: widget?.actions ?? []
                }}
                context={context}
                libraries={libraries}
                onNavigate={onNavigate}
                customWidgetDepth={customWidgetDepth}
              />
              {items.slice(1).length > 0 ? (
                <Stack spacing={1.25}>
                  {items.slice(1).map((item) => (
                    <Paper key={item.id ?? item.title} variant="outlined" square sx={{ p: 1.25 }}>
                      <Link
                        href={item.publicUrl ?? item.path}
                        underline="hover"
                        color="inherit"
                        onClick={(event) => {
                          event.preventDefault();
                          runWidgetAction({
                            action,
                            context,
                            record: item,
                            fallbackHref: item.publicUrl ?? item.path,
                            onNavigate
                          });
                        }}
                      >
                        <Typography variant="subtitle1">{normalizeText(item.title, "Untitled story")}</Typography>
                      </Link>
                    </Paper>
                  ))}
                </Stack>
              ) : null}
            </Stack>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 2,
                overflow: "auto",
                pr: 0.5
              }}
            >
              {items.map((item) => (
                <Card key={item.id ?? item.title} variant="outlined" square sx={{ height: "100%" }}>
                  <CardContent sx={{ display: "grid", gap: 1.25 }}>
                    {item.featuredMedia?.preferredUrl ? (
                      <Box
                        component="img"
                        src={item.featuredMedia.preferredUrl}
                        alt={normalizeText(item.featuredMedia.altText, normalizeText(item.title, "Story"))}
                        sx={{
                          width: "100%",
                          height: 120,
                          objectFit: "cover",
                          border: "1px solid",
                          borderColor: "divider"
                        }}
                      />
                    ) : null}
                    <Link
                      href={item.publicUrl ?? item.path}
                      underline="hover"
                      color="inherit"
                      onClick={(event) => {
                        event.preventDefault();
                        runWidgetAction({
                          action,
                          context,
                          record: item,
                          fallbackHref: item.publicUrl ?? item.path,
                          onNavigate
                        });
                      }}
                    >
                      <Typography variant="h3">{normalizeText(item.title, "Untitled story")}</Typography>
                    </Link>
                    {item.excerpt ? <Typography variant="body2">{item.excerpt}</Typography> : null}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )
        ) : (
          <Alert severity="info">No posts are available for this category yet.</Alert>
        )}
      </Stack>
    );
  }

  return <Alert severity="warning">{descriptor.displayName} is not yet previewable.</Alert>;
}
