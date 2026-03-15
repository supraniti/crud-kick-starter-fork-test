import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useProductSystemSettingsWorkspace } from "./useProductSystemSettingsWorkspace.js";

function Hero() {
  return (
    <Card variant="outlined" sx={{ p: 2, background: "linear-gradient(135deg, #172554 0%, #0f766e 100%)", color: "common.white" }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
          System Settings
        </Typography>
        <Typography variant="h4">Global Control Surface</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Cross-module settings that currently shape delivery, projection, and media sync.
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

function RemoteHealthCard({ remoteHealth, remoteLoading, remoteErrorMessage, onOpenRemotes, onReload }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Remote Readiness</Typography>
              <Typography variant="body2" color="text.secondary">
                Product-level remote bindings stay locked until at least one validated connection exists.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="text" onClick={onReload}>
                Reload Remote State
              </Button>
              <Button variant="outlined" onClick={onOpenRemotes}>
                Open Remotes
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`Validated connections: ${remoteHealth.validatedConnectionCount}/${remoteHealth.totalConnectionCount}`} color={remoteHealth.hasValidatedConnection ? "success" : "warning"} />
            <Chip size="small" label={`Ready targets: ${remoteHealth.usableTargetCount}/${remoteHealth.totalTargetCount}`} color={remoteHealth.usableTargetCount > 0 ? "success" : "warning"} />
            <Chip size="small" label={`Pages delivery: ${remoteHealth.usableTargetsByKind["deployment-storage"] ?? 0}`} variant="outlined" />
            <Chip size="small" label={`Posts projection: ${remoteHealth.usableProjectionScopes["published-blog-posts"] ?? 0}`} variant="outlined" />
            <Chip size="small" label={`Categories projection: ${remoteHealth.usableProjectionScopes["public-blog-categories"] ?? 0}`} variant="outlined" />
            <Chip size="small" label={`Tags projection: ${remoteHealth.usableProjectionScopes["public-blog-tags"] ?? 0}`} variant="outlined" />
            <Chip size="small" label={`Media sync: ${remoteHealth.usableTargetsByKind["media-storage"] ?? 0}`} variant="outlined" />
            <Chip size="small" label={`Domains: ${remoteHealth.usableTargetsByKind["browser-delivery"] ?? 0}`} variant="outlined" />
          </Stack>

          {remoteErrorMessage ? <Alert severity="error">{remoteErrorMessage}</Alert> : null}
          {remoteLoading ? <Alert severity="info">Loading remote health...</Alert> : null}
          <Alert severity={remoteHealth.hasValidatedConnection ? "success" : "warning"}>
            {remoteHealth.message}
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  description,
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
      <RemoteHealthCard
        remoteHealth={workspace.remoteHealth}
        remoteLoading={workspace.remoteLoading}
        remoteErrorMessage={workspace.remoteErrorMessage}
        onOpenRemotes={() => openRoute("test-modules-remote-ops")}
        onReload={workspace.reloadRemotes}
      />
      <Alert severity="info">
        This pass does not invent a new backend settings model. It surfaces the existing module-owned settings that
        already drive projection, deployment, browser delivery, and media sync.
      </Alert>

      <SectionCard
        title="Pages Delivery"
        description="Mount tag, deployment target, and browser-delivery target consumed by the Pages desk and HTML generation."
        onOpen={() => openRoute("test-modules-pages")}
        openLabel="Open Pages"
        onSave={() => workspace.saveModule("test-modules-pages")}
        saveLabel="Save Pages Settings"
        saving={workspace.savingByModuleId["test-modules-pages"] === true}
        successMessage={workspace.successByModuleId["test-modules-pages"]}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="App Mount Tag Name"
            value={pages?.draftValues?.appMountTagName ?? ""}
            onChange={(event) => workspace.changeField("test-modules-pages", "appMountTagName", event.target.value)}
            fullWidth
          />
          <TargetSelect
            label="Remote Deployment Target"
            value={pages?.draftValues?.remoteDeploymentTargetProfileId ?? ""}
            items={workspace.targetFields.deployment.options}
            onChange={(value) =>
              workspace.changeField("test-modules-pages", "remoteDeploymentTargetProfileId", value)
            }
            disabled={workspace.targetFields.deployment.disabled}
            helperText={workspace.targetFields.deployment.helperText}
          />
          <TargetSelect
            label="Remote Browser Delivery Target"
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
        title="Posts Projection"
        description="Remote Firestore projection target used by the Posts desk."
        onOpen={() => openRoute("test-modules-content")}
        openLabel="Open Posts"
        onSave={() => workspace.saveModule("test-modules-content")}
        saveLabel="Save Posts Settings"
        saving={workspace.savingByModuleId["test-modules-content"] === true}
        successMessage={workspace.successByModuleId["test-modules-content"]}
      >
        <TargetSelect
          label="Remote Projection Target"
          value={posts?.draftValues?.remoteProjectionTargetProfileId ?? ""}
          items={workspace.targetFields.postsProjection.options}
          onChange={(value) =>
            workspace.changeField("test-modules-content", "remoteProjectionTargetProfileId", value)
          }
          disabled={workspace.targetFields.postsProjection.disabled}
          helperText={workspace.targetFields.postsProjection.helperText}
        />
        <SectionWarning selection={workspace.targetFields.postsProjection.selection} />
      </SectionCard>

      <SectionCard
        title="Taxonomies Projection"
        description="Remote Firestore targets used by the Taxonomies desk for public categories and public tags."
        onOpen={() => openRoute("test-modules-taxonomy")}
        openLabel="Open Taxonomies"
        onSave={() => workspace.saveModule("test-modules-taxonomy")}
        saveLabel="Save Taxonomy Settings"
        saving={workspace.savingByModuleId["test-modules-taxonomy"] === true}
        successMessage={workspace.successByModuleId["test-modules-taxonomy"]}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TargetSelect
            label="Remote Categories Projection Target"
            value={taxonomies?.draftValues?.remoteCategoriesProjectionTargetProfileId ?? ""}
            items={workspace.targetFields.categoriesProjection.options}
            onChange={(value) =>
              workspace.changeField("test-modules-taxonomy", "remoteCategoriesProjectionTargetProfileId", value)
            }
            disabled={workspace.targetFields.categoriesProjection.disabled}
            helperText={workspace.targetFields.categoriesProjection.helperText}
          />
          <TargetSelect
            label="Remote Tags Projection Target"
            value={taxonomies?.draftValues?.remoteTagsProjectionTargetProfileId ?? ""}
            items={workspace.targetFields.tagsProjection.options}
            onChange={(value) =>
              workspace.changeField("test-modules-taxonomy", "remoteTagsProjectionTargetProfileId", value)
            }
            disabled={workspace.targetFields.tagsProjection.disabled}
            helperText={workspace.targetFields.tagsProjection.helperText}
          />
        </Stack>
        <SectionWarning selection={workspace.targetFields.categoriesProjection.selection} />
        <SectionWarning selection={workspace.targetFields.tagsProjection.selection} />
      </SectionCard>

      <SectionCard
        title="Media Sync"
        description="Remote media target used by the Media desk for compare, sync, and restore."
        onOpen={() => openRoute("test-modules-media-manager")}
        openLabel="Open Media"
        onSave={() => workspace.saveModule("test-modules-media-manager")}
        saveLabel="Save Media Settings"
        saving={workspace.savingByModuleId["test-modules-media-manager"] === true}
        successMessage={workspace.successByModuleId["test-modules-media-manager"]}
      >
        <TargetSelect
          label="Remote Media Target"
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

      {workspace.loading ? <Alert severity="info">Loading system settings...</Alert> : null}
    </Stack>
  );
}
