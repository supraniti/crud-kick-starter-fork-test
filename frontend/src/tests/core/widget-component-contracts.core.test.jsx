import { describe, expect, test } from "vitest";
import {
  buildCanonicalBindingPath,
  normalizeCanonicalBindingPath
} from "../../../../modules/test-modules-pages/shared/widget-binding-namespace.mjs";
import {
  normalizePageContextManifest,
  validatePageContextManifest
} from "../../../../modules/test-modules-pages/shared/page-context-manifest-schema.mjs";
import {
  DEFAULT_WIDGET_COMPONENT_REGISTRY,
  buildWidgetComponentRegistry,
  normalizeWidgetBindingDescriptor,
  normalizeWidgetComponentInstance,
  validateWidgetComponentInstance
} from "../../../../modules/test-modules-layouts/shared/widget-component-schema.mjs";
import {
  createInitialLayoutDocument,
  normalizeLayoutDocument,
  validateLayoutDocument
} from "../../../../modules/test-modules-layouts/shared/layout-document.mjs";
import { resolvePageContextManifest } from "../../../../modules/test-modules-pages/server/page-context-manifest-runtime.mjs";

describe("widget component contracts", () => {
  test("normalizes canonical binding paths onto context.*", () => {
    expect(buildCanonicalBindingPath("post.title")).toBe("context.post.title");
    expect(normalizeCanonicalBindingPath("context.post.title")).toBe("context.post.title");
    expect(normalizeCanonicalBindingPath("")).toBeNull();
  });

  test("normalizes widget binding descriptors for static, context, and library sources", () => {
    expect(normalizeWidgetBindingDescriptor("Hello world")).toEqual({
      mode: "static",
      value: "Hello world"
    });

    expect(
      normalizeWidgetBindingDescriptor({
        mode: "dynamic",
        source: "context",
        path: "post.title"
      })
    ).toEqual({
      mode: "dynamic",
      source: "context",
      path: "context.post.title",
      fallback: null
    });

    expect(
      normalizeWidgetBindingDescriptor({
        mode: "dynamic",
        source: "library",
        libraryKey: "media",
        itemId: "mdi-001"
      })
    ).toEqual({
      mode: "dynamic",
      source: "library",
      libraryKey: "media",
      itemId: "mdi-001",
      snapshot: null,
      fallback: null
    });
  });

  test("fails fast for invalid registry descriptors", () => {
    expect(() =>
      buildWidgetComponentRegistry([
        {
          componentKey: "broken-widget",
          defaultBindings: {
            text: {
              mode: "dynamic",
              source: "context"
            }
          }
        }
      ])
    ).toThrow(/Invalid widget component descriptor/);
  });

  test("ships the seeded registry entries for the v1 widget slice", () => {
    expect([...DEFAULT_WIDGET_COMPONENT_REGISTRY.keys()]).toEqual(
      expect.arrayContaining([
        "post-title",
        "post-rich-text",
        "media-image",
        "category-chips",
        "author-card",
        "breadcrumbs",
        "post-navigation",
        "related-posts",
        "tabs"
      ])
    );
  });

  test("normalizes page context manifests and rejects derived bindable branches", () => {
    const normalized = normalizePageContextManifest({
      pageKind: "content-detail",
      primarySourceType: "blog-post",
      branches: [
        {
          path: "post",
          kind: "record",
          provenance: "declared",
          bindable: true
        }
      ]
    });

    expect(normalized.branches[0].path).toBe("context.post");

    const validation = validatePageContextManifest({
      branches: [
        {
          path: "context.navigation",
          kind: "record",
          provenance: "derived",
          bindable: true
        }
      ]
    });

    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAGE_CONTEXT_BRANCH_BINDABLE_DERIVED"
        })
      ])
    );
  });

  test("keeps legacy layout documents valid while normalizing block component instances", () => {
    const legacy = createInitialLayoutDocument();
    legacy.nodes.hero = {
      id: "hero",
      kind: "block",
      label: "Hero",
      props: {
        minHeight: 240,
        emphasis: "default",
        placeholderType: "hero"
      },
      placement: {
        grid: { x: 0, y: 0, w: 12, h: 3 },
        flex: { order: 0, basis: "100%", grow: 0, shrink: 0 }
      },
      children: []
    };
    legacy.nodes.root.children = ["hero"];

    const normalized = normalizeLayoutDocument(legacy);
    expect(normalized.nodes.hero.componentInstance).toBeNull();

    const validation = validateLayoutDocument({
      ...legacy,
      nodes: {
        ...legacy.nodes,
        hero: {
          ...legacy.nodes.hero,
          componentInstance: {
            componentKey: "",
            content: {
              text: {
                mode: "dynamic",
                source: "context"
              }
            }
          }
        }
      }
    });

    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "WIDGET_COMPONENT_KEY_REQUIRED"
        })
      ])
    );
  });

  test("normalizes nested component instance content trees for mixed widgets", () => {
    const instance = normalizeWidgetComponentInstance({
      componentKey: "tabs",
      content: {
        tabs: [
          {
            header: "Overview",
            body: {
              mode: "dynamic",
              source: "context",
              path: "post.excerpt"
            }
          }
        ]
      }
    });

    expect(instance).toEqual({
      componentKey: "tabs",
      variantKey: "default",
      content: {
        tabs: [
          {
            header: {
              mode: "static",
              value: "Overview"
            },
            body: {
              mode: "dynamic",
              source: "context",
              path: "context.post.excerpt",
              fallback: null
            }
          }
        ]
      },
      props: {},
      actions: []
    });

    expect(validateWidgetComponentInstance(instance).issues).toEqual([]);
  });

  test("builds a deterministic post-detail page context manifest from the canonical context contract", () => {
    const payload = {
      page: {
        id: "blogpage-001",
        title: "Post Page",
        path: "/post/example-story",
        pageKind: "content-detail",
        primarySourceType: "blog-post",
        layoutId: "pagelayo-001",
        layoutKey: "story-shell"
      },
      application: {
        pageKind: "post-detail",
        primarySourceType: "blog-post",
        model: {
          kind: "post-detail"
        }
      }
    };

    const first = resolvePageContextManifest(payload);
    const second = resolvePageContextManifest({
      ...payload,
      application: {
        ...payload.application,
        model: {
          kind: "post-detail",
          post: {
            id: "blogpost-002",
            title: "A different story"
          }
        }
      }
    });

    expect(first.issues).toEqual([]);
    expect(second.issues).toEqual([]);
    expect(first.manifest).toEqual(second.manifest);
    expect(first.manifest).toEqual(
      expect.objectContaining({
        canonicalRoot: "context",
        pageKind: "post-detail",
        primarySourceType: "blog-post",
        branches: expect.arrayContaining([
          expect.objectContaining({
            path: "context.page",
            provenance: "declared",
            bindable: true
          }),
          expect.objectContaining({
            path: "context.post",
            provenance: "declared",
            bindable: true,
            fields: expect.arrayContaining(["context.post.title", "context.post.featuredMedia.id"])
          }),
          expect.objectContaining({
            path: "context.author",
            provenance: "declared",
            bindable: true,
            fields: expect.arrayContaining(["context.author.displayName", "context.author.avatarMedia.id"])
          }),
          expect.objectContaining({
            path: "context.categories",
            provenance: "declared",
            bindable: true,
            fields: expect.arrayContaining(["context.categories[].name", "context.categories[].featuredMedia.id"])
          }),
          expect.objectContaining({
            path: "context.tags",
            provenance: "declared",
            bindable: true,
            fields: expect.arrayContaining(["context.tags[].name"])
          }),
          expect.objectContaining({
            path: "context.navigation",
            provenance: "derived",
            bindable: false
          }),
          expect.objectContaining({
            path: "context.commentsMeta",
            provenance: "derived",
            bindable: false
          })
        ])
      })
    );
  });
});
