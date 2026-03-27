import { describe, expect, test } from "vitest";
import { createEmptyPageStudioDocument } from "../../../../modules/test-modules-page-studio/shared/page-studio-document.mjs";
import {
  buildPageStudioPreviewModel,
  resolvePageStudioPreviewTheme
} from "../../../../modules/test-modules-page-studio/frontend/page-studio-preview-data.js";

describe("page studio preview data", () => {
  test("builds a post-detail preview model from the authored slug param", () => {
    const studioDocument = createEmptyPageStudioDocument();
    const result = buildPageStudioPreviewModel({
      studioDocument,
      previewParams: {
        slug: "first-cup-on-the-table"
      },
      collections: {
        posts: [
          {
            id: "blogpost-021",
            slug: "first-cup-on-the-table",
            title: "First Cup On The Table",
            excerpt: "Morning pause.",
            body: "Story body",
            format: "article",
            primaryAuthorId: "blogauth-015",
            categoryIds: ["blogcate-017"],
            tagIds: ["blogtags-019"],
            featuredMediaId: "mdi-040",
            galleryMediaIds: [],
            allowComments: true,
            commentPolicy: "open",
            status: "published",
            publishedOn: "2026-03-25T08:14:44.715Z",
            updatedOn: "2026-03-25T08:14:44.715Z"
          },
          {
            id: "blogpost-022",
            slug: "park-bench-weather-log",
            title: "Park Bench Weather Log",
            excerpt: "Bench note",
            body: "Second story",
            format: "article",
            primaryAuthorId: "blogauth-015",
            categoryIds: ["blogcate-018"],
            tagIds: ["blogtags-017"],
            featuredMediaId: "mdi-041",
            galleryMediaIds: [],
            allowComments: true,
            commentPolicy: "open",
            status: "published",
            publishedOn: "2026-03-26T08:14:44.715Z",
            updatedOn: "2026-03-26T08:14:44.715Z"
          }
        ],
        authors: [
          {
            id: "blogauth-015",
            displayName: "Maya Nuli",
            bio: "Writes daily notes.",
            role: "author",
            slug: "maya-nuli"
          }
        ],
        categories: [
          {
            id: "blogcate-012",
            name: "Nuli Places",
            slug: "nuli-places",
            path: "nuli-places",
            depth: 0,
            parentCategoryId: null
          },
          {
            id: "blogcate-017",
            name: "Home Corners",
            slug: "home-corners",
            path: "nuli-places/home-corners",
            depth: 1,
            parentCategoryId: "blogcate-012"
          },
          {
            id: "blogcate-018",
            name: "Park Walks",
            slug: "park-walks",
            path: "nuli-places/park-walks",
            depth: 1,
            parentCategoryId: "blogcate-012"
          }
        ],
        tags: [
          {
            id: "blogtags-019",
            name: "Nuli Comfort",
            slug: "nuli-comfort"
          },
          {
            id: "blogtags-017",
            name: "Nuli Park",
            slug: "nuli-park"
          }
        ],
        mediaItems: [
          {
            id: "mdi-040",
            displayName: "Cup",
            relativePath: "originals/cup.jpg"
          },
          {
            id: "mdi-041",
            displayName: "Bench",
            relativePath: "originals/bench.jpg"
          }
        ]
      }
    });

    expect(result.ok).toBe(true);
    expect(result.page.path).toBe("/journal/first-cup-on-the-table");
    expect(result.model.kind).toBe("post-detail");
    expect(result.model.post.title).toBe("First Cup On The Table");
    expect(result.model.navigation.nextPost.title).toBe("Park Bench Weather Log");
    expect(result.model.navigation.breadcrumbs).toHaveLength(2);
    expect(result.model.post.featuredMedia.preferredUrl).toContain("/api/reference/modules/test-modules-media-manager/media-items/mdi-040/content");
  });

  test("resolves a preview theme from the active theme key", () => {
    const studioDocument = createEmptyPageStudioDocument();
    studioDocument.infra.themeKey = "signal-grid";

    const theme = resolvePageStudioPreviewTheme(studioDocument, []);

    expect(theme.themeKey).toBe("signal-grid");
    expect(theme.resolved.fonts.headingFamily).toContain("Space Grotesk");
  });
});
