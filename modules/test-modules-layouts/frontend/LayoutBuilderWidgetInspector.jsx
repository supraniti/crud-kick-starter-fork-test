import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import {
  buildDefaultWidgetActions,
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
    actions: buildDefaultWidgetActions(descriptor)
  };
}

function buildLayoutTranslationField(translationTarget, fieldPath, fieldLabel, sourceValue, valueKind) {
  if (!translationTarget || typeof translationTarget !== "object") {
    return null;
  }
  return {
    entityType: translationTarget.entityType ?? "page-layouts",
    entityId: translationTarget.entityId ?? null,
    entityLabel: translationTarget.entityLabel ?? "Layout",
    sourceLocale: translationTarget.sourceLocale ?? "en-US",
    fieldPath,
    fieldLabel,
    sourceValue: typeof sourceValue === "string" ? sourceValue : "",
    valueKind
  };
}

function readAvailableComponents(pageContextManifest = null) {
  const pageKind = normalizeWidgetPageKind(pageContextManifest?.pageKind ?? "post-detail");
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

function TabsEditor({ instance, pageContextManifest, mediaItems, translationTarget, node, onChange }) {
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
              translationField={buildLayoutTranslationField(
                translationTarget,
                `layoutDocument.nodes.${node.id}.componentInstance.content.tabs[${index}].header`,
                `${node.label || "Tabs"} Header ${index + 1}`,
                tab?.header?.value ?? "",
                "text"
              )}
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
              translationField={buildLayoutTranslationField(
                translationTarget,
                `layoutDocument.nodes.${node.id}.componentInstance.content.tabs[${index}].body`,
                `${node.label || "Tabs"} Body ${index + 1}`,
                tab?.body?.value ?? "",
                "rich-text"
              )}
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
  const exampleField =
    Array.isArray(branches?.[0]?.fields) && branches[0].fields.length > 0
      ? branches[0].fields[0]
      : "context.page.title";

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.25}>
        <Typography variant="subtitle1">How Dynamic Page Data Works</Typography>
        <Typography variant="body2" color="text.secondary">
          Each widget field can stay static or read from the current page record. Choose a widget, switch a field to
          {" "}<strong>Dynamic page data</strong>, then pick the page field you want, such as <code>{exampleField}</code>.
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

function normalizeActionInstance(instance = {}, actionDefinition) {
  const matchingAction = (Array.isArray(instance?.actions) ? instance.actions : []).find(
    (entry) => entry?.actionKey === actionDefinition.actionKey
  );
  if (matchingAction) {
    return matchingAction;
  }
  return {
    actionKey: actionDefinition.actionKey,
    kind: actionDefinition.targetKind === "event" ? "emit" : "navigate",
    targetKind: actionDefinition.targetKind,
    eventName: actionDefinition.targetKind === "event" ? `widget:${actionDefinition.actionKey}` : "",
    targetHref: ""
  };
}

function ActionEditor({ instance, descriptor, onChange }) {
  const actionDefinitions = Object.values(descriptor?.actionDefinitions ?? {});
  if (actionDefinitions.length === 0) {
    return null;
  }

  function patchAction(actionKey, patch) {
    const currentActions = Array.isArray(instance?.actions) ? instance.actions : [];
    const currentAction =
      currentActions.find((entry) => entry?.actionKey === actionKey) ??
      normalizeActionInstance(instance, { actionKey, targetKind: "bound-record" });
    const nextAction = {
      ...currentAction,
      ...patch,
      actionKey
    };
    const nextActions = currentActions.some((entry) => entry?.actionKey === actionKey)
      ? currentActions.map((entry) => (entry?.actionKey === actionKey ? nextAction : entry))
      : [...currentActions, nextAction];
    onChange({
      ...instance,
      actions: nextActions
    });
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1">Actions</Typography>
        <Alert severity="info">
          Actions stay bounded. Widgets can navigate to their typed record target or emit a named event.
        </Alert>
        {actionDefinitions.map((definition) => {
          const action = normalizeActionInstance(instance, definition);
          const canEmit = definition.targetKind !== "event";
          return (
            <Paper key={definition.actionKey} variant="outlined" square sx={{ p: 1 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">{definition.label}</Typography>
                {definition.description ? (
                  <Typography variant="body2" color="text.secondary">
                    {definition.description}
                  </Typography>
                ) : null}
                <TextField
                  select
                  size="small"
                  label="Behavior"
                  value={action.kind}
                  onChange={(event) =>
                    patchAction(definition.actionKey, {
                      kind: event.target.value,
                      targetKind: event.target.value === "emit" ? "event" : definition.targetKind
                    })
                  }
                >
                  <MenuItem value="navigate">Navigate</MenuItem>
                  {canEmit ? <MenuItem value="emit">Emit event</MenuItem> : null}
                </TextField>
                {action.kind === "navigate" ? (
                  definition.targetKind === "route" ? (
                    <TextField
                      size="small"
                      label="Route / URL"
                      value={action.targetHref ?? ""}
                      onChange={(event) =>
                        patchAction(definition.actionKey, {
                          kind: "navigate",
                          targetKind: "route",
                          targetHref: event.target.value
                        })
                      }
                      helperText="Used for generic CTA widgets that should navigate to a specific route."
                    />
                  ) : (
                    <TextField
                      size="small"
                      label="Target"
                      value={definition.targetKind}
                      InputProps={{ readOnly: true }}
                      helperText="Bounded target from the widget contract."
                    />
                  )
                ) : (
                  <TextField
                    size="small"
                    label="Event Name"
                    value={action.eventName ?? ""}
                    onChange={(event) =>
                      patchAction(definition.actionKey, {
                        kind: "emit",
                        targetKind: "event",
                        eventName: event.target.value
                      })
                    }
                  />
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Paper>
  );
}

export function LayoutBuilderWidgetInspector({
  node,
  pageContextManifest,
  widgetBindingManifestNote,
  mediaItems = [],
  translationTarget = null,
  onChangeComponentInstance,
  showAssignmentLibrary = true,
  onSaveAsCustomWidget = null,
  saveCustomWidgetState = null,
  saveAsCustomWidgetLabel = "Save As Custom Widget",
  availableLibrarySections = null,
  selectedLibraryKey = "",
  onSelectLibraryEntry = null
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const availableComponents = useMemo(
    () => readAvailableComponents(pageContextManifest),
    [pageContextManifest]
  );
  const instance = node?.componentInstance ?? null;
  const selectedDescriptor = instance?.componentKey
    ? DEFAULT_WIDGET_COMPONENT_REGISTRY.get(instance.componentKey) ?? null
    : null;
  const widgetSummary = summarizeWidgetInstance(instance, DEFAULT_WIDGET_COMPONENT_REGISTRY);
  const contentFields = useMemo(
    () => Object.entries(selectedDescriptor?.contentBindings ?? {}),
    [selectedDescriptor]
  );
  const propFields = useMemo(
    () => Object.entries(selectedDescriptor?.propDefinitions ?? {}),
    [selectedDescriptor]
  );
  const actionFields = useMemo(
    () => Object.values(selectedDescriptor?.actionDefinitions ?? {}),
    [selectedDescriptor]
  );

  if (!node || node.kind !== "block") {
    return null;
  }

  return (
    <Stack spacing={2}>
      {instance && selectedDescriptor ? (
        <Paper variant="outlined" square sx={{ p: 1.5 }}>
          <Stack spacing={1.25}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap justifyContent="space-between">
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                  <Chip size="small" color="primary" label={widgetSummary.displayName} />
                  <Chip size="small" variant="outlined" label={selectedDescriptor.libraryCategory ?? selectedDescriptor.group ?? "Widget"} />
                  <Chip size="small" variant="outlined" label={selectedDescriptor.complexity ?? "basic"} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {selectedDescriptor.useCase ?? widgetSummary.detail}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {typeof onSaveAsCustomWidget === "function" ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onSaveAsCustomWidget(instance, selectedDescriptor)}
                    disabled={saveCustomWidgetState?.saving === true}
                  >
                    {saveCustomWidgetState?.saving === true ? "Saving..." : saveAsCustomWidgetLabel}
                  </Button>
                ) : null}
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  onClick={() => onChangeComponentInstance(null)}
                >
                  Remove Widget
                </Button>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              <Chip size="small" label="1. Content from Infra" />
              <Chip size="small" label="2. Display inherits from theme unless pinned" />
              <Chip size="small" label="3. Behavior stays bounded" />
            </Stack>

            {saveCustomWidgetState?.message ? (
              <Alert severity={saveCustomWidgetState.error ? "warning" : "success"}>
                {saveCustomWidgetState.message}
              </Alert>
            ) : null}
          </Stack>
        </Paper>
      ) : (
        <Alert severity="info">Choose a widget first, then configure its content, display, behavior, and review.</Alert>
      )}

      {showAssignmentLibrary ? (
        <LayoutBuilderComponentLibrary
          sections={availableLibrarySections ?? []}
          components={availableLibrarySections ? [] : availableComponents}
          selectedLibraryKey={selectedLibraryKey}
          selectedComponentKey={instance?.componentKey ?? ""}
          onSelectComponent={(entry) => {
            if (typeof onSelectLibraryEntry === "function") {
              const nextInstance = onSelectLibraryEntry(entry);
              if (!nextInstance) {
                return;
              }
              onChangeComponentInstance(nextInstance);
              setActiveTab("content");
              return;
            }
            const componentKey = entry?.componentKey ?? entry?.libraryKey;
            const descriptor = DEFAULT_WIDGET_COMPONENT_REGISTRY.get(componentKey);
            if (!descriptor) {
              return;
            }
            onChangeComponentInstance(createInstanceFromDescriptor(descriptor));
            setActiveTab("content");
          }}
        />
      ) : null}

      <DynamicBindingGuide
        pageContextManifest={pageContextManifest}
        widgetBindingManifestNote={widgetBindingManifestNote}
      />

      {instance && selectedDescriptor ? (
        <Paper variant="outlined" square sx={{ overflow: "hidden" }}>
          <Tabs
            value={activeTab}
            onChange={(_event, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab value="overview" label="Overview" />
            <Tab value="content" label={`Content (${contentFields.length})`} />
            <Tab value="display" label={`Display (${propFields.length})`} />
            <Tab value="behavior" label={`Behavior (${actionFields.length})`} />
            <Tab value="review" label="Review" />
          </Tabs>
          <Divider />

          <Box sx={{ p: 1.5 }}>
            {activeTab === "overview" ? (
            <Stack spacing={1.5}>
              <WidgetCompatibilityAlert
                node={node}
                pageContextManifest={pageContextManifest}
                mediaItems={mediaItems}
              />
              <Paper variant="outlined" square sx={{ p: 1.25 }}>
                <Stack spacing={0.9}>
                  <Typography variant="subtitle2">Configuration hierarchy</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Theme controls the default look first. The widget descriptor provides safe defaults second. This
                    widget instance only overrides what you explicitly pin here.
                  </Typography>
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    <Chip size="small" label="Theme default" />
                    <Chip size="small" variant="outlined" label="Widget default" />
                    <Chip size="small" color="primary" label="This widget override" />
                  </Stack>
                </Stack>
              </Paper>
              <Paper variant="outlined" square sx={{ p: 1.25 }}>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">Widget identity</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDescriptor.description ?? "Reusable page widget"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Compatible with page kinds: {selectedDescriptor.supportedPageKinds?.join(", ") || "Any"}
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          ) : null}

          {activeTab === "content" ? (
            <Stack spacing={1.5}>
              {selectedDescriptor.componentKey === "tabs" ? (
                <TabsEditor
                  instance={instance}
                  pageContextManifest={pageContextManifest}
                  mediaItems={mediaItems}
                  translationTarget={translationTarget}
                  node={node}
                  onChange={onChangeComponentInstance}
                />
              ) : contentFields.length > 0 ? (
                contentFields.map(([fieldKey, fieldDefinition]) => (
                  <Paper key={fieldKey} variant="outlined" square sx={{ p: 1.25 }}>
                    <LayoutBuilderBindingPicker
                      label={fieldDefinition.label ?? fieldKey}
                      definition={fieldDefinition}
                      binding={instance.content?.[fieldKey]}
                      pageContextManifest={pageContextManifest}
                      mediaOptions={mediaItems}
                      helperNote={widgetBindingManifestNote}
                      translationField={buildLayoutTranslationField(
                        translationTarget,
                        `layoutDocument.nodes.${node.id}.componentInstance.content.${fieldKey}`,
                        `${node.label || "Widget"} ${fieldDefinition.label ?? fieldKey}`,
                        instance.content?.[fieldKey]?.value ?? "",
                        fieldDefinition.valueKind
                      )}
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
                  </Paper>
                ))
              ) : (
                <Alert severity="info">This widget has no separate content fields.</Alert>
              )}
            </Stack>
          ) : null}

          {activeTab === "display" ? (
            <Stack spacing={1.5}>
              <Alert severity="info">
                Display fields inherit from the active theme until you explicitly pin a different value here.
              </Alert>
              {propFields.length > 0 ? (
                propFields.map(([fieldKey, fieldDefinition]) => (
                  <Paper key={fieldKey} variant="outlined" square sx={{ p: 1.25 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {fieldDefinition.themeKey ? (
                          <Chip size="small" label={`Theme ${fieldDefinition.themeKey}`} />
                        ) : (
                          <Chip size="small" label="Widget default" variant="outlined" />
                        )}
                        <Chip
                          size="small"
                          color="primary"
                          variant="outlined"
                          label={node?.themeOverrideMode === "pinned" ? "Pinned override mode" : "Theme inheritance mode"}
                        />
                      </Stack>
                      <LayoutBuilderBindingPicker
                        label={fieldDefinition.label ?? fieldKey}
                        definition={fieldDefinition}
                        binding={instance.props?.[fieldKey]}
                        pageContextManifest={pageContextManifest}
                        mediaOptions={mediaItems}
                        helperNote={fieldDefinition.helpText ?? widgetBindingManifestNote}
                        translationField={buildLayoutTranslationField(
                          translationTarget,
                          `layoutDocument.nodes.${node.id}.componentInstance.props.${fieldKey}`,
                          `${node.label || "Widget"} ${fieldDefinition.label ?? fieldKey}`,
                          instance.props?.[fieldKey]?.value ?? "",
                          fieldDefinition.valueKind
                        )}
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
                    </Stack>
                  </Paper>
                ))
              ) : (
                <Alert severity="info">This widget has no additional display fields.</Alert>
              )}
            </Stack>
          ) : null}

          {activeTab === "behavior" ? (
            actionFields.length > 0 ? (
              <ActionEditor
                instance={instance}
                descriptor={selectedDescriptor}
                onChange={onChangeComponentInstance}
              />
            ) : (
              <Alert severity="info">This widget does not expose configurable actions.</Alert>
            )
          ) : null}

          {activeTab === "review" ? (
            <Stack spacing={1.5}>
              <Paper variant="outlined" square sx={{ p: 1.25 }}>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">What this widget will render</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDescriptor.useCase ?? selectedDescriptor.description ?? widgetSummary.detail}
                  </Typography>
                </Stack>
              </Paper>
              <Paper variant="outlined" square sx={{ p: 1.25 }}>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">Data dependencies</Typography>
                  {contentFields.length > 0 ? (
                    contentFields.map(([fieldKey]) => (
                      <Typography key={fieldKey} variant="body2" color="text.secondary">
                        {fieldKey}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No explicit content bindings.
                    </Typography>
                  )}
                </Stack>
              </Paper>
              <Paper variant="outlined" square sx={{ p: 1.25 }}>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">Behavior dependencies</Typography>
                  {actionFields.length > 0 ? (
                    actionFields.map((definition) => (
                      <Typography key={definition.actionKey} variant="body2" color="text.secondary">
                        {definition.label}: {definition.targetKind}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No configured behavior.
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Stack>
            ) : null}
          </Box>
        </Paper>
      ) : null}
    </Stack>
  );
}
