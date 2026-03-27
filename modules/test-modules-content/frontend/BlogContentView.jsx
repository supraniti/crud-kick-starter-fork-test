import {
  Alert,
  Button,
  Chip,
  Drawer,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateReferenceCollectionItem } from "../../../frontend/src/api/reference.js";
import {
  PostRosterTable,
  PostsToolbar,
  RevisionPanel,
  optionItems
} from "./BlogContentPanels.jsx";
import { BlogContentEditorPanel } from "./BlogContentEditorPanel.jsx";
import { BlogContentDeploymentImpactPanel } from "./BlogContentDeploymentImpactPanel.jsx";
import { BlogContentAuthoringReadinessPanel } from "./BlogContentAuthoringReadinessPanel.jsx";
import { BlogContentRemoteProjectionPanel } from "./BlogContentRemoteProjectionPanel.jsx";
import { useBlogContentWorkspace } from "./useBlogContentWorkspace.js";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";
import {
  createContentProjectionState,
  resolvePostDeploymentState
} from "./blog-content-release-state.js";
import { resolvePagePublicOutput } from "../../test-modules-pages/frontend/page-public-link-support.js";
import {
  buildContentAuthorLabelMap,
  buildContentTermLabelMap,
  buildVisiblePosts,
  paginatePosts,
  resolveContentDeskRouteState
} from "./blog-content-desk-model.js";
import { buildPostMutationPayload, normalizeDraftFromSources } from "./publication-support.js";
import { DEPLOYMENT_SYNC_COMPLETED_EVENT } from "../../../frontend/src/app/product-shell/deployment-command-center-events.js";

const POSTS_COLLECTION_ID = "blog-posts";
const PAGE_SIZE = 8;

const SECTION_LABELS = {
  story: "Story",
  organize: "Organize",
  media: "Media",
  seo: "SEO",
  publish: "Publish",
  revisions: "Revisions"
};

const Hero = memo(function Hero({ activeModuleLabel }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        background: "linear-gradient(135deg, #17262d 0%, #5b7d6a 100%)",
        color: "common.white"
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
          {activeModuleLabel}
        </Typography>
        <Typography variant="h4">Posts</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Work the editorial backlog, open one story, and move it from draft to something readers can actually see.
        </Typography>
      </Stack>
    </Paper>
  );
});

function matchesPostTemplate(page, post) {
  if (!page || !post || page.primarySourceType !== "blog-post" || page.status !== "published") {
    return false;
  }

  if (page.deploymentMode === "per-record" && page.sourceSelectionMode === "all-records") {
    return post.status === "published";
  }

  return page.primarySource?.itemId === post.id;
}

function buildPostPublicationMap({
  posts,
  pages,
  targets,
  fallbackBrowserTarget,
  fallbackDeploymentTarget,
  fallbackMediaTarget
}) {
  return new Map(
    (Array.isArray(posts) ? posts : []).map((post) => {
      const impactedTemplates = (Array.isArray(pages) ? pages : [])
        .filter((page) => matchesPostTemplate(page, post))
        .map((page) => ({
          ...page,
          publicationOutput: resolvePagePublicOutput({
            page,
            sourceRecord: post,
            targets,
            fallbackBrowserTarget,
            fallbackDeploymentTarget,
            fallbackMediaTarget
          })
        }));
      const primaryTemplate =
        impactedTemplates.find((page) => page.publicationOutput?.publicUrl) ?? impactedTemplates[0] ?? null;

      return [
        post.id,
        {
          pageId: primaryTemplate?.id ?? "",
          pageTitle: primaryTemplate?.title ?? "",
          publicUrl: primaryTemplate?.publicationOutput?.publicUrl ?? "",
          localArtifactPath: primaryTemplate?.publicationOutput?.localArtifactPath ?? "",
          impactedTemplates
        }
      ];
    })
  );
}

function createSnackbarState(message = "", severity = "success") {
  return {
    open: Boolean(message),
    message,
    severity
  };
}

function resolvePublicationNextStep({ selectedPost, selectedPostDeploymentState, impactedTemplates, projectionState }) {
  if (!selectedPost) {
    return {
      severity: "info",
      message: "Save this story first so the publication path can be evaluated."
    };
  }

  if (selectedPost.status !== "published") {
    return {
      severity: "info",
      message: "Finish the story, then publish it in the CMS when you are ready for readers to see it."
    };
  }

  if (!Array.isArray(impactedTemplates) || impactedTemplates.length === 0) {
    return {
      severity: "warning",
      message: "This published story does not have a published page yet. Create or assign one in Pages before expecting a live URL."
    };
  }

  if (["Needs Deployment", "Missing Outputs"].includes(selectedPostDeploymentState?.label)) {
    return {
      severity: "warning",
      message: "The page template exists, but the public HTML needs a fresh release before this story is live."
    };
  }

  if (projectionState?.label && projectionState.label !== "Synced") {
    return {
      severity: "info",
      message: "The story is ready for readers, but the remote reader-data sync still needs attention."
    };
  }

  return {
    severity: "success",
    message: "This story is published, connected to a page, and its live output is current."
  };
}

function PublicationContextPanel({
  selectedPost,
  selectedPostDeploymentState,
  projectionState,
  impactedTemplates,
  authorOptions,
  categoryOptions,
  tagOptions,
  mediaOptions,
  workspace,
  moduleSettingsDomain,
  remoteOpsSupport,
  remoteProjectionTarget,
  remoteProjectionTargets,
  remoteProjectionLatestRun,
  onOpenAuthors,
  onOpenTaxonomies,
  onOpenMedia,
  onOpenPages,
  onOpenRemoteOps,
  onSaveSettings
}) {
  const nextStep = resolvePublicationNextStep({
    selectedPost,
    selectedPostDeploymentState,
    impactedTemplates,
    projectionState
  });

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Typography variant="h6">Publication Path</Typography>
            <Typography variant="body2" color="text.secondary">
              See the difference between a story saved here, published in the CMS, and actually live for readers.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              size="small"
              label={selectedPost ? "Saved In CMS" : "Draft Not Saved"}
              color={selectedPost ? "success" : "default"}
              variant={selectedPost ? "filled" : "outlined"}
            />
            <Chip
              size="small"
              label={`CMS ${workspace.draft.status || "draft"}`}
              color={workspace.draft.status === "published" ? "success" : "default"}
              variant={workspace.draft.status === "published" ? "filled" : "outlined"}
            />
            <Chip
              size="small"
              label={selectedPostDeploymentState?.label ? `Live ${selectedPostDeploymentState.label}` : "Live Unknown"}
              color={selectedPostDeploymentState?.tone === "success" ? "success" : selectedPostDeploymentState?.tone === "warning" ? "warning" : "default"}
              variant={selectedPostDeploymentState?.tone === "success" ? "filled" : "outlined"}
            />
            <Chip
              size="small"
              label={`Reader Data ${projectionState?.label || "Unknown"}`}
              color={projectionState?.tone === "success" ? "success" : projectionState?.tone === "warning" ? "warning" : "default"}
              variant={projectionState?.tone === "success" ? "filled" : "outlined"}
            />
          </Stack>

          <Alert severity={nextStep.severity}>{nextStep.message}</Alert>
        </Stack>
      </Paper>

      <BlogContentAuthoringReadinessPanel
        draft={workspace.draft}
        authorOptions={authorOptions}
        categoryOptions={categoryOptions}
        tagOptions={tagOptions}
        mediaOptions={mediaOptions}
        deploymentAwareness={workspace.deploymentAwareness}
        onOpenAuthors={onOpenAuthors}
        onOpenTaxonomies={onOpenTaxonomies}
        onOpenMedia={onOpenMedia}
        onOpenPages={onOpenPages}
      />

      <BlogContentDeploymentImpactPanel
        impactedTemplates={impactedTemplates}
        loading={workspace.deploymentAwareness.state.loading}
        errorMessage={workspace.deploymentAwareness.state.errorMessage}
        onOpenPages={onOpenPages}
      />

      <BlogContentRemoteProjectionPanel
        latestRun={remoteProjectionLatestRun}
        moduleSettingsDomain={moduleSettingsDomain}
        onCompare={() =>
          remoteOpsSupport.compareTarget(
            moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? ""
          )
        }
        onExecute={() =>
          remoteOpsSupport.executeTarget(
            moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? ""
          )
        }
        onOpenRemoteOps={onOpenRemoteOps}
        onSaveSettings={onSaveSettings}
        onValidate={() =>
          remoteOpsSupport.validateTarget(
            moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? ""
          )
        }
        post={selectedPost}
        procedureState={remoteOpsSupport.procedureState}
        selectedTarget={remoteProjectionTarget}
        targetOptions={remoteProjectionTargets}
      />
    </Stack>
  );
}

function PostEditorDrawer({
  open,
  title,
  activeSection,
  onChangeSection,
  onClose,
  children
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100vw", lg: 920 },
          maxWidth: "100vw"
        }
      }}
    >
      <Stack spacing={2} sx={{ p: 2.5, minWidth: 0 }}>
        <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start">
          <Stack spacing={0.35} sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">
              Post Desk
            </Typography>
            <Typography variant="h5" noWrap>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Keep the backlog in place while you shape one story in a dedicated post workspace.
            </Typography>
          </Stack>
          <Button variant="text" onClick={onClose}>
            Close
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ px: 1.5 }}>
          <Tabs
            value={activeSection}
            onChange={(_, nextValue) => onChangeSection(nextValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            {Object.entries(SECTION_LABELS).map(([value, label]) => (
              <Tab key={value} value={value} label={label} />
            ))}
          </Tabs>
        </Paper>

        {children}
      </Stack>
    </Drawer>
  );
}

export function BlogContentView({
  activeModuleLabel,
  collectionsDomain,
  moduleSettingsDomain = null,
  navigate = null,
  route = {}
}) {
  const workspace = useBlogContentWorkspace({
    collectionsDomain
  });
  const routeState = useMemo(() => resolveContentDeskRouteState(route), [route]);
  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const createModeInitializedRef = useRef(false);
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const [snackbarState, setSnackbarState] = useState(createSnackbarState());

  const authorOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "blog-authors"),
    [workspace.referenceOptions]
  );
  const categoryOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "blog-categories"),
    [workspace.referenceOptions]
  );
  const tagOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "blog-tags"),
    [workspace.referenceOptions]
  );
  const mediaOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "media-items"),
    [workspace.referenceOptions]
  );
  const authorLabelMap = useMemo(() => buildContentAuthorLabelMap(authorOptions), [authorOptions]);
  const categoryLabelMap = useMemo(() => buildContentTermLabelMap(categoryOptions), [categoryOptions]);
  const tagLabelMap = useMemo(() => buildContentTermLabelMap(tagOptions), [tagOptions]);

  const remoteProjectionTargetId =
    moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? "";
  const remoteProjectionTargets = remoteOpsSupport.getTargetsByKind("firestore-projection");
  const remoteProjectionTarget = remoteOpsSupport.getTargetById(remoteProjectionTargetId);
  const remoteProjectionLatestRun = remoteOpsSupport.getLatestRunForTarget(remoteProjectionTargetId);
  const allTargets = remoteOpsSupport.supportState.targets ?? [];
  const fallbackBrowserTarget =
    allTargets.find((target) => target?.productBindingKey === "browser-delivery") ?? null;
  const fallbackDeploymentTarget =
    allTargets.find((target) => target?.productBindingKey === "deployment-storage") ?? null;
  const fallbackMediaTarget =
    allTargets.find((target) => target?.productBindingKey === "media-storage") ?? null;

  const postDeploymentStateMap = useMemo(
    () =>
      new Map(
        workspace.posts.map((post) => [
          post.id,
          resolvePostDeploymentState(post, workspace.deploymentAwareness.state.pages)
        ])
      ),
    [workspace.deploymentAwareness.state.pages, workspace.posts]
  );
  const projectionState = useMemo(
    () =>
      createContentProjectionState({
        posts: workspace.posts,
        target: remoteProjectionTarget,
        latestRun: remoteProjectionLatestRun
      }),
    [remoteProjectionLatestRun, remoteProjectionTarget, workspace.posts]
  );
  const postPublicationMap = useMemo(
    () =>
      buildPostPublicationMap({
        posts: workspace.posts,
        pages: workspace.deploymentAwareness.state.pages,
        targets: allTargets,
        fallbackBrowserTarget,
        fallbackDeploymentTarget,
        fallbackMediaTarget
      }),
    [
      allTargets,
      fallbackBrowserTarget,
      fallbackDeploymentTarget,
      fallbackMediaTarget,
      workspace.deploymentAwareness.state.pages,
      workspace.posts
    ]
  );
  const selectedPublicationState = useMemo(
    () => postPublicationMap.get(workspace.selectedPostId) ?? null,
    [postPublicationMap, workspace.selectedPostId]
  );
  const enrichedImpactedTemplates = selectedPublicationState?.impactedTemplates ?? [];
  const selectedPostDeploymentState = useMemo(
    () => postDeploymentStateMap.get(workspace.selectedPostId) ?? null,
    [postDeploymentStateMap, workspace.selectedPostId]
  );
  const primaryPublicationOutput = useMemo(
    () =>
      enrichedImpactedTemplates.find((page) => page.publicationOutput?.publicUrl)?.publicationOutput ?? null,
    [enrichedImpactedTemplates]
  );
  const visiblePosts = useMemo(
    () =>
      buildVisiblePosts({
        posts: workspace.posts,
        routeState,
        postHealthMap: workspace.postHealthMap,
        postDeploymentStateMap,
        authorLabelMap,
        categoryLabelMap,
        tagLabelMap
      }),
    [
      authorLabelMap,
      categoryLabelMap,
      postDeploymentStateMap,
      routeState,
      tagLabelMap,
      workspace.postHealthMap,
      workspace.posts
    ]
  );
  const pagedPosts = useMemo(
    () => paginatePosts(visiblePosts, routeState.page, PAGE_SIZE),
    [routeState.page, visiblePosts]
  );

  const updateRouteState = useCallback(
    (patch = {}, replace = true) => {
      if (typeof navigate !== "function") {
        return;
      }
      navigate(
        {
          ...route,
          ...patch
        },
        { replace }
      );
    },
    [navigate, route]
  );

  useEffect(() => {
    if ((collectionsDomain.collectionFilterState.search ?? "") !== routeState.search) {
      collectionsDomain.handleCollectionFilterChange("search", routeState.search);
    }
  }, [collectionsDomain, routeState.search]);

  useEffect(() => {
    if ((collectionsDomain.collectionFilterState.status ?? "") !== routeState.status) {
      collectionsDomain.handleCollectionFilterChange("status", routeState.status);
    }
  }, [collectionsDomain, routeState.status]);

  useEffect(() => {
    if ((collectionsDomain.collectionFilterState.format ?? "") !== routeState.format) {
      collectionsDomain.handleCollectionFilterChange("format", routeState.format);
    }
  }, [collectionsDomain, routeState.format]);

  useEffect(() => {
    if ((collectionsDomain.collectionFilterState.primaryAuthorId ?? "") !== routeState.primaryAuthorId) {
      collectionsDomain.handleCollectionFilterChange("primaryAuthorId", routeState.primaryAuthorId);
    }
  }, [collectionsDomain, routeState.primaryAuthorId]);

  useEffect(() => {
    if (routeState.postMode === "create") {
      if (!createModeInitializedRef.current) {
        workspace.startNew();
        createModeInitializedRef.current = true;
      }
      if (workspace.saveState.successMessage === "Post created" && workspace.selectedPostId) {
        updateRouteState(
          {
            postId: workspace.selectedPostId,
            postMode: "",
            postEditorSection: "story"
          },
          false
        );
      }
      return;
    }

    createModeInitializedRef.current = false;

    if (routeState.postId && routeState.postId !== workspace.selectedPostId) {
      workspace.selectPost(routeState.postId);
    }
  }, [
    routeState.postId,
    routeState.postMode,
    updateRouteState,
    workspace,
    workspace.saveState.successMessage,
    workspace.selectedPostId
  ]);

  useEffect(() => {
    setSelectedPostIds((previous) => previous.filter((postId) => workspace.posts.some((post) => post.id === postId)));
  }, [workspace.posts]);

  useEffect(() => {
    function handleDeploymentSyncCompleted() {
      void collectionsDomain.reloadCollectionItems();
      void workspace.reloadDeploymentAwareness();
      void remoteOpsSupport.reload();
    }

    window.addEventListener(DEPLOYMENT_SYNC_COMPLETED_EVENT, handleDeploymentSyncCompleted);
    return () => {
      window.removeEventListener(DEPLOYMENT_SYNC_COMPLETED_EVENT, handleDeploymentSyncCompleted);
    };
  }, [collectionsDomain, remoteOpsSupport, workspace.reloadDeploymentAwareness]);

  const openPagesDesk = useCallback(
    (pageId = workspace.deploymentAwareness.summary.primaryPageId) => {
      if (typeof navigate !== "function") {
        return;
      }
      navigate(
        {
          moduleId: "pages",
          pageId
        },
        { replace: false }
      );
    },
    [navigate, workspace.deploymentAwareness.summary.primaryPageId]
  );

  const openAuthorsDesk = useCallback(() => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId: "authors" }, { replace: false });
  }, [navigate]);

  const openTaxonomiesDesk = useCallback(() => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId: "taxonomies" }, { replace: false });
  }, [navigate]);

  const openMediaDesk = useCallback(() => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId: "media" }, { replace: false });
  }, [navigate]);

  const openDeploymentsDesk = useCallback(() => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId: "deployments" }, { replace: false });
  }, [navigate]);

  const openRemoteOpsTarget = useCallback(() => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate(
      {
        moduleId: "remotes",
        connectionId: remoteProjectionTarget?.connectionProfileId ?? "",
        tab: "targets",
        targetId: remoteProjectionTargetId
      },
      { replace: false }
    );
  }, [navigate, remoteProjectionTarget?.connectionProfileId, remoteProjectionTargetId]);

  const saveModuleSettings = useCallback(async () => {
    if (!moduleSettingsDomain || typeof moduleSettingsDomain.handleSaveModuleSettings !== "function") {
      return;
    }
    await moduleSettingsDomain.handleSaveModuleSettings();
    await remoteOpsSupport.reload();
  }, [moduleSettingsDomain, remoteOpsSupport]);

  const handleChangeFilter = useCallback(
    (fieldId, value) => {
      updateRouteState(
        {
          [fieldId]: value,
          postPage: 1
        },
        false
      );
    },
    [updateRouteState]
  );

  const handleChangeSort = useCallback(
    (value) => {
      updateRouteState(
        {
          postSort: value,
          postPage: 1
        },
        false
      );
    },
    [updateRouteState]
  );

  const handleClearFilters = useCallback(() => {
    updateRouteState(
      {
        postSearch: "",
        postStatus: "",
        postFormat: "",
        postAuthorId: "",
        postCategoryId: "",
        postTagId: "",
        postIssue: "",
        postReadiness: "",
        postDeployment: "",
        postSort: "updated-desc",
        postPage: 1
      },
      false
    );
  }, [updateRouteState]);

  const handleOpenEdit = useCallback(
    (postId) => {
      workspace.selectPost(postId);
      updateRouteState(
        {
          postId,
          postMode: "",
          postEditorSection: routeState.editorSection || "story"
        },
        false
      );
    },
    [routeState.editorSection, updateRouteState, workspace]
  );

  const handleOpenCreate = useCallback(() => {
    updateRouteState(
      {
        postId: "",
        postMode: "create",
        postEditorSection: "story"
      },
      false
    );
  }, [updateRouteState]);

  const handleCloseDrawer = useCallback(() => {
    updateRouteState(
      {
        postId: "",
        postMode: "",
        postEditorSection: "story"
      },
      false
    );
  }, [updateRouteState]);

  const handleToggleSelection = useCallback((postId) => {
    setSelectedPostIds((previous) =>
      previous.includes(postId) ? previous.filter((itemId) => itemId !== postId) : [...previous, postId]
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedPostIds([]);
  }, []);

  const handleBulkArchive = useCallback(async () => {
    if (selectedPostIds.length === 0) {
      return;
    }
    setBulkArchiving(true);
    try {
      await Promise.all(
        selectedPostIds.map(async (postId) => {
          const post = workspace.posts.find((candidate) => candidate.id === postId);
          if (!post) {
            return;
          }
          await updateReferenceCollectionItem({
            collectionId: POSTS_COLLECTION_ID,
            itemId: postId,
            item: buildPostMutationPayload(
              {
                ...normalizeDraftFromSources(post),
                status: "archived"
              },
              post
            )
          });
        })
      );
      collectionsDomain.reloadCollectionItems();
      setSelectedPostIds([]);
      setSnackbarState(createSnackbarState("Selected posts archived", "success"));
    } catch (error) {
      setSnackbarState(
        createSnackbarState(error?.message ?? "Failed to archive selected posts", "error")
      );
    } finally {
      setBulkArchiving(false);
    }
  }, [collectionsDomain, selectedPostIds, workspace.posts]);

  const handleChangePage = useCallback(
    (nextPage) => {
      updateRouteState({ postPage: nextPage }, false);
    },
    [updateRouteState]
  );

  const handleChangeDrawerSection = useCallback(
    (nextValue) => {
      updateRouteState({ postEditorSection: nextValue }, false);
    },
    [updateRouteState]
  );

  const editorWorkspace = useMemo(
    () => ({
      ...workspace,
      authorLabelMap,
      categoryLabelMap,
      remoteOpsSupport,
      remoteProjectionTarget,
      remoteProjectionTargets,
      remoteProjectionLatestRun,
      openAuthorsDesk,
      openTaxonomiesDesk,
      openMediaDesk,
      openPagesDesk,
      openDeploymentsDesk,
      primaryPublicationOutput,
      selectedPostDeploymentState,
      openRemoteOpsTarget,
      saveModuleSettings,
      mediaOptions
    }),
    [
      authorLabelMap,
      categoryLabelMap,
      mediaOptions,
      openAuthorsDesk,
      openDeploymentsDesk,
      openMediaDesk,
      openPagesDesk,
      openRemoteOpsTarget,
      openTaxonomiesDesk,
      primaryPublicationOutput,
      remoteOpsSupport,
      remoteProjectionLatestRun,
      remoteProjectionTarget,
      remoteProjectionTargets,
      saveModuleSettings,
      selectedPostDeploymentState,
      workspace
    ]
  );

  const drawerOpen = routeState.postMode === "create" || Boolean(routeState.postId);
  const drawerTitle = routeState.postMode === "create"
    ? "New Post"
    : workspace.draft.title || workspace.selectedPost?.title || "Untitled post";

  if (
    !collectionsDomain.isActiveCollectionAvailable &&
    collectionsDomain.activeCollectionId === POSTS_COLLECTION_ID
  ) {
    return <Alert severity="warning">{collectionsDomain.activeCollectionUnavailableMessage}</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Hero activeModuleLabel={activeModuleLabel} />

      <PostsToolbar
        routeState={routeState}
        summary={workspace.summary}
        deploymentSummary={{
          needsDeploymentCount: [...postDeploymentStateMap.values()].filter(
            (state) => state?.label === "Needs Deployment" || state?.label === "Missing Outputs"
          ).length
        }}
        authorOptions={authorOptions}
        categoryOptions={categoryOptions}
        tagOptions={tagOptions}
        selectedCount={selectedPostIds.length}
        onChangeFilter={handleChangeFilter}
        onChangeSort={handleChangeSort}
        onOpenCreate={handleOpenCreate}
        onArchiveSelected={handleBulkArchive}
        onClearSelection={handleClearSelection}
        onClearFilters={handleClearFilters}
      />

      {bulkArchiving ? <Alert severity="info">Archiving selected posts...</Alert> : null}

      <PostRosterTable
        rows={pagedPosts.rows}
        page={pagedPosts.page}
        pageSize={pagedPosts.pageSize}
        totalCount={pagedPosts.totalCount}
        selectedPostIds={selectedPostIds}
        authorLabelMap={authorLabelMap}
        categoryLabelMap={categoryLabelMap}
        postHealthMap={workspace.postHealthMap}
        postDeploymentStateMap={postDeploymentStateMap}
        postPublicationMap={postPublicationMap}
        onToggleSelection={handleToggleSelection}
        onEdit={handleOpenEdit}
        onOpenLive={() => {}}
        onOpenPage={openPagesDesk}
        onChangePage={handleChangePage}
      />

      <PostEditorDrawer
        open={drawerOpen}
        title={drawerTitle}
        activeSection={routeState.editorSection}
        onChangeSection={handleChangeDrawerSection}
        onClose={handleCloseDrawer}
      >
        {routeState.editorSection === "publish" ? (
          <PublicationContextPanel
            selectedPost={workspace.selectedPost}
            selectedPostDeploymentState={selectedPostDeploymentState}
            projectionState={projectionState}
            impactedTemplates={enrichedImpactedTemplates}
            authorOptions={authorOptions}
            categoryOptions={categoryOptions}
            tagOptions={tagOptions}
            mediaOptions={mediaOptions}
            workspace={workspace}
            moduleSettingsDomain={moduleSettingsDomain}
            remoteOpsSupport={remoteOpsSupport}
            remoteProjectionTarget={remoteProjectionTarget}
            remoteProjectionTargets={remoteProjectionTargets}
            remoteProjectionLatestRun={remoteProjectionLatestRun}
            onOpenAuthors={openAuthorsDesk}
            onOpenTaxonomies={openTaxonomiesDesk}
            onOpenMedia={openMediaDesk}
            onOpenPages={openPagesDesk}
            onOpenRemoteOps={openRemoteOpsTarget}
            onSaveSettings={saveModuleSettings}
          />
        ) : null}

        {routeState.editorSection === "revisions" ? (
          <RevisionPanel
            revisions={workspace.revisionState.items}
            selectedRevision={workspace.selectedRevision}
            loading={workspace.revisionState.loading}
            errorMessage={workspace.revisionState.errorMessage}
            authorOptions={authorOptions}
            categoryOptions={categoryOptions}
            tagOptions={tagOptions}
            onSelectRevision={workspace.selectRevision}
            onRestoreRevision={workspace.restoreRevision}
          />
        ) : null}

        {["story", "organize", "media", "seo"].includes(routeState.editorSection) ? (
          <BlogContentEditorPanel
            key={`post-editor:${drawerOpen ? "open" : "closed"}:${routeState.postMode || "edit"}:${routeState.postId || "new"}`}
            workspace={editorWorkspace}
            activeSection={routeState.editorSection}
            onChangeSection={handleChangeDrawerSection}
            hideSectionTabs
          />
        ) : null}
      </PostEditorDrawer>

      <Snackbar
        open={snackbarState.open}
        autoHideDuration={3500}
        onClose={() => setSnackbarState(createSnackbarState())}
      >
        <Alert
          onClose={() => setSnackbarState(createSnackbarState())}
          severity={snackbarState.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
