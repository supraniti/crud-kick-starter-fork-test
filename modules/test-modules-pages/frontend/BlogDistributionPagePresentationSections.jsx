import {
  Alert,
  Button,
  MenuItem,
  Stack,
  TextField
} from "@mui/material";
import {
  HERO_VARIANT_OPTIONS,
  TEMPLATE_KEY_OPTIONS
} from "./blog-distribution-panel-support.js";

function PagePresentationSection({ workspace }) {
  const usingReusableLayout = Boolean(workspace.pageDraft.layoutId);
  const openLayoutLabel = usingReusableLayout ? "Edit Selected Layout" : "Open Layouts";
  const safeLayoutId = workspace.layoutOptions.some((option) => option.id === workspace.pageDraft.layoutId)
    ? workspace.pageDraft.layoutId
    : "";
  const currentThemeOption = workspace.themeOptions.find(
    (option) => option.themeKey === workspace.pageDraft.themeKey
  );
  const safeThemeKey = currentThemeOption?.themeKey ?? (workspace.pageDraft.themeKey || "");
  const defaultGlobalThemeLabel = workspace.defaultGlobalTheme?.title ?? "the global default theme";

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          select
          label="Layout Record"
          value={safeLayoutId}
          onChange={(event) => workspace.changePageField("layoutId", event.target.value)}
          sx={{ minWidth: 240 }}
          helperText="Reusable layouts are managed from the Layouts module."
        >
          <MenuItem value="">Legacy Inline Layout</MenuItem>
          {workspace.layoutOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: "flex-start" }}>
          <Button variant="outlined" onClick={workspace.openLayoutBuilder}>
            {openLayoutLabel}
          </Button>
          {usingReusableLayout ? (
            <Alert severity="info" sx={{ alignItems: "center" }}>
              This page uses a reusable layout record. Inline layout controls are kept only as a compatibility fallback.
            </Alert>
          ) : null}
        </Stack>
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          select
          label="Theme"
          value={safeThemeKey}
          onChange={(event) => workspace.changePageField("themeKey", event.target.value)}
          sx={{ minWidth: 240 }}
          helperText={
            safeThemeKey
              ? "This page overrides the global default theme."
              : `This page currently inherits ${defaultGlobalThemeLabel}.`
          }
        >
          <MenuItem value="">Use Global Default</MenuItem>
          {workspace.themeOptions.map((option) => (
            <MenuItem key={option.themeKey} value={option.themeKey}>
              {option.label}
              {option.isGlobalDefault ? " (Global Default)" : ""}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {!usingReusableLayout ? (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Layout Key"
            value={workspace.pageDraft.layoutKey}
            onChange={(event) => workspace.changePageField("layoutKey", event.target.value)}
          />
          <TextField
            select
            label="Template"
            value={workspace.pageDraft.templateKey}
            onChange={(event) => workspace.changePageField("templateKey", event.target.value)}
            sx={{ minWidth: 200 }}
          >
            {TEMPLATE_KEY_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Hero Variant"
            value={workspace.pageDraft.heroVariant}
            onChange={(event) => workspace.changePageField("heroVariant", event.target.value)}
            sx={{ minWidth: 180 }}
          >
            {HERO_VARIANT_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      ) : null}
    </Stack>
  );
}

function PageBindingSection({ workspace }) {
  const usingReusableLayout = Boolean(workspace.pageDraft.layoutId);

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <TextField
        label="Hero Binding"
        value={workspace.pageDraft.heroBinding}
        onChange={(event) => workspace.changePageField("heroBinding", event.target.value)}
        disabled={usingReusableLayout}
      />
      <TextField
        label="Body Binding"
        value={workspace.pageDraft.bodyBinding}
        onChange={(event) => workspace.changePageField("bodyBinding", event.target.value)}
        disabled={usingReusableLayout}
      />
      <TextField
        label="Supporting Binding"
        value={workspace.pageDraft.supportingBinding}
        onChange={(event) => workspace.changePageField("supportingBinding", event.target.value)}
        disabled={usingReusableLayout}
      />
      <TextField
        label="Section Order"
        value={workspace.pageDraft.sectionOrderText}
        onChange={(event) => workspace.changePageField("sectionOrderText", event.target.value)}
        helperText="Comma separated: hero, body, supporting"
        disabled={usingReusableLayout}
      />
    </Stack>
  );
}

export { PageBindingSection, PagePresentationSection };
