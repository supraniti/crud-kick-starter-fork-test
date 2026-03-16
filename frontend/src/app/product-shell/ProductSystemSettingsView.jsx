import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
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

function SetupFlowCard({ remoteHealth, pages, onOpenRemotes, onOpenDomains }) {
  const hasBrowserDeliveryDefault = Boolean(
    pages?.draftValues?.remoteBrowserDeliveryTargetProfileId
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Normal Setup Flow</Typography>
            <Typography variant="body2" color="text.secondary">
              A new operator should finish setup in `Remotes` first and `Domains` second. This route only holds fallback defaults for downstream desks.
            </Typography>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent>
                <Stack spacing={1.25}>
                  <Stack spacing={0.25}>
                    <Typography variant="overline" color="text.secondary">
                      Step 1
                    </Typography>
                    <Typography variant="subtitle1">Remotes</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Validate the provider, prepare the managed services, and confirm the project can serve posts, taxonomies, media, HTML, and browser delivery.
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip
                      size="small"
                      label={remoteHealth.hasValidatedConnection ? "Validated remote ready" : "Remote not ready"}
                      color={remoteHealth.hasValidatedConnection ? "success" : "warning"}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Managed targets: ${remoteHealth.usableTargetCount}/${remoteHealth.totalTargetCount}`}
                    />
                  </Stack>
                  <Button variant="contained" onClick={onOpenRemotes}>
                    Open Remotes
                  </Button>
                </Stack>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent>
                <Stack spacing={1.25}>
                  <Stack spacing={0.25}>
                    <Typography variant="overline" color="text.secondary">
                      Step 2
                    </Typography>
                    <Typography variant="subtitle1">Domains</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Choose either a real hostname or temporary GCP URLs, inspect the public origin, and verify the delivery mode before expecting deployed pages to be browseable.
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip
                      size="small"
                      label={hasBrowserDeliveryDefault ? "Delivery default selected" : "Delivery default not set"}
                      color={hasBrowserDeliveryDefault ? "success" : "warning"}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Browser-delivery targets: ${remoteHealth.usableTargetsByKind["browser-delivery"] ?? 0}`}
                    />
                  </Stack>
                  <Button variant="outlined" onClick={onOpenDomains}>
                    Open Domains
                  </Button>
                </Stack>
              </CardContent>
            </Card>
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

function DefaultsSummaryCard({ workspace, onOpenPages, onOpenPosts, onOpenTaxonomies, onOpenMedia }) {
  const { pages, posts, taxonomies, media } = workspace.modules;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Current Product Defaults</Typography>
            <Typography variant="body2" color="text.secondary">
              These defaults are consumed by product desks. If the normal `Remotes` and `Domains` flow is healthy, most teams should not need to edit them often.
            </Typography>
          </Stack>

          <BindingSummaryRow
            label="App mount tag"
            value={pages?.draftValues?.appMountTagName || "app-root"}
            state="ready"
          />
          <BindingSummaryRow
            label="HTML deployment"
            value={resolveTargetLabel(workspace.targetFields.deployment.selection)}
            state={workspace.targetFields.deployment.selection?.state ?? "missing"}
          />
          <BindingSummaryRow
            label="Browser delivery"
            value={resolveTargetLabel(workspace.targetFields.browser.selection)}
            state={workspace.targetFields.browser.selection?.state ?? "missing"}
          />
          <BindingSummaryRow
            label="Posts projection"
            value={resolveTargetLabel(workspace.targetFields.postsProjection.selection)}
            state={workspace.targetFields.postsProjection.selection?.state ?? "missing"}
          />
          <BindingSummaryRow
            label="Categories projection"
            value={resolveTargetLabel(workspace.targetFields.categoriesProjection.selection)}
            state={workspace.targetFields.categoriesProjection.selection?.state ?? "missing"}
          />
          <BindingSummaryRow
            label="Tags projection"
            value={resolveTargetLabel(workspace.targetFields.tagsProjection.selection)}
            state={workspace.targetFields.tagsProjection.selection?.state ?? "missing"}
          />
          <BindingSummaryRow
            label="Media sync"
            value={resolveTargetLabel(workspace.targetFields.media.selection)}
            state={workspace.targetFields.media.selection?.state ?? "missing"}
          />

          <Divider />

          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <Button variant="text" onClick={onOpenPages}>
              Open Pages
            </Button>
            <Button variant="text" onClick={onOpenPosts}>
              Open Posts
            </Button>
            <Button variant="text" onClick={onOpenTaxonomies}>
              Open Taxonomies
            </Button>
            <Button variant="text" onClick={onOpenMedia}>
              Open Media
            </Button>
          </Stack>
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
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
        Normal setup lives in `Remotes` and `Domains`. Use `System Settings` only when you need to set or repair product-wide fallback bindings that downstream desks consume.
      </Alert>
      <SetupFlowCard
        remoteHealth={workspace.remoteHealth}
        pages={pages}
        onOpenRemotes={() => openRoute("remotes")}
        onOpenDomains={() => openRoute("domains")}
      />
      <RemoteHealthCard
        remoteHealth={workspace.remoteHealth}
        remoteLoading={workspace.remoteLoading}
        remoteErrorMessage={workspace.remoteErrorMessage}
        onOpenRemotes={() => openRoute("remotes")}
        onReload={workspace.reloadRemotes}
      />
      <DefaultsSummaryCard
        workspace={workspace}
        onOpenPages={() => openRoute("pages")}
        onOpenPosts={() => openRoute("posts")}
        onOpenTaxonomies={() => openRoute("taxonomies")}
        onOpenMedia={() => openRoute("media")}
      />

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Stack spacing={0.35}>
                <Typography variant="h6">Advanced Default Bindings</Typography>
                <Typography variant="body2" color="text.secondary">
                  Expand only when the normal setup flow is already healthy and you intentionally need to override product-wide defaults.
                </Typography>
              </Stack>
              <Button variant="outlined" onClick={() => setAdvancedOpen((value) => !value)}>
                {advancedOpen ? "Hide Advanced Defaults" : "Show Advanced Defaults"}
              </Button>
            </Stack>

            {!advancedOpen ? (
              <Alert severity="info">
                The selectors and per-module save actions remain available, but they stay out of the normal setup path.
              </Alert>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {advancedOpen ? (
        <>
          <SectionCard
            title="Pages Delivery Defaults"
            description="Fallback mount tag, HTML deployment target, and browser-delivery target consumed by Pages and generated HTML."
            onOpen={() => openRoute("pages")}
            openLabel="Open Pages"
            onSave={() => workspace.saveModule("test-modules-pages")}
            saveLabel="Save Pages Defaults"
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
            title="Posts Projection Defaults"
            description="Fallback Firestore projection target used by Posts when a product-wide default is needed."
            onOpen={() => openRoute("posts")}
            openLabel="Open Posts"
            onSave={() => workspace.saveModule("test-modules-content")}
            saveLabel="Save Posts Defaults"
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
            title="Taxonomy Projection Defaults"
            description="Fallback Firestore projection targets for public categories and public tags."
            onOpen={() => openRoute("taxonomies")}
            openLabel="Open Taxonomies"
            onSave={() => workspace.saveModule("test-modules-taxonomy")}
            saveLabel="Save Taxonomy Defaults"
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
            title="Media Sync Defaults"
            description="Fallback remote media target used by Media for compare, sync, and restore."
            onOpen={() => openRoute("media")}
            openLabel="Open Media"
            onSave={() => workspace.saveModule("test-modules-media-manager")}
            saveLabel="Save Media Defaults"
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
        </>
      ) : null}

      {workspace.loading ? <Alert severity="info">Loading system settings...</Alert> : null}
    </Stack>
  );
}
