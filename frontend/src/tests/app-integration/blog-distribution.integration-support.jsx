import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

export function createCollectionsDomain() {
  return {
    collectionsState: {
      loading: false,
      errorMessage: null,
      items: [
        {
          id: "blog-redirect-rules",
          label: "Redirect Rules",
          capabilities: {
            create: true,
            update: true,
            delete: true
          }
        }
      ]
    },
    collectionSchemaState: {
      loading: false,
      errorMessage: null,
      collection: {
        id: "blog-redirect-rules",
        label: "Redirect Rules",
        entitySingular: "redirect rule",
        fields: []
      }
    },
    collectionItemsState: {
      loading: false,
      errorMessage: null,
      items: []
    },
    referenceOptionsState: {},
    activeCollectionId: "blog-redirect-rules",
    isActiveCollectionAvailable: true,
    activeCollectionUnavailableMessage: null,
    handleSelectCollection: vi.fn(),
    reloadCollectionItems: vi.fn()
  };
}

export function installReferenceMocks(referenceApi) {
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return {
        items: [
          {
            id: "page-001",
            title: "Launch Story",
            pageKind: "content-detail",
            primarySourceType: "blog-post",
            path: "/stories/launch-window-update",
            layoutKey: "story-shell",
            primarySource: {
              sourceType: "blog-post",
              itemId: "post-001",
              bindAs: "primary"
            },
            dataSources: [],
            status: "scheduled",
            scheduledOn: "2026-03-09T09:00:00.000Z",
            seoTitle: "Launch Story",
            seoDescription: "Launch story description",
            ogTitle: "Launch Story",
            ogDescription: "Launch story description",
            ogImageMediaId: "media-001",
            createdOn: "2026-03-08T08:00:00.000Z",
            updatedOn: "2026-03-08T08:00:00.000Z"
          }
        ]
      };
    }

    if (collectionId === "blog-redirect-rules") {
      return {
        items: [
          {
            id: "redirect-001",
            sourcePath: "/legacy-launch",
            targetPageId: "page-001",
            targetUrl: null,
            httpCode: "301",
            status: "active",
            reason: "Legacy permalink",
            createdOn: "2026-03-08T08:00:00.000Z",
            updatedOn: "2026-03-08T08:00:00.000Z"
          }
        ]
      };
    }

    if (collectionId === "blog-posts") {
      return {
        items: [
          {
            id: "post-001",
            title: "Launch Window Update",
            slug: "launch-window-update",
            status: "scheduled",
            primaryAuthorId: "author-001",
            excerpt: "Launch story description",
            featuredMediaId: "media-001",
            seoTitle: "Launch Window Update",
            seoDescription: "Launch story description",
            ogTitle: "Launch Window Update",
            ogDescription: "Launch story description",
            ogImageMediaId: "media-001"
          }
        ]
      };
    }

    if (collectionId === "blog-authors") {
      return {
        items: [
          {
            id: "author-001",
            displayName: "Distribution Editor",
            role: "editor",
            status: "active"
          }
        ]
      };
    }

    if (collectionId === "blog-categories") {
      return {
        items: [
          {
            id: "cat-001",
            name: "Releases"
          }
        ]
      };
    }

    if (collectionId === "blog-tags") {
      return {
        items: [
          {
            id: "tag-001",
            name: "Platform"
          }
        ]
      };
    }

    if (collectionId === "media-items") {
      return {
        items: [
          {
            id: "media-001",
            displayName: "Launch Hero"
          }
        ]
      };
    }

    return {
      items: []
    };
  });
}

export function createJsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

