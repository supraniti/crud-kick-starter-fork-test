import { Alert, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { resolveBindableContextOptions } from "../../test-modules-pages/shared/page-widget-compatibility.mjs";

function toText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function resolveSourceOptions(definition = {}) {
  const allowedSources = Array.isArray(definition.allowedSources)
    ? definition.allowedSources
    : ["static"];
  const normalized = ["static", ...allowedSources.filter((entry) => entry !== "static")];
  return [...new Set(normalized)];
}

function createBindingForSource(source, definition = {}, pageContextManifest = null, mediaOptions = []) {
  if (source === "context") {
    const firstOption = resolveBindableContextOptions(pageContextManifest, definition.valueKind)[0];
    return {
      mode: "dynamic",
      source: "context",
      path: firstOption?.path ?? ""
    };
  }
  if (source === "library") {
    return {
      mode: "dynamic",
      source: "library",
      libraryKey: "media",
      itemId: mediaOptions[0]?.id ?? null,
      snapshot: mediaOptions[0]
        ? {
            id: mediaOptions[0].id ?? null,
            displayName: mediaOptions[0].displayName ?? mediaOptions[0].name ?? mediaOptions[0].id ?? "Media",
            altText: mediaOptions[0].altText ?? mediaOptions[0].displayName ?? "",
            description: mediaOptions[0].description ?? "",
            preferredUrl:
              mediaOptions[0].preferredUrl ??
              mediaOptions[0].publicUrl ??
              mediaOptions[0].temporaryUrl ??
              mediaOptions[0].localContentUrl ??
              null,
            relativePath: mediaOptions[0].relativePath ?? null,
            width: mediaOptions[0].width ?? null,
            height: mediaOptions[0].height ?? null
          }
        : null
    };
  }
  return {
    mode: "static",
    value:
      Object.prototype.hasOwnProperty.call(definition, "defaultValue") ? definition.defaultValue : ""
  };
}

function renderStaticField({ definition, binding, onChange }) {
  const value = Object.prototype.hasOwnProperty.call(binding ?? {}, "value") ? binding.value : "";
  const valueKind = definition.valueKind ?? "text";
  if (valueKind === "enum" && Array.isArray(definition.options) && definition.options.length > 0) {
    return (
      <TextField
        select
        label={definition.label ?? definition.key}
        value={value ?? definition.options[0]}
        onChange={(event) => onChange({ mode: "static", value: event.target.value })}
      >
        {definition.options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  if (valueKind === "boolean") {
    return (
      <TextField
        select
        label={definition.label ?? definition.key}
        value={value === true ? "true" : "false"}
        onChange={(event) => onChange({ mode: "static", value: event.target.value === "true" })}
      >
        <MenuItem value="true">true</MenuItem>
        <MenuItem value="false">false</MenuItem>
      </TextField>
    );
  }
  return (
    <TextField
      label={definition.label ?? definition.key}
      multiline={valueKind === "rich-text"}
      minRows={valueKind === "rich-text" ? 5 : 1}
      type={valueKind === "number" ? "number" : "text"}
      value={value ?? ""}
      onChange={(event) =>
        onChange({
          mode: "static",
          value: valueKind === "number" ? Number(event.target.value) || 0 : event.target.value
        })
      }
    />
  );
}

export function LayoutBuilderBindingPicker({
  label,
  definition = {},
  binding = null,
  pageContextManifest = null,
  mediaOptions = [],
  helperNote = "",
  onChange
}) {
  const sourceOptions = resolveSourceOptions(definition);
  const resolvedSource =
    binding?.mode === "dynamic"
      ? binding.source === "library"
        ? "library"
        : "context"
      : "static";
  const contextOptions = resolveBindableContextOptions(pageContextManifest, definition.valueKind);

  return (
    <Stack spacing={1.25}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {definition.required ? "Required" : "Optional"} {definition.valueKind ?? "value"}
        </Typography>
      </Stack>
      {sourceOptions.length > 1 ? (
        <TextField
          select
          label="Source"
          value={resolvedSource}
          onChange={(event) =>
            onChange(createBindingForSource(event.target.value, definition, pageContextManifest, mediaOptions))
          }
        >
          {sourceOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option === "static"
                ? "Static value"
                : option === "context"
                  ? "Dynamic page data"
                  : "Media library"}
            </MenuItem>
          ))}
        </TextField>
      ) : null}

      {resolvedSource === "static"
        ? renderStaticField({
            definition,
            binding: binding ?? createBindingForSource("static", definition, pageContextManifest, mediaOptions),
            onChange
          })
        : null}

      {resolvedSource === "context" ? (
        contextOptions.length > 0 ? (
          <Stack spacing={1}>
            <Alert severity="info">
              This value will be filled at render time from the current page record. Choose the page data field you want this widget to read.
            </Alert>
            {helperNote ? (
              <Typography variant="caption" color="text.secondary">
                {helperNote}
              </Typography>
            ) : null}
            <TextField
              select
              label="Page data field"
              value={toText(binding?.path, contextOptions[0]?.path ?? "")}
              onChange={(event) =>
                onChange({
                  mode: "dynamic",
                  source: "context",
                  path: event.target.value
                })
              }
            >
              {contextOptions.map((option) => (
                <MenuItem key={option.path} value={option.path}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        ) : (
          <Alert severity="warning">
            No compatible page data fields are available for this value yet.
          </Alert>
        )
      ) : null}

      {resolvedSource === "library" ? (
        mediaOptions.length > 0 ? (
          <TextField
            select
            label="Media item"
            value={toText(binding?.itemId, mediaOptions[0]?.id ?? "")}
            onChange={(event) =>
              onChange(
                createBindingForSource(
                  "library",
                  definition,
                  pageContextManifest,
                  mediaOptions.filter((option) => option.id === event.target.value)
                )
              )
            }
          >
            {mediaOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.displayName ?? option.name ?? option.id}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Alert severity="warning">No media items are available in the local library yet.</Alert>
        )
      ) : null}
    </Stack>
  );
}
