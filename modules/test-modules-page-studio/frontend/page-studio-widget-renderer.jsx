import { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Card,
  CardContent,
  Chip,
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
    )
  };
}

export function PageStudioWidgetRenderer({ widget, context, libraries, onNavigate }) {
  const descriptor = widget?.componentKey ? DEFAULT_WIDGET_COMPONENT_REGISTRY.get(widget.componentKey) ?? null : null;
  const content = resolveBindingTree(widget?.content ?? {}, context, libraries);
  const props = resolveBindingTree(widget?.props ?? {}, context, libraries);

  if (!descriptor) {
    return <Alert severity="warning">Unsupported widget.</Alert>;
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

  if (widget.componentKey === "category-chips") {
    const items = toArray(content?.items);
    return items.length > 0 ? (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignContent: "flex-start" }}>
        {items.map((item) => (
          <PreviewLink key={item.id ?? item.name} href={item.publicUrl ?? item.path} onNavigate={onNavigate}>
            <Chip label={normalizeText(item?.name, "Category")} clickable />
          </PreviewLink>
        ))}
      </Stack>
    ) : (
      <Alert severity="info">No categories are attached to this page yet.</Alert>
    );
  }

  if (widget.componentKey === "author-card") {
    const author = content?.author;
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
              <PreviewLink href={author.publicUrl ?? author.path} onNavigate={onNavigate}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {normalizeText(author.displayName, "Author")}
                </Typography>
              </PreviewLink>
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
      { label: "Previous Story", record: context.navigation?.previousPost },
      { label: "Next Story", record: context.navigation?.nextPost }
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
                  <PreviewLink href={entry.record.publicUrl ?? entry.record.path} onNavigate={onNavigate}>
                    <Typography variant="h3" sx={{ mt: 0.75, mb: 1 }}>
                      {normalizeText(entry.record.title, "Untitled story")}
                    </Typography>
                  </PreviewLink>
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
                  <PreviewLink href={item.publicUrl ?? item.path} onNavigate={onNavigate}>
                    <Typography variant="h3">{normalizeText(item.title, "Untitled story")}</Typography>
                  </PreviewLink>
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

  return <Alert severity="warning">{descriptor.displayName} is not yet previewable.</Alert>;
}
