import { useCallback, useEffect, useState } from "react";
import {
  createReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../../frontend/src/api/reference.js";
import { buildPageMutationPayload, createSupportState, toArray } from "./page-workspace-support.js";

const MODULE_ID = "test-modules-pages";
const PAGES_COLLECTION_ID = "blog-pages";
const REDIRECTS_COLLECTION_ID = "blog-redirect-rules";
const LAYOUTS_COLLECTION_ID = "page-layouts";
const POSTS_COLLECTION_ID = "blog-posts";
const AUTHORS_COLLECTION_ID = "blog-authors";
const CATEGORIES_COLLECTION_ID = "blog-categories";
const TAGS_COLLECTION_ID = "blog-tags";
const MEDIA_COLLECTION_ID = "media-items";

async function fetchDeskPages() {
  const response = await fetch(`/api/reference/modules/${MODULE_ID}/pages/desk-items`, {
    method: "GET",
    headers: {
      accept: "application/json"
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to load pages desk items");
  }
  return toArray(payload?.items);
}

async function loadSupportData() {
  const pagesPromise = fetchDeskPages().catch(async () => {
    const pagesPayload = await fetchReferenceCollectionItems({
      collectionId: PAGES_COLLECTION_ID,
      limit: 200
    });
    return toArray(pagesPayload?.items);
  });

  const [pages, redirectsPayload, layoutsPayload, postsPayload, authorsPayload, categoriesPayload, tagsPayload, mediaPayload] =
    await Promise.all([
      pagesPromise,
      fetchReferenceCollectionItems({ collectionId: REDIRECTS_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: LAYOUTS_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: POSTS_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: AUTHORS_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: CATEGORIES_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: TAGS_COLLECTION_ID, limit: 200 }),
      fetchReferenceCollectionItems({ collectionId: MEDIA_COLLECTION_ID, limit: 200 })
    ]);

  return {
    pages,
    redirects: toArray(redirectsPayload?.items),
    layouts: toArray(layoutsPayload?.items),
    posts: toArray(postsPayload?.items),
    authors: toArray(authorsPayload?.items),
    categories: toArray(categoriesPayload?.items),
    tags: toArray(tagsPayload?.items),
    media: toArray(mediaPayload?.items)
  };
}

export async function fetchDeliveryPayload(pageId, sourceItemId = "") {
  const query = new URLSearchParams({
    preview: "true"
  });
  if (sourceItemId) {
    query.set("sourceItemId", sourceItemId);
  }

  const response = await fetch(`/api/reference/modules/${MODULE_ID}/pages/${pageId}/delivery?${query.toString()}`, {
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

export async function fetchPagePreviewSources(pageId) {
  const response = await fetch(`/api/reference/modules/${MODULE_ID}/pages/${pageId}/preview-sources`, {
    method: "GET",
    headers: {
      accept: "application/json"
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to load preview sources");
  }
  return toArray(payload?.items);
}

export async function fetchDeploymentInstances(pageId) {
  const response = await fetch(`/api/reference/modules/${MODULE_ID}/pages/${pageId}/deployment-instances`, {
    method: "GET",
    headers: {
      accept: "application/json"
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to load deployment instances");
  }
  return toArray(payload?.items);
}

export async function publishSelectedPage({ pageId, updatedByAuthorId }) {
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

export async function syncSelectedPageDeployment({ pageId }) {
  const response = await fetch(`/api/reference/modules/${MODULE_ID}/pages/${pageId}/sync-deployment`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to sync deployment");
  }
  return payload;
}

export async function runDeploymentBundleRelease({ bundleId }) {
  const response = await fetch(
    `/api/reference/modules/${MODULE_ID}/deployment-bundles/${bundleId}/run-release`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    }
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to run deployment bundle release");
  }
  return payload;
}

export async function persistPageMutation({ pageId, draft }) {
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

export async function persistRedirectMutation({ redirectId, redirectDraft }) {
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

export async function disableRedirectMutation({ redirectId, redirectDraft }) {
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

export function useSupportData() {
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
        layouts: [],
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
