import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchReferenceCollectionItems } from "../../../frontend/src/api/reference.js";

const AUTHORS_COLLECTION_ID = "blog-authors";
const POSTS_COLLECTION_ID = "blog-posts";
const CATEGORIES_COLLECTION_ID = "blog-categories";
const PAGES_COLLECTION_ID = "blog-pages";
const MEDIA_ID_FIELD_PATTERN = /MediaId$/;
const MEDIA_IDS_FIELD_PATTERN = /MediaIds$/;

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createUsageState() {
  return {
    loading: false,
    errorMessage: null,
    authors: [],
    posts: [],
    categories: [],
    pages: []
  };
}

function createUsageEntry(label, route, kind, slot) {
  return {
    label,
    route,
    kind,
    slot
  };
}

function collectMediaIds(value, mediaIds = new Set()) {
  if (!value || typeof value !== "object") {
    return mediaIds;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectMediaIds(entry, mediaIds);
    }
    return mediaIds;
  }

  for (const [fieldKey, fieldValue] of Object.entries(value)) {
    if (MEDIA_ID_FIELD_PATTERN.test(fieldKey)) {
      const mediaId = toTrimmedString(fieldValue);
      if (mediaId) {
        mediaIds.add(mediaId);
      }
    } else if (MEDIA_IDS_FIELD_PATTERN.test(fieldKey)) {
      for (const mediaId of toArray(fieldValue)) {
        const normalizedMediaId = toTrimmedString(mediaId);
        if (normalizedMediaId) {
          mediaIds.add(normalizedMediaId);
        }
      }
    }

    if (fieldValue && typeof fieldValue === "object") {
      collectMediaIds(fieldValue, mediaIds);
    }
  }

  return mediaIds;
}

function pushUsage(map, mediaId, entry) {
  if (!mediaId) {
    return;
  }
  const current = map.get(mediaId) ?? [];
  current.push(entry);
  map.set(mediaId, current);
}

function buildUsageMap({ authors, posts, categories, pages }) {
  const usageMap = new Map();

  for (const author of toArray(authors)) {
    const avatarMediaId = toTrimmedString(author?.avatarMediaId);
    if (!avatarMediaId) {
      continue;
    }
    pushUsage(
      usageMap,
      avatarMediaId,
      createUsageEntry(
        author.displayName ?? author.id,
        {
          moduleId: "authors",
          authorId: author.id
        },
        "author",
        "avatar"
      )
    );
  }

  for (const post of toArray(posts)) {
    const title = post.title ?? post.slug ?? post.id;
    const baseRoute = {
      moduleId: "posts",
      search: title
    };
    pushUsage(
      usageMap,
      toTrimmedString(post?.featuredMediaId),
      createUsageEntry(title, baseRoute, "post", "featured")
    );
    pushUsage(
      usageMap,
      toTrimmedString(post?.ogImageMediaId),
      createUsageEntry(title, baseRoute, "post", "open-graph")
    );
    for (const mediaId of toArray(post?.galleryMediaIds)) {
      pushUsage(
        usageMap,
        toTrimmedString(mediaId),
        createUsageEntry(title, baseRoute, "post", "gallery")
      );
    }
  }

  for (const category of toArray(categories)) {
    const mediaId = toTrimmedString(category?.featuredMediaId);
    if (!mediaId) {
      continue;
    }
    const label = category.name ?? category.slug ?? category.id;
    pushUsage(
      usageMap,
      mediaId,
      createUsageEntry(
        label,
        {
          moduleId: "taxonomies",
          collectionId: CATEGORIES_COLLECTION_ID,
          search: label
        },
        "category",
        "featured"
      )
    );
  }

  for (const page of toArray(pages)) {
    const pageMediaIds = [...collectMediaIds(page, new Set())];
    if (pageMediaIds.length === 0) {
      continue;
    }
    const label = page.title ?? page.path ?? page.id;
    for (const mediaId of pageMediaIds) {
      pushUsage(
        usageMap,
        mediaId,
        createUsageEntry(
          label,
          {
            moduleId: "pages",
            pageId: page.id
          },
          "page",
          "content"
        )
      );
    }
  }

  return usageMap;
}

function buildUsageSummaryRows(entries = []) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
  }
  return {
    totalReferences: entries.length,
    authorCount: counts.get("author") ?? 0,
    postCount: counts.get("post") ?? 0,
    categoryCount: counts.get("category") ?? 0,
    pageCount: counts.get("page") ?? 0
  };
}

export function useMediaUsageAwareness(items = []) {
  const [usageState, setUsageState] = useState(createUsageState);

  const reload = useCallback(async () => {
    setUsageState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));

    try {
      const [authorsPayload, postsPayload, categoriesPayload, pagesPayload] = await Promise.all([
        fetchReferenceCollectionItems({ collectionId: AUTHORS_COLLECTION_ID, limit: 300 }),
        fetchReferenceCollectionItems({ collectionId: POSTS_COLLECTION_ID, limit: 300 }),
        fetchReferenceCollectionItems({ collectionId: CATEGORIES_COLLECTION_ID, limit: 300 }),
        fetchReferenceCollectionItems({ collectionId: PAGES_COLLECTION_ID, limit: 300 })
      ]);

      setUsageState({
        loading: false,
        errorMessage: null,
        authors: toArray(authorsPayload?.items),
        posts: toArray(postsPayload?.items),
        categories: toArray(categoriesPayload?.items),
        pages: toArray(pagesPayload?.items)
      });
    } catch (error) {
      setUsageState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load media usage awareness",
        authors: [],
        posts: [],
        categories: [],
        pages: []
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const usageByMediaId = useMemo(
    () =>
      new Map(
        [...buildUsageMap(usageState).entries()].map(([mediaId, entries]) => [
          mediaId,
          {
            entries,
            ...buildUsageSummaryRows(entries)
          }
        ])
      ),
    [usageState]
  );

  const referencedAssetCount = useMemo(
    () => items.filter((item) => (usageByMediaId.get(item.id)?.totalReferences ?? 0) > 0).length,
    [items, usageByMediaId]
  );

  return {
    usageState,
    usageByMediaId,
    referencedAssetCount,
    reload
  };
}
