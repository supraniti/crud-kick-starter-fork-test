import {
  Alert,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import {
  DEFAULT_WIDGET_COMPONENT_REGISTRY
} from "../shared/widget-component-schema.mjs";
import {
  resolvePageWidgetCompatibility,
  summarizeWidgetInstance
} from "../../test-modules-pages/shared/page-widget-compatibility.mjs";
import { LayoutBuilderBindingPicker } from "./LayoutBuilderBindingPicker.jsx";
import { LayoutBuilderComponentLibrary } from "./LayoutBuilderComponentLibrary.jsx";

function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeWidgetPageKind(pageKind) {
  return pageKind === "content-detail" ? "post-detail" : pageKind;
}

function createInstanceFromDescriptor(descriptor) {
  return {
    componentKey: descriptor.componentKey,
    variantKey: "default",
    content: cloneJsonValue(descriptor.defaultBindings ?? {}),
    props: cloneJsonValue(descriptor.defaultProps ?? {}),
    actions: []
  };
}

function readAvailableComponents(pageContextManifest = null) {
  const pageKind = normalizeWidgetPageKind(pageContextManifest?.pageKind ?? "post-detail");
  const primarySourceType = pageContextManifest?.primarySourceType ?? "blog-post";
  return [...DEFAULT_WIDGET_COMPONENT_REGISTRY.values()].filter((descriptor) => {
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

function WidgetCompatibilityAlert({ node, pageContextManifest, mediaItems }) {
  const compatibility = resolvePageWidgetCompatibility({
    layoutDocument: {
      rootId: "root",
      nodes: {
        root: {
          id: "root",
          kind: "container",
          label: "Root",
          layoutMode: "grid",
          children: [node.id]
        },
        [node.id]: node
      }
    },
    pageContextManifest,
    pageKind: normalizeWidgetPageKind(pageContextManifest?.pageKind ?? null),
    primarySourceType: pageContextManifest?.primarySourceType ?? null,
    mediaItems
  });
  const issues = compatibility.widgetInventory[0]?.issues ?? [];
  if (issues.length === 0) {
    return <Alert severity="success">This widget is compatible with the current page context.</Alert>;
  }
  return (
    <Alert severity="warning">
      {issues.map((issue) => issue.message).join(" ")}
    </Alert>
  );
}

function TabsEditor({ instance, pageContextManifest, mediaItems, onChange }) {
  const tabs = Array.isArray(instance?.content?.tabs) ? instance.content.tabs : [];

  function updateTabs(nextTabs) {
    onChange({
      ...instance,
      content: {
        ...instance.content,
        tabs: nextTabs
      }
    });
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">Tabs</Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() =>
            updateTabs([
              ...tabs,
              {
                header: { mode: "static", value: `Tab ${tabs.length + 1}` },
                body: { mode: "dynamic", source: "context", path: "context.post.excerpt" }
              }
            ])
          }
        >
          Add Tab
        </Button>
      </Stack>
      {tabs.map((tab, index) => (
        <Paper key={`tab-${index}`} variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">{`Tab ${index + 1}`}</Typography>
              <Button
                size="small"
                color="warning"
                onClick={() => updateTabs(tabs.filter((_, tabIndex) => tabIndex !== index))}
              >
                Remove
              </Button>
            </Stack>
            <LayoutBuilderBindingPicker
              label="Header"
              definition={{
                label: "Header",
                valueKind: "text",
                required: true,
                allowedSources: ["static"]
              }}
              binding={tab.header}
              pageContextManifest={pageContextManifest}
              mediaOptions={mediaItems}
              onChange={(nextBinding) =>
                updateTabs(
                  tabs.map((entry, tabIndex) =>
                    tabIndex === index
                      ? {
                          ...entry,
                          header: nextBinding
                        }
                      : entry
                  )
                )
              }
            />
            <LayoutBuilderBindingPicker
              label="Body"
              definition={{
                label: "Body",
                valueKind: "rich-text",
                required: true,
                allowedSources: ["static", "context"]
              }}
              binding={tab.body}
              pageContextManifest={pageContextManifest}
              mediaOptions={mediaItems}
              onChange={(nextBinding) =>
                updateTabs(
                  tabs.map((entry, tabIndex) =>
                    tabIndex === index
                      ? {
                          ...entry,
                          body: nextBinding
                        }
                      : entry
                  )
                )
              }
            />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function summarizeManifestBranches(pageContextManifest = null) {
  return Array.isArray(pageContextManifest?.branches)
    ? pageContextManifest.branches.filter((branch) => branch?.bindable)
    : [];
}

function DynamicBindingGuide({ pageContextManifest, widgetBindingManifestNote }) {
  const branches = summarizeManifestBranches(pageContextManifest);

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.25}>
        <Typography variant="subtitle1">How Dynamic Page Data Works</Typography>
        <Typography variant="body2" color="text.secondary">
          Each widget field can stay static or read from the current page record. Choose a widget, switch a field to
          {" "}<strong>Dynamic page data</strong>, then pick the page field you want, such as <code>context.post.title</code>.
        </Typography>
        <Alert severity="info">
          {widgetBindingManifestNote}
        </Alert>
        <Stack spacing={1}>
          <Typography variant="subtitle2">Available page data in this preview</Typography>
          {branches.length > 0 ? (
            branches.map((branch) => (
              <Stack key={branch.path} spacing={0.5}>
                <Typography variant="body2">
                  <strong>{branch.label ?? branch.path}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Array.isArray(branch.fields) && branch.fields.length > 0
                    ? branch.fields.slice(0, 4).join(" • ")
                    : branch.path}
                </Typography>
              </Stack>
            ))
          ) : (
            <Typography variant="caption" color="text.secondary">
              No bindable page data branches are available yet.
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export function LayoutBuilderWidgetInspector({
  node,
  pageContextManifest,
  widgetBindingManifestNote,
  mediaItems = [],
  onChangeComponentInstance
}) {
  const components = readAvailableComponents(pageContextManifest);
  const instance = node?.componentInstance ?? null;
  const selectedDescriptor = instance?.componentKey
    ? DEFAULT_WIDGET_COMPONENT_REGISTRY.get(instance.componentKey) ?? null
    : null;
  const widgetSummary = summarizeWidgetInstance(instance, DEFAULT_WIDGET_COMPONENT_REGISTRY);

  if (!node || node.kind !== "block") {
    return null;
  }

  return (
    <Stack spacing={2}>
      <DynamicBindingGuide
        pageContextManifest={pageContextManifest}
        widgetBindingManifestNote={widgetBindingManifestNote}
      />
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            <Typography variant="subtitle1">Widget Assignment</Typography>
            <Chip
              size="small"
              color={instance ? "primary" : "default"}
              label={instance ? widgetSummary.displayName : "Unassigned"}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {widgetSummary.detail}
          </Typography>
          {instance ? (
            <Button
              variant="outlined"
              color="warning"
              sx={{ alignSelf: "flex-start" }}
              onClick={() => onChangeComponentInstance(null)}
            >
              Remove Widget
            </Button>
          ) : null}
        </Stack>
      </Paper>

      <LayoutBuilderComponentLibrary
        components={components}
        selectedComponentKey={instance?.componentKey ?? ""}
        onSelectComponent={(componentKey) => {
          const descriptor = DEFAULT_WIDGET_COMPONENT_REGISTRY.get(componentKey);
          if (!descriptor) {
            return;
          }
          onChangeComponentInstance(createInstanceFromDescriptor(descriptor));
        }}
      />

      {instance && selectedDescriptor ? (
        <Stack spacing={2}>
          <WidgetCompatibilityAlert
            node={node}
            pageContextManifest={pageContextManifest}
            mediaItems={mediaItems}
          />
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1">Content</Typography>
              {selectedDescriptor.componentKey === "tabs" ? (
                <TabsEditor
                  instance={instance}
                  pageContextManifest={pageContextManifest}
                  mediaItems={mediaItems}
                  onChange={onChangeComponentInstance}
                />
              ) : Object.entries(selectedDescriptor.contentBindings ?? {}).map(([fieldKey, fieldDefinition]) => (
                <LayoutBuilderBindingPicker
                  key={fieldKey}
                  label={fieldDefinition.label ?? fieldKey}
                  definition={fieldDefinition}
                  binding={instance.content?.[fieldKey]}
                  pageContextManifest={pageContextManifest}
                  mediaOptions={mediaItems}
                  helperNote={widgetBindingManifestNote}
                  onChange={(nextBinding) =>
                    onChangeComponentInstance({
                      ...instance,
                      content: {
                        ...instance.content,
                        [fieldKey]: nextBinding
                      }
                    })
                  }
                />
              ))}
            </Stack>
          </Paper>

          {Object.keys(selectedDescriptor.propDefinitions ?? {}).length > 0 ? (
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Props</Typography>
                {Object.entries(selectedDescriptor.propDefinitions ?? {}).map(([fieldKey, fieldDefinition]) => (
                  <LayoutBuilderBindingPicker
                    key={fieldKey}
                    label={fieldDefinition.label ?? fieldKey}
                    definition={fieldDefinition}
                    binding={instance.props?.[fieldKey]}
                    pageContextManifest={pageContextManifest}
                    mediaOptions={mediaItems}
                    helperNote={widgetBindingManifestNote}
                    onChange={(nextBinding) =>
                      onChangeComponentInstance({
                        ...instance,
                        props: {
                          ...instance.props,
                          [fieldKey]: nextBinding
                        }
                      })
                    }
                  />
                ))}
              </Stack>
            </Paper>
          ) : null}

          <Divider />
          <Alert severity="info">
            Widget actions are intentionally bounded. The initial slice focuses on authored rendering before action-emitting widgets are introduced.
          </Alert>
        </Stack>
      ) : null}
    </Stack>
  );
}
