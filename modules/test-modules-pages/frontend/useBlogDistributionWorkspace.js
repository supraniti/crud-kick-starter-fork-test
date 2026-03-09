import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../../frontend/src/api/reference.js";
import {
  buildDistributionSummary,
  buildReadinessIssues,
  matchesPageFilters,
  matchesRedirectFilters,
  sortPagesForDesk,
  sortRedirectRules
} from "./distribution-readiness.js";
import {
  buildPageMutationPayload,
  createActionState,
  createDeliveryState,
  createEmptyDataSourceDraft,
  createEmptyPageDraft,
  createEmptyRedirectDraft,
  createPageDraftFromItem,
  createSourceOptionsMap,
  createSupportState,
  normalizeRedirectDraft,
  resolveActorOptions,
  toArray,
  toOption
} from "./page-workspace-support.js";

const MODULE_ID = "test-modules-pages";
const PAGES_COLLECTION_ID = "blog-pages";
const REDIRECTS_COLLECTION_ID = "blog-redirect-rules";
const POSTS_COLLECTION_ID = "blog-posts";
const AUTHORS_COLLECTION_ID = "blog-authors";
const CATEGORIES_COLLECTION_ID = "blog-categories";
const TAGS_COLLECTION_ID = "blog-tags";
const MEDIA_COLLECTION_ID = "media-items";

const DEFAULT_PAGE_FILTERS = Object.freeze({
  search: "",
  status: "",
  pageKind: "",
  primarySourceType: "",
  readiness: ""
});
const DEFAULT_REDIRECT_FILTERS = Object.freeze({
  search: "",
  status: "",
  httpCode: "",
  targetPageId: ""
});

async function loadSupportData() {
  const [pagesPayload, redirectsPayload, postsPayload, authorsPayload, categoriesPayload, tagsPayload, mediaPayload] =
    await Promise.all([
      fetchReferenceCollectionItems({ collectionId: PAGES_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: REDIRECTS_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: POSTS_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: AUTHORS_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: CATEGORIES_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: TAGS_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: MEDIA_COLLECTION_ID, limit: 200 })
    ]);

  return {
    pages: toArray(pagesPayload?.items),
    redirects: toArray(redirectsPayload?.items),
    posts: toArray(postsPayload?.items),
    authors: toArray(authorsPayload?.items),
    categories: toArray(categoriesPayload?.items),
    tags: toArray(tagsPayload?.items),
    media: toArray(mediaPayload?.items)
  };
}

async function fetchDeliveryPayload(pageId) {
  const response = await fetch(`/api/reference/modules/${MODULE_ID}/pages/${pageId}/delivery?preview=true`, {
    method: "GET",
    headers: {
      accept: "application/json"
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to load delivery payload");
  }
  return payload?.payload ?? null;
}

async function publishSelectedPage({ pageId, updatedByAuthorId }) {
  const response = await fetch(`/api/reference/modules/${MODULE_ID}/pages/${pageId}/publish-now`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      updatedByAuthorId
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to publish scheduled page");
  }
  return payload;
}

async function persistPageMutation({ pageId, draft }) {
  const payload = buildPageMutationPayload(draft);
  return pageId
    ? updateReferenceCollectionItem({
        collectionId: PAGES_COLLECTION_ID,
        itemId: pageId,
        item: payload
      })
    : createReferenceCollectionItem({
        collectionId: PAGES_COLLECTION_ID,
        item: payload
      });
}

async function persistRedirectMutation({ redirectId, redirectDraft }) {
  const payload = {
    sourcePath: redirectDraft.sourcePath,
    targetPageId: redirectDraft.targetPageId || null,
    targetUrl: redirectDraft.targetUrl || null,
    httpCode: redirectDraft.httpCode,
    status: redirectDraft.status,
    reason: redirectDraft.reason || null
  };
  return redirectId
    ? updateReferenceCollectionItem({
        collectionId: REDIRECTS_COLLECTION_ID,
        itemId: redirectId,
        item: payload
      })
    : createReferenceCollectionItem({
        collectionId: REDIRECTS_COLLECTION_ID,
        item: payload
      });
}

async function disableRedirectMutation({ redirectId, redirectDraft }) {
  return updateReferenceCollectionItem({
    collectionId: REDIRECTS_COLLECTION_ID,
    itemId: redirectId,
    item: {
      ...redirectDraft,
      targetPageId: redirectDraft.targetPageId || null,
      targetUrl: redirectDraft.targetUrl || null,
      reason: redirectDraft.reason || null,
      status: "disabled"
    }
  });
}

function useSupportData() {
  const [supportState, setSupportState] = useState(createSupportState);

  const reloadSupportData = useCallback(async () => {
    setSupportState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));

    try {
      const nextState = await loadSupportData();
      setSupportState({
        loading: false,
        errorMessage: null,
        ...nextState
      });
    } catch (error) {
      setSupportState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load pages data",
        pages: [],
        redirects: [],
        posts: [],
        authors: [],
        categories: [],
        tags: [],
        media: []
      });
    }
  }, []);

  useEffect(() => {
    void reloadSupportData();
  }, [reloadSupportData]);

  return { supportState, reloadSupportData };
}

function usePageSelection(pages) {
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [isCreatingNewPage, setIsCreatingNewPage] = useState(false);
  const [pageDraft, setPageDraft] = useState(createEmptyPageDraft);

  useEffect(() => {
    if (isCreatingNewPage) {
      return;
    }
    if (pages.length === 0) {
      setSelectedPageId(null);
      setPageDraft(createEmptyPageDraft());
      return;
    }
    if (!selectedPageId || !pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(pages[0].id);
      return;
    }
    const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
    if (selectedPage) {
      setPageDraft(createPageDraftFromItem(selectedPage));
    }
  }, [isCreatingNewPage, pages, selectedPageId]);

  return {
    selectedPageId,
    selectedPage: pages.find((page) => page.id === selectedPageId) ?? null,
    isCreatingNewPage,
    pageDraft,
    setSelectedPageId,
    setIsCreatingNewPage,
    setPageDraft
  };
}

function useDeliveryPreview(selectedPageId, refreshToken) {
  const [deliveryState, setDeliveryState] = useState(createDeliveryState);

  useEffect(() => {
    async function run() {
      if (!selectedPageId) {
        setDeliveryState(createDeliveryState());
        return;
      }

      setDeliveryState({
        loading: true,
        errorMessage: null,
        payload: null
      });

      try {
        const payload = await fetchDeliveryPayload(selectedPageId);
        setDeliveryState({
          loading: false,
          errorMessage: null,
          payload
        });
      } catch (error) {
        setDeliveryState({
          loading: false,
          errorMessage: error?.message ?? "Failed to load delivery payload",
          payload: null
        });
      }
    }

    void run();
  }, [refreshToken, selectedPageId]);

  return deliveryState;
}

function selectExistingPage({ pages, selection, setPageActionState }, pageId) {
  const nextPage = pages.find((page) => page.id === pageId) ?? null;
  selection.setIsCreatingNewPage(false);
  selection.setSelectedPageId(pageId);
  selection.setPageDraft(nextPage ? createPageDraftFromItem(nextPage) : createEmptyPageDraft());
  setPageActionState(createActionState());
}

function startNewPageDraft(selection, setPageActionState) {
  selection.setIsCreatingNewPage(true);
  selection.setSelectedPageId(null);
  selection.setPageDraft(createEmptyPageDraft());
  setPageActionState(createActionState());
}

function usePageWorkspace({ pages, reloadSupportData, selectedActorId }) {
  const selection = usePageSelection(pages);
  const [pageFilters, setPageFilters] = useState(DEFAULT_PAGE_FILTERS);
  const [pageActionState, setPageActionState] = useState(createActionState);
  const [deliveryRefreshToken, setDeliveryRefreshToken] = useState(0);
  const effectiveSelectedPageId = selection.isCreatingNewPage ? null : selection.selectedPageId;
  const effectiveSelectedPage =
    selection.isCreatingNewPage
      ? null
      : pages.find((page) => page.id === selection.selectedPageId) ?? null;
  const readinessMap = useMemo(() => new Map(pages.map((page) => [page.id, buildReadinessIssues(page)])), [pages]);
  const filteredPages = useMemo(() => pages.filter((page) => matchesPageFilters(page, pageFilters, readinessMap.get(page.id) ?? [])), [pageFilters, pages, readinessMap]);

  const setPageDraftField = useCallback((updater) => {
    selection.setPageDraft(updater);
    setPageActionState(createActionState());
  }, [selection]);

  const persistPage = useCallback(async () => {
    setPageActionState({ saving: true, errorMessage: null, successMessage: null });
    try {
      const targetPageId = selection.isCreatingNewPage ? null : selection.selectedPageId;
      const result = await persistPageMutation({
        pageId: targetPageId,
        draft: selection.pageDraft
      });
      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to save page");
      }
      const savedPage = result.item ?? null;
      await reloadSupportData();
      if (savedPage?.id) {
        selection.setIsCreatingNewPage(false);
        selection.setSelectedPageId(savedPage.id);
        selection.setPageDraft(createPageDraftFromItem(savedPage));
      }
      setDeliveryRefreshToken((previous) => previous + 1);
      setPageActionState({
        saving: false,
        errorMessage: null,
        successMessage: targetPageId ? "Page updated" : "Page created"
      });
    } catch (error) {
      setPageActionState({ saving: false, errorMessage: error?.message ?? "Failed to save page", successMessage: null });
    }
  }, [reloadSupportData, selection]);

  const publishPage = useCallback(async () => {
    if (!selection.selectedPageId) {
      return;
    }
    setPageActionState({ saving: true, errorMessage: null, successMessage: null });
    try {
      await publishSelectedPage({
        pageId: effectiveSelectedPageId,
        updatedByAuthorId: selectedActorId
      });
      await reloadSupportData();
      setDeliveryRefreshToken((previous) => previous + 1);
      setPageActionState({
        saving: false,
        errorMessage: null,
        successMessage:
          effectiveSelectedPage?.status === "published"
            ? "Published page synced to deployment"
            : "Page published and deployed"
      });
    } catch (error) {
      setPageActionState({ saving: false, errorMessage: error?.message ?? "Failed to publish page", successMessage: null });
    }
  }, [effectiveSelectedPage, effectiveSelectedPageId, reloadSupportData, selectedActorId, selection.selectedPageId]);

  return {
    ...selection,
    pages,
    selectedPageId: effectiveSelectedPageId,
    selectedPage: effectiveSelectedPage,
    readinessMap,
    deliveryRefreshToken,
    filteredPages,
    pageFilters,
    pageActionState,
    setPageFilters,
    selectPage: (pageId) => selectExistingPage({ pages, selection, setPageActionState }, pageId),
    startNewPage: () => startNewPageDraft(selection, setPageActionState),
    changePageField: (fieldId, value) => {
      setPageDraftField((previous) => ({
        ...previous,
        [fieldId]: value
      }));
    },
    changeDataSourceField: (index, fieldId, value) => {
      setPageDraftField((previous) => ({
        ...previous,
        dataSources: previous.dataSources.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [fieldId]: value } : entry
        )
      }));
    },
    addDataSource: () => {
      setPageDraftField((previous) => ({
        ...previous,
        dataSources: [...previous.dataSources, createEmptyDataSourceDraft(previous.dataSources.length)]
      }));
    },
    removeDataSource: (index) => {
      setPageDraftField((previous) => ({
        ...previous,
        dataSources: previous.dataSources.filter((_, entryIndex) => entryIndex !== index)
      }));
    },
    persistPage,
    publishPage
  };
}

function useRedirectWorkspace({ redirects, reloadSupportData }) {
  const [redirectFilters, setRedirectFilters] = useState(DEFAULT_REDIRECT_FILTERS);
  const [selectedRedirectId, setSelectedRedirectId] = useState(null);
  const [isCreatingNewRedirect, setIsCreatingNewRedirect] = useState(false);
  const [redirectDraft, setRedirectDraft] = useState(createEmptyRedirectDraft);
  const [redirectActionState, setRedirectActionState] = useState(createActionState);

  useEffect(() => {
    if (isCreatingNewRedirect) {
      return;
    }
    if (redirects.length === 0) {
      setSelectedRedirectId(null);
      setRedirectDraft(createEmptyRedirectDraft());
      return;
    }
    if (!selectedRedirectId || !redirects.some((rule) => rule.id === selectedRedirectId)) {
      setSelectedRedirectId(redirects[0].id);
      setRedirectDraft(normalizeRedirectDraft(redirects[0]));
    }
  }, [isCreatingNewRedirect, redirects, selectedRedirectId]);

  const filteredRedirects = useMemo(
    () => redirects.filter((rule) => matchesRedirectFilters(rule, redirectFilters)),
    [redirectFilters, redirects]
  );
  const effectiveSelectedRedirectId = isCreatingNewRedirect ? null : selectedRedirectId;

  const setDraftWithReset = useCallback((updater) => {
    setRedirectDraft(updater);
    setRedirectActionState(createActionState());
  }, []);

  const persistRedirect = useCallback(async () => {
    setRedirectActionState({ saving: true, errorMessage: null, successMessage: null });
    try {
      const targetRedirectId = isCreatingNewRedirect ? null : selectedRedirectId;
      const result = await persistRedirectMutation({
        redirectId: targetRedirectId,
        redirectDraft
      });
      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to save redirect");
      }
      await reloadSupportData();
      if (result.item?.id) {
        setIsCreatingNewRedirect(false);
        setSelectedRedirectId(result.item.id);
        setRedirectDraft(normalizeRedirectDraft(result.item));
      }
      setRedirectActionState({
        saving: false,
        errorMessage: null,
        successMessage: targetRedirectId ? "Redirect updated" : "Redirect created"
      });
    } catch (error) {
      setRedirectActionState({
        saving: false,
        errorMessage: error?.message ?? "Failed to save redirect",
        successMessage: null
      });
    }
  }, [isCreatingNewRedirect, redirectDraft, reloadSupportData, selectedRedirectId]);

  const disableSelectedRedirect = useCallback(async () => {
    if (!effectiveSelectedRedirectId) {
      return;
    }
    setRedirectActionState({ saving: true, errorMessage: null, successMessage: null });
    try {
      const result = await disableRedirectMutation({
        redirectId: effectiveSelectedRedirectId,
        redirectDraft
      });
      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to disable redirect");
      }
      await reloadSupportData();
      setRedirectDraft((previous) => ({ ...previous, status: "disabled" }));
      setRedirectActionState({
        saving: false,
        errorMessage: null,
        successMessage: "Redirect disabled"
      });
    } catch (error) {
      setRedirectActionState({
        saving: false,
        errorMessage: error?.message ?? "Failed to disable redirect",
        successMessage: null
      });
    }
  }, [effectiveSelectedRedirectId, redirectDraft, reloadSupportData]);

  return {
    filteredRedirects,
    redirectFilters,
    selectedRedirectId: effectiveSelectedRedirectId,
    redirectDraft,
    redirectActionState,
    setRedirectFilters,
    selectRedirect: (redirectId) => {
      const rule = redirects.find((entry) => entry.id === redirectId) ?? null;
      setIsCreatingNewRedirect(false);
      setSelectedRedirectId(redirectId);
      setRedirectDraft(rule ? normalizeRedirectDraft(rule) : createEmptyRedirectDraft());
      setRedirectActionState(createActionState());
    },
    startNewRedirect: () => {
      setIsCreatingNewRedirect(true);
      setSelectedRedirectId(null);
      setRedirectDraft(createEmptyRedirectDraft());
      setRedirectActionState(createActionState());
    },
    changeRedirectField: (fieldId, value) => {
      setDraftWithReset((previous) => ({
        ...previous,
        [fieldId]: value
      }));
    },
    persistRedirect,
    disableSelectedRedirect
  };
}

export function useBlogDistributionWorkspace() {
  const support = useSupportData();
  const [selectedActorId, setSelectedActorId] = useState("");
  const pages = useMemo(() => sortPagesForDesk(support.supportState.pages), [support.supportState.pages]);
  const redirects = useMemo(
    () => sortRedirectRules(support.supportState.redirects),
    [support.supportState.redirects]
  );
  const actorOptions = useMemo(
    () => resolveActorOptions(support.supportState.authors),
    [support.supportState.authors]
  );

  useEffect(() => {
    if (!selectedActorId && actorOptions[0]?.id) {
      setSelectedActorId(actorOptions[0].id);
      return;
    }
    if (selectedActorId && !actorOptions.some((author) => author.id === selectedActorId)) {
      setSelectedActorId(actorOptions[0]?.id ?? "");
    }
  }, [actorOptions, selectedActorId]);

  const pageWorkspace = usePageWorkspace({
    pages,
    reloadSupportData: support.reloadSupportData,
    selectedActorId
  });
  const redirectWorkspace = useRedirectWorkspace({
    redirects,
    reloadSupportData: support.reloadSupportData
  });
  const deliveryState = useDeliveryPreview(
    pageWorkspace.selectedPageId,
    pageWorkspace.deliveryRefreshToken
  );
  const readinessMap = useMemo(
    () => new Map(pages.map((page) => [page.id, buildReadinessIssues(page)])),
    [pages]
  );

  return {
    supportState: support.supportState,
    summary: buildDistributionSummary({ pages, redirects, readinessMap }),
    readinessMap,
    pageById: new Map(pages.map((page) => [page.id, page])),
    sourceOptionsByType: createSourceOptionsMap({
      posts: support.supportState.posts,
      authors: support.supportState.authors,
      categories: support.supportState.categories,
      tags: support.supportState.tags
    }),
    mediaOptions: support.supportState.media.map(toOption),
    actorOptions,
    selectedActorId,
    setSelectedActorId,
    deliveryState,
    ...pageWorkspace,
    ...redirectWorkspace
  };
}
