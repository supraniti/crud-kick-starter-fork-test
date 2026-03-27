import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReferenceCollectionItem,
  deleteReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../../frontend/src/api/reference.js";
import { DEPLOYMENT_SYNC_COMPLETED_EVENT } from "../../../frontend/src/app/product-shell/deployment-command-center-events.js";
import { SyncPostureChip } from "../../../frontend/src/ui/SyncPostureChip.jsx";
import { fetchDeskPages } from "../../test-modules-pages/frontend/blog-distribution-workspace-support.js";
import {
  GOOGLE_FONT_OPTIONS,
  PREDEFINED_THEME_DOCUMENTS,
  SCREEN_PROFILE_IDS,
  resolveThemeDocumentForPreview,
  serializeThemeDocument
} from "../shared/theme-document.mjs";
import { resolveThemeDeploymentState } from "./theme-deployment-state.js";

const THEMES_COLLECTION_ID = "page-themes";

function createEmptyThemeDraft() {
  const starter = PREDEFINED_THEME_DOCUMENTS[0];
  return {
    title: "New Theme",
    themeKey: "new-theme",
    summary: "",
    status: "draft",
    isGlobalDefault: false,
    themeDocument: {
      ...starter,
      title: "New Theme",
      themeKey: "new-theme"
    }
  };
}

function createThemeDraftFromItem(item) {
  return {
    title: item?.title ?? "",
    themeKey: item?.themeKey ?? "",
    summary: item?.summary ?? "",
    status: item?.status ?? "draft",
    isGlobalDefault: item?.isGlobalDefault === true,
    themeDocument: item?.themeDocument ?? PREDEFINED_THEME_DOCUMENTS[0]
  };
}

function readThemeSourceLabel(item) {
  if (item?.isGlobalDefault) {
    return "Global default";
  }
  return item?.status === "ready" ? "Ready" : "Draft";
}

function createPreviewFrameWidth(screenProfile) {
  if (screenProfile === "tablet") {
    return 820;
  }
  if (screenProfile === "mobile") {
    return 420;
  }
  return 1180;
}

function buildThemePayloadFromDraft(draft) {
  const normalizedThemeDocument = resolveThemeDocumentForPreview({
    ...draft.themeDocument,
    title: draft.title,
    themeKey: draft.themeKey
  });
  return {
    title: draft.title,
    themeKey: draft.themeKey,
    summary: draft.summary || null,
    status: draft.status,
    isGlobalDefault: draft.isGlobalDefault === true,
    themeDocumentJson: serializeThemeDocument(normalizedThemeDocument)
  };
}

function buildSeedThemeItems() {
  return PREDEFINED_THEME_DOCUMENTS.map((themeDocument, index) => ({
    title: themeDocument.title,
    themeKey: themeDocument.themeKey,
    summary:
      index === 0
        ? "Warm editorial serif system seeded as the global default."
        : `${themeDocument.title} seeded starter theme.`,
    status: "ready",
    isGlobalDefault: index === 0,
    themeDocumentJson: serializeThemeDocument(themeDocument)
  }));
}

async function ensurePersistedThemeCatalog() {
  for (const themeItem of buildSeedThemeItems()) {
    await createReferenceCollectionItem({
      collectionId: THEMES_COLLECTION_ID,
      item: themeItem
    });
  }
}

function ThemeFontFields({ labelPrefix, role, draft, setDraft }) {
  const fontRole = draft.themeDocument.fontModel?.[role] ?? { source: "google", family: "" };
  const setFontRole = (patch) => {
    setDraft((previous) => ({
      ...previous,
      themeDocument: {
        ...previous.themeDocument,
        fontModel: {
          ...(previous.themeDocument.fontModel ?? {}),
          [role]: {
            ...(previous.themeDocument.fontModel?.[role] ?? {}),
            ...patch
          }
        }
      }
    }));
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          select
          label={`${labelPrefix} Font Source`}
          value={fontRole.source ?? "google"}
          onChange={(event) => setFontRole({ source: event.target.value })}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="google">Google</MenuItem>
          <MenuItem value="custom">Custom CSS URL</MenuItem>
        </TextField>
        {fontRole.source === "google" ? (
          <TextField
            select
            label={`${labelPrefix} Font Family`}
            value={fontRole.family ?? ""}
            onChange={(event) => setFontRole({ family: event.target.value })}
            sx={{ minWidth: 240 }}
          >
            {GOOGLE_FONT_OPTIONS.map((option) => (
              <MenuItem key={option.family} value={option.family}>
                {option.family}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <>
            <TextField
              label={`${labelPrefix} Family`}
              value={fontRole.family ?? ""}
              onChange={(event) => setFontRole({ family: event.target.value })}
            />
            <TextField
              label={`${labelPrefix} Stylesheet URL`}
              value={fontRole.stylesheetUrl ?? ""}
              onChange={(event) => setFontRole({ stylesheetUrl: event.target.value })}
            />
          </>
        )}
      </Stack>
    </Stack>
  );
}

function ThemeColorFields({ draft, setDraft }) {
  const colorModel = draft.themeDocument.colorModel ?? {};
  const updateColor = (key, value) => {
    setDraft((previous) => ({
      ...previous,
      themeDocument: {
        ...previous.themeDocument,
        colorModel: {
          ...(previous.themeDocument.colorModel ?? {}),
          [key]: value
        }
      }
    }));
  };

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2} useFlexGap flexWrap="wrap">
      {["primary", "secondary", "accent", "surface", "background"].map((key) => (
        <TextField
          key={key}
          type="color"
          label={key[0].toUpperCase() + key.slice(1)}
          value={colorModel[key] ?? "#000000"}
          onChange={(event) => updateColor(key, event.target.value)}
          sx={{ width: 140 }}
          InputLabelProps={{ shrink: true }}
        />
      ))}
    </Stack>
  );
}

function ThemeTypographyFields({ draft, setDraft, screenProfile }) {
  const screen = draft.themeDocument.typographyModel?.[screenProfile] ?? {};
  const updateToken = (token, field, value) => {
    setDraft((previous) => ({
      ...previous,
      themeDocument: {
        ...previous.themeDocument,
        typographyModel: {
          ...(previous.themeDocument.typographyModel ?? {}),
          [screenProfile]: {
            ...(previous.themeDocument.typographyModel?.[screenProfile] ?? {}),
            [token]: {
              ...(previous.themeDocument.typographyModel?.[screenProfile]?.[token] ?? {}),
              [field]: field === "lineHeight" || field === "fontWeight" ? Number(value) : value
            }
          }
        }
      }
    }));
  };

  return (
    <Stack spacing={1.5}>
      {["h1", "h2", "h3", "body", "caption"].map((token) => (
        <Stack key={token} direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            label={`${token.toUpperCase()} Size`}
            value={screen[token]?.fontSize ?? ""}
            onChange={(event) => updateToken(token, "fontSize", event.target.value)}
          />
          <TextField
            label={`${token.toUpperCase()} Line Height`}
            type="number"
            value={screen[token]?.lineHeight ?? ""}
            onChange={(event) => updateToken(token, "lineHeight", event.target.value)}
            inputProps={{ step: 0.01, min: 0.8, max: 3 }}
          />
          <TextField
            label={`${token.toUpperCase()} Weight`}
            type="number"
            value={screen[token]?.fontWeight ?? ""}
            onChange={(event) => updateToken(token, "fontWeight", event.target.value)}
            inputProps={{ step: 100, min: 100, max: 900 }}
          />
        </Stack>
      ))}
    </Stack>
  );
}

function ThemeSpacingFields({ draft, setDraft, screenProfile }) {
  const screen = draft.themeDocument.spacingModel?.[screenProfile] ?? {};
  const updateSpacing = (field, value) => {
    setDraft((previous) => ({
      ...previous,
      themeDocument: {
        ...previous.themeDocument,
        spacingModel: {
          ...(previous.themeDocument.spacingModel ?? {}),
          [screenProfile]: {
            ...(previous.themeDocument.spacingModel?.[screenProfile] ?? {}),
            [field]: Number(value)
          }
        }
      }
    }));
  };

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
      {[
        ["pageGutter", "Page Gutter"],
        ["sectionGap", "Section Gap"],
        ["blockGap", "Block Gap"],
        ["radius", "Radius"]
      ].map(([field, label]) => (
        <TextField
          key={field}
          label={label}
          type="number"
          value={screen[field] ?? ""}
          onChange={(event) => updateSpacing(field, event.target.value)}
        />
      ))}
    </Stack>
  );
}

function ThemePreview({ draft, screenProfile }) {
  const resolvedTheme = useMemo(
    () =>
      resolveThemeDocumentForPreview({
        ...draft.themeDocument,
        title: draft.title,
        themeKey: draft.themeKey
      }),
    [draft]
  );
  const screenVariables = resolvedTheme.resolved.variables[screenProfile] ?? resolvedTheme.resolved.variables.desktop;
  const previewWidth = createPreviewFrameWidth(screenProfile);

  useEffect(() => {
    const styleId = "theme-preview-fonts";
    let styleNode = document.getElementById(styleId);
    if (!styleNode) {
      styleNode = document.createElement("style");
      styleNode.id = styleId;
      document.head.appendChild(styleNode);
    }
    styleNode.textContent = resolvedTheme.resolved.stylesheetUrls
      .map((url) => `@import url('${url}');`)
      .join("\n");
  }, [resolvedTheme]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        overflow: "auto",
        backgroundColor: "#d8e1eb"
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center"
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: `${previewWidth}px`,
            borderRadius: 4,
            border: "1px solid rgba(15,23,42,0.08)",
            backgroundColor: "var(--page-bg)",
            color: "var(--page-ink)",
            boxShadow: "var(--page-shadow)",
            overflow: "hidden",
            ...screenVariables
          }}
        >
          <Box
            sx={{
              p: "var(--page-gutter)",
              display: "grid",
              gap: "var(--page-section-gap)",
              fontFamily: "var(--page-body-font)"
            }}
          >
            <Box
              sx={{
                p: 3,
                borderRadius: "var(--page-radius)",
                border: "1px solid var(--page-line)",
                background: "linear-gradient(180deg, color-mix(in srgb, var(--page-card) 96%, white 4%), color-mix(in srgb, var(--page-bg) 92%, white 8%))"
              }}
            >
              <Typography
                sx={{
                  fontSize: "var(--page-caption-size)",
                  fontWeight: "var(--page-caption-weight)",
                  lineHeight: "var(--page-caption-line-height)",
                  color: "var(--page-accent)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  mb: 1
                }}
              >
                Theme Preview
              </Typography>
              <Typography
                component="h1"
                sx={{
                  fontFamily: "var(--page-heading-font)",
                  fontSize: "var(--page-h1-size)",
                  lineHeight: "var(--page-h1-line-height)",
                  fontWeight: "var(--page-h1-weight)",
                  letterSpacing: "var(--page-h1-letter-spacing)",
                  mb: 1.5
                }}
              >
                {draft.title || "Untitled Theme"}
              </Typography>
              <Typography
                sx={{
                  fontSize: "var(--page-body-size)",
                  lineHeight: "var(--page-body-line-height)",
                  color: "var(--page-muted)",
                  maxWidth: "64ch"
                }}
              >
                This preview shows how titles, body copy, chips, surfaces, and navigation affordances will inherit the authored theme.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label="Category" sx={{ bgcolor: "var(--page-accent-soft)", color: "var(--page-accent)" }} />
              <Chip label="Release Note" sx={{ bgcolor: "var(--page-card)", borderColor: "var(--page-line)" }} variant="outlined" />
              <Button variant="contained" sx={{ bgcolor: "var(--page-accent)", borderRadius: 999 }}>
                Primary action
              </Button>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gap: "var(--page-block-gap)",
                gridTemplateColumns: { xs: "1fr", md: "1.6fr 1fr" }
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  borderRadius: "var(--page-radius)",
                  borderColor: "var(--page-line)",
                  bgcolor: "var(--page-card)",
                  boxShadow: "var(--page-shadow)"
                }}
              >
                <CardContent>
                  <Typography
                    sx={{
                      fontFamily: "var(--page-heading-font)",
                      fontSize: "var(--page-h2-size)",
                      lineHeight: "var(--page-h2-line-height)",
                      fontWeight: "var(--page-h2-weight)",
                      letterSpacing: "var(--page-h2-letter-spacing)",
                      mb: 1.5
                    }}
                  >
                    Story Card
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "var(--page-body-size)",
                      lineHeight: "var(--page-body-line-height)",
                      mb: 2
                    }}
                  >
                    Operators should be able to feel the reading rhythm here before releasing the theme.
                  </Typography>
                  <Box
                    sx={{
                      height: 180,
                      borderRadius: "calc(var(--page-radius) - 6px)",
                      background:
                        "linear-gradient(135deg, color-mix(in srgb, var(--page-primary) 32%, white 68%), color-mix(in srgb, var(--page-secondary) 20%, var(--page-bg) 80%))"
                    }}
                  />
                </CardContent>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  borderRadius: "var(--page-radius)",
                  borderColor: "var(--page-line)",
                  bgcolor: "color-mix(in srgb, var(--page-card) 84%, var(--page-bg) 16%)"
                }}
              >
                <CardContent>
                  <Typography
                    sx={{
                      fontFamily: "var(--page-heading-font)",
                      fontSize: "var(--page-h3-size)",
                      lineHeight: "var(--page-h3-line-height)",
                      fontWeight: "var(--page-h3-weight)",
                      letterSpacing: "var(--page-h3-letter-spacing)",
                      mb: 1
                    }}
                  >
                    Side Rail
                  </Typography>
                  <Typography sx={{ fontSize: "var(--page-caption-size)", color: "var(--page-muted)", mb: 1.5 }}>
                    Caption rhythm and muted ink need to remain legible on every screen profile.
                  </Typography>
                  <Divider sx={{ borderColor: "var(--page-line)", mb: 1.5 }} />
                  <Stack spacing={1}>
                    <Typography sx={{ fontSize: "var(--page-body-size)" }}>Adjacent story</Typography>
                    <Typography sx={{ fontSize: "var(--page-body-size)" }}>Author card</Typography>
                    <Typography sx={{ fontSize: "var(--page-body-size)" }}>Related stories</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

export function ThemesView({ activeModuleLabel }) {
  const [items, setItems] = useState([]);
  const [deploymentPages, setDeploymentPages] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState(null);
  const [draft, setDraft] = useState(createEmptyThemeDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [deploymentErrorMessage, setDeploymentErrorMessage] = useState(null);
  const [screenProfile, setScreenProfile] = useState("desktop");
  const selectedTheme = items.find((item) => item.id === selectedThemeId) ?? null;
  const globalDefaultThemeKey = items.find((item) => item?.isGlobalDefault === true)?.themeKey ?? "";
  const deploymentAwareItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        deploymentState: resolveThemeDeploymentState(item, deploymentPages, globalDefaultThemeKey)
      })),
    [deploymentPages, globalDefaultThemeKey, items]
  );

  const loadDeploymentPages = useCallback(async () => {
    try {
      setDeploymentErrorMessage(null);
      setDeploymentPages(await fetchDeskPages());
    } catch (error) {
      setDeploymentPages([]);
      setDeploymentErrorMessage(error?.message ?? "Failed to load theme deployment posture");
    }
  }, []);

  const loadThemes = async (preferredThemeId = null) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      let payload = await fetchReferenceCollectionItems({
        collectionId: THEMES_COLLECTION_ID,
        limit: 200
      });
      let nextItems = Array.isArray(payload?.items) ? payload.items : [];
      if (nextItems.length === 0) {
        await ensurePersistedThemeCatalog();
        payload = await fetchReferenceCollectionItems({
          collectionId: THEMES_COLLECTION_ID,
          limit: 200
        });
        nextItems = Array.isArray(payload?.items) ? payload.items : [];
      }
      setItems(nextItems);
      const nextSelectedTheme =
        nextItems.find((item) => item.id === preferredThemeId) ??
        nextItems.find((item) => item.id === selectedThemeId) ??
        nextItems[0] ??
        null;
      setSelectedThemeId(nextSelectedTheme?.id ?? null);
      setDraft(nextSelectedTheme ? createThemeDraftFromItem(nextSelectedTheme) : createEmptyThemeDraft());
    } catch (error) {
      setErrorMessage(error?.message ?? "Failed to load themes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadThemes();
  }, []);

  useEffect(() => {
    void loadDeploymentPages();
  }, [loadDeploymentPages]);

  useEffect(() => {
    function handleDeploymentSyncCompleted() {
      void loadDeploymentPages();
    }

    window.addEventListener(DEPLOYMENT_SYNC_COMPLETED_EVENT, handleDeploymentSyncCompleted);
    return () => {
      window.removeEventListener(DEPLOYMENT_SYNC_COMPLETED_EVENT, handleDeploymentSyncCompleted);
    };
  }, [loadDeploymentPages]);

  const selectTheme = (item) => {
    setSelectedThemeId(item?.id ?? null);
    setDraft(item ? createThemeDraftFromItem(item) : createEmptyThemeDraft());
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const persistTheme = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = buildThemePayloadFromDraft(draft);
      const result = selectedTheme
        ? await updateReferenceCollectionItem({
            collectionId: THEMES_COLLECTION_ID,
            itemId: selectedTheme.id,
            item: payload
          })
        : await createReferenceCollectionItem({
            collectionId: THEMES_COLLECTION_ID,
            item: payload
          });

      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to save theme");
      }
      const savedId = result.item?.id ?? selectedTheme?.id ?? null;
      await loadThemes(savedId);
      setSuccessMessage(selectedTheme ? "Theme updated" : "Theme created");
    } catch (error) {
      setErrorMessage(error?.message ?? "Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  const deleteTheme = async () => {
    if (!selectedTheme) {
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await deleteReferenceCollectionItem({
        collectionId: THEMES_COLLECTION_ID,
        itemId: selectedTheme.id
      });
      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to delete theme");
      }
      setSelectedThemeId(null);
      setDraft(createEmptyThemeDraft());
      await loadThemes();
      setSuccessMessage("Theme deleted");
    } catch (error) {
      setErrorMessage(error?.message ?? "Failed to delete theme");
    } finally {
      setSaving(false);
    }
  };

  const duplicateTheme = () => {
    const source = selectedTheme ? createThemeDraftFromItem(selectedTheme) : createEmptyThemeDraft();
    const duplicatedKey = `${source.themeKey || "theme"}-copy`;
    setSelectedThemeId(null);
    setDraft({
      ...source,
      title: `${source.title} Copy`,
      themeKey: duplicatedKey,
      isGlobalDefault: false,
      themeDocument: {
        ...source.themeDocument,
        title: `${source.title} Copy`,
        themeKey: duplicatedKey
      }
    });
    setSuccessMessage("Duplicate prepared. Save to create a new theme.");
    setErrorMessage(null);
  };

  return (
    <Box
      sx={{
        minHeight: "100%",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "320px minmax(0, 1fr)" },
        gap: 2,
        p: 2
      }}
    >
      <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 1.5, alignContent: "start" }}>
        <Typography variant="overline" color="text.secondary">
          {activeModuleLabel}
        </Typography>
        <Typography variant="h5">Theme Library</Typography>
        <Typography variant="body2" color="text.secondary">
          Theme records define fonts, palette, typography rhythm, spacing, and the default site visual language.
        </Typography>
        <Button variant="contained" onClick={() => selectTheme(null)}>
          New Theme
        </Button>
        {loading ? <Alert severity="info">Loading themes...</Alert> : null}
        {deploymentAwareItems.map((item) => (
          <Paper
            key={item.id}
            variant={selectedThemeId === item.id ? "elevation" : "outlined"}
            elevation={selectedThemeId === item.id ? 3 : 0}
            sx={{
              p: 1.5,
              cursor: "pointer",
              borderColor: selectedThemeId === item.id ? "primary.main" : "divider"
            }}
            onClick={() => selectTheme(item)}
          >
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                <Typography fontWeight={700}>{item.title}</Typography>
                <Chip
                  size="small"
                  label={readThemeSourceLabel(item)}
                  color={item.isGlobalDefault ? "success" : "default"}
                />
                <SyncPostureChip
                  label={item.deploymentState?.label ?? "Unknown"}
                  tone={item.deploymentState?.tone ?? "default"}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {item.summary || item.themeKey}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.deploymentState?.detail ?? ""}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Paper>

      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 2 }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "center" }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h5">{selectedTheme ? selectedTheme.title : "New Theme"}</Typography>
              <Typography variant="body2" color="text.secondary">
                Theme choices can be set as the global default or selected explicitly from Pages.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button variant="outlined" onClick={duplicateTheme}>
                Duplicate
              </Button>
              <Button variant="contained" onClick={persistTheme} disabled={saving}>
                {saving ? "Saving..." : selectedTheme ? "Save Theme" : "Create Theme"}
              </Button>
              <Button variant="outlined" color="warning" onClick={deleteTheme} disabled={!selectedTheme || saving}>
                Delete
              </Button>
            </Stack>
          </Stack>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
          {deploymentErrorMessage ? <Alert severity="warning">{deploymentErrorMessage}</Alert> : null}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Theme Title"
              value={draft.title}
              onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
            />
            <TextField
              label="Theme Key"
              value={draft.themeKey}
              onChange={(event) => setDraft((previous) => ({ ...previous, themeKey: event.target.value }))}
            />
            <TextField
              select
              label="Status"
              value={draft.status}
              onChange={(event) => setDraft((previous) => ({ ...previous, status: event.target.value }))}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="draft">draft</MenuItem>
              <MenuItem value="ready">ready</MenuItem>
              <MenuItem value="archived">archived</MenuItem>
            </TextField>
          </Stack>

          <TextField
            label="Summary"
            value={draft.summary}
            onChange={(event) => setDraft((previous) => ({ ...previous, summary: event.target.value }))}
            multiline
            minRows={2}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={draft.isGlobalDefault}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    isGlobalDefault: event.target.checked
                  }))
                }
              />
            }
            label="Use this as the global default theme"
          />

          <Divider />

          <Typography variant="h6">Fonts</Typography>
          <ThemeFontFields labelPrefix="Heading" role="heading" draft={draft} setDraft={setDraft} />
          <ThemeFontFields labelPrefix="Body" role="body" draft={draft} setDraft={setDraft} />

          <Divider />

          <Typography variant="h6">Colors</Typography>
          <ThemeColorFields draft={draft} setDraft={setDraft} />

          <Divider />

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Typography variant="h6">Responsive Typography And Spacing</Typography>
            <Tabs
              value={screenProfile}
              onChange={(_event, value) => setScreenProfile(value)}
              sx={{ minHeight: 0 }}
            >
              {SCREEN_PROFILE_IDS.map((profile) => (
                <Tab key={profile} value={profile} label={profile} />
              ))}
            </Tabs>
          </Stack>

          <ThemeTypographyFields draft={draft} setDraft={setDraft} screenProfile={screenProfile} />
          <ThemeSpacingFields draft={draft} setDraft={setDraft} screenProfile={screenProfile} />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 1.5 }}>
          <Typography variant="h6">Live Preview</Typography>
          <Typography variant="body2" color="text.secondary">
            This preview uses the same resolved theme document shape that deployed pages consume.
          </Typography>
          <ThemePreview draft={draft} screenProfile={screenProfile} />
        </Paper>
      </Stack>
    </Box>
  );
}
