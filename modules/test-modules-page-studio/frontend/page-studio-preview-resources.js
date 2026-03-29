import { useEffect, useMemo, useState } from "react";
import { normalizePageStudioDocument } from "../shared/page-studio-document.mjs";

const PREVIEW_BOOTSTRAP_CACHE_TTL_MS = 300000;
const PREVIEW_BOOTSTRAP_CACHE_STORAGE_KEY = "page-studio.preview.bootstrap-cache.v2";
const MODULE_ID = "test-modules-page-studio";

const previewBootstrapCache = new Map();
const previewBootstrapPromises = new Map();

function buildPreviewRequest(studioDocument) {
  const normalized = normalizePageStudioDocument(studioDocument);
  return {
    title: normalized.title,
    infra: {
      routePath: normalized.infra.routePath,
      themeKey: normalized.infra.themeKey,
      queries: normalized.infra.queries
    },
    preview: {
      urlParams: normalized.preview?.urlParams ?? {}
    }
  };
}

function buildPreviewSignature(studioDocument) {
  return JSON.stringify(buildPreviewRequest(studioDocument));
}

function createEmptyCollections() {
  return {
    posts: [],
    authors: [],
    categories: [],
    tags: [],
    mediaItems: [],
    themes: []
  };
}

function toBootstrapState(payload = null) {
  return {
    contentLoading: !payload,
    themeLoading: !payload,
    errorMessage: null,
    page: payload?.page ?? null,
    model: payload?.model ?? null,
    issue: payload?.issue ?? null,
    sourceRecordId: payload?.sourceRecordId ?? null,
    themeDocument: payload?.themeDocument ?? null,
    collections: payload?.collections ?? createEmptyCollections()
  };
}

function readStoredBootstrapCache() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(PREVIEW_BOOTSTRAP_CACHE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredBootstrapCache(cacheMap) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }
  try {
    window.sessionStorage.setItem(PREVIEW_BOOTSTRAP_CACHE_STORAGE_KEY, JSON.stringify(cacheMap));
  } catch {
    // ignore session storage pressure
  }
}

function readCachedPreviewPayload(signature, { allowStale = false } = {}) {
  if (!signature) {
    return null;
  }
  const memoryEntry = previewBootstrapCache.get(signature);
  if (memoryEntry && (allowStale || Date.now() - Number(memoryEntry.cachedAt ?? 0) < PREVIEW_BOOTSTRAP_CACHE_TTL_MS)) {
    return memoryEntry.payload ?? null;
  }
  const storedMap = readStoredBootstrapCache();
  const storedEntry = storedMap[signature];
  if (!storedEntry) {
    return null;
  }
  if (!allowStale && Date.now() - Number(storedEntry.cachedAt ?? 0) >= PREVIEW_BOOTSTRAP_CACHE_TTL_MS) {
    return null;
  }
  previewBootstrapCache.set(signature, storedEntry);
  return storedEntry.payload ?? null;
}

function writeCachedPreviewPayload(signature, payload) {
  if (!signature) {
    return;
  }
  const entry = {
    cachedAt: Date.now(),
    payload
  };
  previewBootstrapCache.set(signature, entry);
  const storedMap = readStoredBootstrapCache();
  storedMap[signature] = entry;
  writeStoredBootstrapCache(storedMap);
}

async function fetchPreviewBootstrap(studioDocument) {
  const signature = buildPreviewSignature(studioDocument);
  const cached = readCachedPreviewPayload(signature);
  if (cached) {
    return cached;
  }
  if (!previewBootstrapPromises.has(signature)) {
    previewBootstrapPromises.set(
      signature,
      fetch(`/api/reference/modules/${MODULE_ID}/preview/bootstrap`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          studioDocument: buildPreviewRequest(studioDocument)
        })
      })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok || payload?.ok !== true) {
            throw new Error(payload?.error?.message ?? `Preview bootstrap failed (${response.status})`);
          }
          const previewPayload = payload.preview ?? null;
          writeCachedPreviewPayload(signature, previewPayload);
          return previewPayload;
        })
        .finally(() => {
          previewBootstrapPromises.delete(signature);
        })
    );
  }
  return previewBootstrapPromises.get(signature);
}

export function warmPageStudioPreviewResources(studioDocument) {
  if (!studioDocument) {
    return;
  }
  void fetchPreviewBootstrap(studioDocument);
}

export function getPageStudioPreviewBootstrapResources(studioDocument) {
  const signature = buildPreviewSignature(studioDocument);
  const payload = readCachedPreviewPayload(signature, { allowStale: true });
  const state = toBootstrapState(payload);
  return {
    ready: Boolean(payload),
    contentReady: Boolean(payload),
    themeReady: Boolean(payload),
    ...state
  };
}

export function usePageStudioPreviewResources(studioDocument, { eager = true } = {}) {
  const signature = useMemo(() => buildPreviewSignature(studioDocument), [studioDocument]);
  const [state, setState] = useState(() => {
    const payload = readCachedPreviewPayload(signature, { allowStale: true });
    return toBootstrapState(payload);
  });

  useEffect(() => {
    const payload = readCachedPreviewPayload(signature, { allowStale: true });
    setState(toBootstrapState(payload));
  }, [signature]);

  useEffect(() => {
    if (!eager) {
      return undefined;
    }
    let active = true;

    async function load() {
      try {
        const payload = await fetchPreviewBootstrap(studioDocument);
        if (!active) {
          return;
        }
        setState(toBootstrapState(payload));
      } catch (error) {
        if (!active) {
          return;
        }
        setState((previous) => ({
          ...previous,
          contentLoading: false,
          themeLoading: false,
          errorMessage: error?.message ?? "Failed to load preview data"
        }));
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [eager, signature, studioDocument]);

  return state;
}

