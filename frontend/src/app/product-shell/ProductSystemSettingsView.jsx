import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useState } from "react";
import { useProductSystemSettingsWorkspace } from "./useProductSystemSettingsWorkspace.js";

function Hero() {
  return (
    <Card variant="outlined" sx={{ p: 2, background: "linear-gradient(135deg, #172554 0%, #0f766e 100%)", color: "common.white" }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
          System Settings
        </Typography>
        <Typography variant="h4">Advanced Product Defaults</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Product-wide fallback bindings and delivery defaults that the normal operator flow should rarely need to touch.
        </Typography>
      </Stack>
    </Card>
  );
}

function TargetSelect({ label, value, items, onChange, disabled = false, helperText = "" }) {
  return (
    <TextField
      select
      label={label}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      helperText={helperText}
      fullWidth
    >
      <MenuItem value="">None</MenuItem>
      {items.map((item) => (
        <MenuItem key={item.id} value={item.id}>
          {item.optionLabel ?? item.title ?? item.profileName ?? item.id}
        </MenuItem>
      ))}
    </TextField>
  );
}

function SetupTruthCard({
  remoteHealth,
  remoteLoading,
  remoteErrorMessage,
  hasBrowserDeliveryDefault,
  onOpenRemotes,
  onOpenDomains,
  onReload
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Why This Screen Exists</Typography>
            <Typography variant="body2" color="text.secondary">
              Most setup happens in `Remotes` and `Domains`. This screen only keeps the quiet fallback defaults that the rest of the product can inherit.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Setup Lives Elsewhere</Typography>
              <Typography variant="body2" color="text.secondary">
                Finish provider and delivery setup there first. Come back here only if you want product-wide fallbacks.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="text" onClick={onReload}>
                Recheck Setup
              </Button>
              <Button variant="outlined" onClick={onOpenRemotes}>
                Open Remotes
              </Button>
              <Button variant="outlined" onClick={onOpenDomains}>
                Open Domains
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              size="small"
              label={remoteHealth.hasValidatedConnection ? "Remote ready" : "Remote not ready"}
              color={remoteHealth.hasValidatedConnection ? "success" : "warning"}
            />
            <Chip
              size="small"
              label={hasBrowserDeliveryDefault ? "Delivery fallback chosen" : "Delivery fallback missing"}
              color={hasBrowserDeliveryDefault ? "success" : "warning"}
            />
            <Chip size="small" label={`Ready targets ${remoteHealth.usableTargetCount}/${remoteHealth.totalTargetCount}`} variant="outlined" />
          </Stack>

          {remoteErrorMessage ? <Alert severity="error">{remoteErrorMessage}</Alert> : null}
          {remoteLoading ? <Alert severity="info">Loading remote health...</Alert> : null}
          <Alert severity={remoteHealth.hasValidatedConnection ? "success" : "warning"}>
            {remoteHealth.message}
          </Alert>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
              <Stack spacing={0.75}>
                <Typography variant="overline" color="text.secondary">
                  First
                </Typography>
                <Typography variant="subtitle2">Remotes</Typography>
                <Typography variant="body2" color="text.secondary">
                  Validate the provider and make sure the project can serve published data, media, HTML, and delivery.
                </Typography>
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
              <Stack spacing={0.75}>
                <Typography variant="overline" color="text.secondary">
                  Then
                </Typography>
                <Typography variant="subtitle2">Domains</Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose the public delivery path you actually want visitors to reach before relying on these fallback defaults.
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function resolveTargetLabel(selection, emptyLabel = "Not selected") {
  if (!selection?.target) {
    return emptyLabel;
  }
  return selection.target.title ?? selection.target.profileName ?? selection.target.id ?? emptyLabel;
}

function BindingSummaryRow({ label, value, state = "missing" }) {
  const tone =
    state === "ready"
      ? "success"
      : state === "blocked"
      ? "warning"
      : "default";

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
      <Typography variant="body2">{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Typography variant="body2" color="text.secondary">
          {value}
        </Typography>
        <Chip size="small" label={state} color={tone} variant={state === "ready" ? "filled" : "outlined"} />
      </Stack>
    </Stack>
  );
}

function SnapshotRow({ title, detail, actionLabel, onAction }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Stack spacing={0.35}>
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {detail}
          </Typography>
        </Stack>
        <Button variant="text" onClick={onAction}>
          {actionLabel}
        </Button>
      </Stack>
    </Paper>
  );
}

function DefaultsSummaryCard({ workspace, onOpenPages, onOpenPosts, onOpenTaxonomies, onOpenMedia }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Current Fallback Defaults</Typography>
            <Typography variant="body2" color="text.secondary">
              This is the quiet inheritance layer. Downstream desks can use these defaults when they do not choose something more specific.
            </Typography>
          </Stack>
          <SnapshotRow
            title="Public page defaults"
            detail={`HTML target ${resolveTargetLabel(workspace.targetFields.deployment.selection)} • Delivery ${resolveTargetLabel(workspace.targetFields.browser.selection)} • Mount ${workspace.modules.pages?.draftValues?.appMountTagName || "app-root"}`}
            actionLabel="Open Pages"
            onAction={onOpenPages}
          />
          <SnapshotRow
            title="Published data defaults"
            detail={`Posts target ${resolveTargetLabel(workspace.targetFields.postsProjection.selection)} • Categories ${resolveTargetLabel(workspace.targetFields.categoriesProjection.selection)} • Tags ${resolveTargetLabel(workspace.targetFields.tagsProjection.selection)}`}
            actionLabel="Open Posts And Taxonomies"
            onAction={onOpenPosts}
          />
          <SnapshotRow
            title="Media library default"
            detail={`Media target ${resolveTargetLabel(workspace.targetFields.media.selection)} is used when Media needs a product fallback.`}
            actionLabel="Open Media"
            onAction={onOpenMedia}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  description,
  effect,
  overrideNote,
  onOpen,
  openLabel,
  onSave,
  saveLabel,
  saving,
  successMessage,
  children
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.5}>
              <Typography variant="h6">{title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
              {effect ? (
                <Typography variant="body2" color="text.secondary">
                  Effect: {effect}
                </Typography>
              ) : null}
              {overrideNote ? (
                <Typography variant="body2" color="text.secondary">
                  Override: {overrideNote}
                </Typography>
              ) : null}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="text" onClick={onOpen}>
                {openLabel}
              </Button>
              <Button variant="contained" onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : saveLabel}
              </Button>
            </Stack>
          </Stack>
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}

function SectionWarning({ selection }) {
  if (selection?.state !== "blocked") {
    return null;
  }
  return <Alert severity="warning">{selection.message}</Alert>;
}

export function ProductSystemSettingsView({ navigate = null }) {
  const workspace = useProductSystemSettingsWorkspace();
  const posts = workspace.modules.posts;
  const taxonomies = workspace.modules.taxonomies;
  const pages = workspace.modules.pages;
  const media = workspace.modules.media;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const hasBrowserDeliveryDefault = Boolean(
    pages?.draftValues?.remoteBrowserDeliveryTargetProfileId
  );

  function openRoute(moduleId) {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId }, { replace: false });
  }

  return (
    <Stack spacing={2}>
      <Hero />
      {workspace.errorMessage ? <Alert severity="error">{workspace.errorMessage}</Alert> : null}
      <Alert severity="info">
        Normal setup lives in `Remotes` and `Domains`. Use `System Settings` only for product-wide fallbacks and repair work.
      </Alert>
      <SetupTruthCard
        remoteHealth={workspace.remoteHealth}
        remoteLoading={workspace.remoteLoading}
        remoteErrorMessage={workspace.remoteErrorMessage}
        hasBrowserDeliveryDefault={hasBrowserDeliveryDefault}
        onOpenRemotes={() => openRoute("remotes")}
        onOpenDomains={() => openRoute("domains")}
        onReload={workspace.reloadRemotes}
      />
      <DefaultsSummaryCard
        workspace={workspace}
        onOpenPages={() => openRoute("pages")}
        onOpenPosts={() => openRoute("posts")}
        onOpenMedia={() => openRoute("media")}
      />

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Stack spacing={0.35}>
                <Typography variant="h6">Advanced Default Bindings</Typography>
                <Typography variant="body2" color="text.secondary">
                  These are the only groups most teams should ever need here: public page fallbacks, published data fallbacks, and the media library fallback.
                </Typography>
              </Stack>
              <Button variant="outlined" onClick={() => setAdvancedOpen((value) => !value)}>
                {advancedOpen ? "Hide Advanced Defaults" : "Show Advanced Defaults"}
              </Button>
            </Stack>

            {!advancedOpen ? (
              <Alert severity="info">
                Keep this collapsed unless you intentionally want to change inherited defaults for the whole product.
              </Alert>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {advancedOpen ? (
        <>
          <SectionCard
            title="Public Page Defaults"
            description="Fallback public page settings used when Pages does not choose something more specific."
            effect="Generated page HTML and public delivery inherit these defaults."
            overrideNote="Pages and release bundles can still choose more specific delivery targets."
            onOpen={() => openRoute("pages")}
            openLabel="Open Pages"
            onSave={() => workspace.saveModule("test-modules-pages")}
            saveLabel="Save Public Page Defaults"
            saving={workspace.savingByModuleId["test-modules-pages"] === true}
            successMessage={workspace.successByModuleId["test-modules-pages"]}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="HTML App Mount Tag"
                value={pages?.draftValues?.appMountTagName ?? ""}
                onChange={(event) => workspace.changeField("test-modules-pages", "appMountTagName", event.target.value)}
                helperText="Technical fallback for the page runtime mount element. Most teams should leave this as app-root."
                fullWidth
              />
              <TargetSelect
                label="Fallback Public HTML Target"
                value={pages?.draftValues?.remoteDeploymentTargetProfileId ?? ""}
                items={workspace.targetFields.deployment.options}
                onChange={(value) =>
                  workspace.changeField("test-modules-pages", "remoteDeploymentTargetProfileId", value)
                }
                disabled={workspace.targetFields.deployment.disabled}
                helperText={workspace.targetFields.deployment.helperText}
              />
              <TargetSelect
                label="Fallback Public Delivery"
                value={pages?.draftValues?.remoteBrowserDeliveryTargetProfileId ?? ""}
                items={workspace.targetFields.browser.options}
                onChange={(value) =>
                  workspace.changeField("test-modules-pages", "remoteBrowserDeliveryTargetProfileId", value)
                }
                disabled={workspace.targetFields.browser.disabled}
                helperText={workspace.targetFields.browser.helperText}
              />
            </Stack>
            <SectionWarning selection={workspace.targetFields.deployment.selection} />
            <SectionWarning selection={workspace.targetFields.browser.selection} />
          </SectionCard>

          <SectionCard
            title="Published Data Defaults"
            description="Fallback published-data targets used when Posts or Taxonomies do not choose something more specific."
            effect="Published posts, categories, and tags inherit these targets."
            overrideNote="Posts and Taxonomies can override these defaults in their own desks."
            onOpen={() => openRoute("posts")}
            openLabel="Open Posts"
            onSave={async () => {
              await workspace.saveModule("test-modules-content");
              await workspace.saveModule("test-modules-taxonomy");
            }}
            saveLabel="Save Published Data Defaults"
            saving={
              workspace.savingByModuleId["test-modules-content"] === true ||
              workspace.savingByModuleId["test-modules-taxonomy"] === true
            }
            successMessage={
              workspace.successByModuleId["test-modules-content"] ||
              workspace.successByModuleId["test-modules-taxonomy"]
            }
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TargetSelect
                label="Fallback Posts Data Target"
                value={posts?.draftValues?.remoteProjectionTargetProfileId ?? ""}
                items={workspace.targetFields.postsProjection.options}
                onChange={(value) =>
                  workspace.changeField("test-modules-content", "remoteProjectionTargetProfileId", value)
                }
                disabled={workspace.targetFields.postsProjection.disabled}
                helperText={workspace.targetFields.postsProjection.helperText}
              />
              <TargetSelect
                label="Fallback Categories Data Target"
                value={taxonomies?.draftValues?.remoteCategoriesProjectionTargetProfileId ?? ""}
                items={workspace.targetFields.categoriesProjection.options}
                onChange={(value) =>
                  workspace.changeField("test-modules-taxonomy", "remoteCategoriesProjectionTargetProfileId", value)
                }
                disabled={workspace.targetFields.categoriesProjection.disabled}
                helperText={workspace.targetFields.categoriesProjection.helperText}
              />
              <TargetSelect
                label="Fallback Tags Data Target"
                value={taxonomies?.draftValues?.remoteTagsProjectionTargetProfileId ?? ""}
                items={workspace.targetFields.tagsProjection.options}
                onChange={(value) =>
                  workspace.changeField("test-modules-taxonomy", "remoteTagsProjectionTargetProfileId", value)
                }
                disabled={workspace.targetFields.tagsProjection.disabled}
                helperText={workspace.targetFields.tagsProjection.helperText}
              />
            </Stack>
            <SectionWarning selection={workspace.targetFields.postsProjection.selection} />
            <SectionWarning selection={workspace.targetFields.categoriesProjection.selection} />
            <SectionWarning selection={workspace.targetFields.tagsProjection.selection} />
          </SectionCard>

          <SectionCard
            title="Media Library Default"
            description="Fallback media-library target used when Media needs a product-wide default."
            effect="Media compare, sync, and restore use this target unless Media chooses another one."
            overrideNote="The Media desk can still point at a more specific target when needed."
            onOpen={() => openRoute("media")}
            openLabel="Open Media"
            onSave={() => workspace.saveModule("test-modules-media-manager")}
            saveLabel="Save Media Library Default"
            saving={workspace.savingByModuleId["test-modules-media-manager"] === true}
            successMessage={workspace.successByModuleId["test-modules-media-manager"]}
          >
            <TargetSelect
              label="Fallback Media Library Target"
              value={media?.draftValues?.remoteMediaTargetProfileId ?? ""}
              items={workspace.targetFields.media.options}
              onChange={(value) =>
                workspace.changeField("test-modules-media-manager", "remoteMediaTargetProfileId", value)
              }
              disabled={workspace.targetFields.media.disabled}
              helperText={workspace.targetFields.media.helperText}
            />
            <SectionWarning selection={workspace.targetFields.media.selection} />
          </SectionCard>
        </>
      ) : null}

      {workspace.loading ? <Alert severity="info">Loading system settings...</Alert> : null}
    </Stack>
  );
}
