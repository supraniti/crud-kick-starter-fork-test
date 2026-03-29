import {
  clonePageContextManifest,
  createPageContextBranch,
  validatePageContextManifest
} from "../shared/page-context-manifest-schema.mjs";

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function createFieldPaths(basePath, entries = []) {
  return entries.map((entry) => `${basePath}.${entry}`);
}

const MEDIA_SUMMARY_FIELD_SUFFIXES = [
  "id",
  "displayName",
  "altText",
  "description",
  "preferredUrl",
  "width",
  "height"
];

const POST_BRANCH_FIELDS = [
  ...createFieldPaths("context.post", [
    "id",
    "title",
    "slug",
    "subtitle",
    "excerpt",
    "body",
    "format",
    "locale",
    "readTimeMinutes",
    "wordCount",
    "publishedOn",
    "updatedOn"
  ]),
  "context.post.featuredMedia",
  ...createFieldPaths("context.post.featuredMedia", MEDIA_SUMMARY_FIELD_SUFFIXES),
  "context.post.galleryMedia[]",
  ...createFieldPaths("context.post.galleryMedia[]", MEDIA_SUMMARY_FIELD_SUFFIXES)
];

const AUTHOR_BRANCH_FIELDS = [
  ...createFieldPaths("context.author", [
    "id",
    "displayName",
    "slug",
    "bio",
    "role",
    "locale",
    "path",
    "publicUrl"
  ]),
  "context.author.avatarMedia",
  ...createFieldPaths("context.author.avatarMedia", MEDIA_SUMMARY_FIELD_SUFFIXES)
];

const CATEGORY_BRANCH_FIELDS = [
  ...createFieldPaths("context.categories[]", [
    "id",
    "name",
    "slug",
    "description",
    "path",
    "publicUrl",
    "treePath",
    "depth"
  ]),
  "context.categories[].featuredMedia",
  ...createFieldPaths("context.categories[].featuredMedia", MEDIA_SUMMARY_FIELD_SUFFIXES)
];

const TAG_BRANCH_FIELDS = createFieldPaths("context.tags[]", [
  "id",
  "name",
  "slug",
  "description",
  "path",
  "publicUrl"
]);

const CATEGORY_DETAIL_BRANCH_FIELDS = [
  ...createFieldPaths("context.category", [
    "id",
    "name",
    "slug",
    "description",
    "path",
    "publicUrl",
    "treePath",
    "depth"
  ]),
  "context.category.featuredMedia",
  ...createFieldPaths("context.category.featuredMedia", MEDIA_SUMMARY_FIELD_SUFFIXES)
];

const CATEGORY_CHILDREN_BRANCH_FIELDS = [
  ...createFieldPaths("context.children[]", [
    "id",
    "name",
    "slug",
    "description",
    "path",
    "publicUrl",
    "treePath",
    "depth"
  ]),
  "context.children[].featuredMedia",
  ...createFieldPaths("context.children[].featuredMedia", MEDIA_SUMMARY_FIELD_SUFFIXES)
];

const CATEGORY_POSTS_BRANCH_FIELDS = [
  ...createFieldPaths("context.posts[]", [
    "id",
    "title",
    "slug",
    "subtitle",
    "excerpt",
    "path",
    "publicUrl",
    "publishedOn"
  ]),
  "context.posts[].featuredMedia",
  ...createFieldPaths("context.posts[].featuredMedia", MEDIA_SUMMARY_FIELD_SUFFIXES)
];

const PAGE_BRANCH_FIELDS = createFieldPaths("context.page", [
  "id",
  "title",
  "path",
  "pathPattern",
  "status",
  "pageKind",
  "deploymentMode",
  "sourceSelectionMode",
  "primarySourceType",
  "layoutId",
  "layoutKey",
  "publishedOn",
  "scheduledOn"
]);

const NAVIGATION_BRANCH_FIELDS = [
  ...createFieldPaths("context.navigation.previousPost", [
    "id",
    "title",
    "slug",
    "path",
    "publicUrl"
  ]),
  ...createFieldPaths("context.navigation.nextPost", [
    "id",
    "title",
    "slug",
    "path",
    "publicUrl"
  ]),
  ...createFieldPaths("context.navigation.primaryCategory", [
    "id",
    "name",
    "slug",
    "path",
    "publicUrl"
  ]),
  ...createFieldPaths("context.navigation.breadcrumbs[]", [
    "id",
    "name",
    "slug",
    "path",
    "publicUrl"
  ])
];

const RELATED_BRANCH_FIELDS = [
  ...createFieldPaths("context.related.moreFromAuthor[]", [
    "id",
    "title",
    "slug",
    "subtitle",
    "excerpt",
    "path",
    "publicUrl",
    "publishedOn"
  ]),
  ...createFieldPaths("context.related.byCategory[]", [
    "id",
    "title",
    "slug",
    "subtitle",
    "excerpt",
    "path",
    "publicUrl",
    "publishedOn"
  ]),
  ...createFieldPaths("context.related.byTag[]", [
    "id",
    "title",
    "slug",
    "subtitle",
    "excerpt",
    "path",
    "publicUrl",
    "publishedOn"
  ])
];

const COMMENTS_META_BRANCH_FIELDS = createFieldPaths("context.commentsMeta", [
  "enabled",
  "policy",
  "postId"
]);

function readPageSummary(payload = {}) {
  return payload?.page && typeof payload.page === "object" ? payload.page : {};
}

function readApplicationModel(payload = {}) {
  return payload?.application?.model && typeof payload.application.model === "object"
    ? payload.application.model
    : null;
}

function isPostDetailPayload(payload = {}) {
  const model = readApplicationModel(payload);
  if (model?.kind === "post-detail") {
    return true;
  }
  return payload?.page?.primarySourceType === "blog-post";
}

function isCategoryDetailPayload(payload = {}) {
  const model = readApplicationModel(payload);
  if (model?.kind === "category-detail") {
    return true;
  }
  return payload?.page?.primarySourceType === "blog-category";
}

function createManifestBranch({
  path,
  label,
  kind,
  provenance,
  bindable,
  initial,
  widgetFamilies = [],
  fields = [],
  notes = null
}) {
  return createPageContextBranch({
    path,
    label,
    kind,
    provenance,
    bindable,
    initial,
    widgetFamilies,
    fields,
    notes
  });
}

function buildPageBranch() {
  return createManifestBranch({
    path: "context.page",
    label: "Page",
    kind: "record",
    provenance: "declared",
    bindable: true,
    initial: true,
    widgetFamilies: ["meta", "navigation", "layout"],
    fields: PAGE_BRANCH_FIELDS
  });
}

function buildPostDetailBranches() {
  return [
    createManifestBranch({
      path: "context.post",
      label: "Post",
      kind: "record",
      provenance: "declared",
      bindable: true,
      initial: true,
      widgetFamilies: ["text", "media", "meta"],
      fields: POST_BRANCH_FIELDS
    }),
    createManifestBranch({
      path: "context.author",
      label: "Primary Author",
      kind: "record",
      provenance: "declared",
      bindable: true,
      initial: true,
      widgetFamilies: ["text", "media", "meta"],
      fields: AUTHOR_BRANCH_FIELDS
    }),
    createManifestBranch({
      path: "context.categories",
      label: "Categories",
      kind: "collection",
      provenance: "declared",
      bindable: true,
      initial: true,
      widgetFamilies: ["taxonomy", "navigation", "collection"],
      fields: CATEGORY_BRANCH_FIELDS
    }),
    createManifestBranch({
      path: "context.tags",
      label: "Tags",
      kind: "collection",
      provenance: "declared",
      bindable: true,
      initial: true,
      widgetFamilies: ["taxonomy", "navigation", "collection"],
      fields: TAG_BRANCH_FIELDS
    }),
    createManifestBranch({
      path: "context.navigation",
      label: "Navigation",
      kind: "record",
      provenance: "derived",
      bindable: false,
      initial: false,
      widgetFamilies: ["navigation"],
      fields: NAVIGATION_BRANCH_FIELDS,
      notes: "Future navigation widgets may consume this derived branch after V1."
    }),
    createManifestBranch({
      path: "context.related",
      label: "Related Content",
      kind: "record",
      provenance: "derived",
      bindable: false,
      initial: false,
      widgetFamilies: ["collection", "navigation"],
      fields: RELATED_BRANCH_FIELDS,
      notes: "Future listing widgets may consume this derived branch after V1."
    }),
    createManifestBranch({
      path: "context.commentsMeta",
      label: "Comments Meta",
      kind: "record",
      provenance: "derived",
      bindable: false,
      initial: false,
      widgetFamilies: ["meta", "form"],
      fields: COMMENTS_META_BRANCH_FIELDS,
      notes: "Deferred comments loading stays outside the V1 bindable surface."
    })
  ];
}

function buildCategoryDetailBranches() {
  return [
    createManifestBranch({
      path: "context.category",
      label: "Category",
      kind: "record",
      provenance: "declared",
      bindable: true,
      initial: true,
      widgetFamilies: ["text", "media", "taxonomy", "meta"],
      fields: CATEGORY_DETAIL_BRANCH_FIELDS
    }),
    createManifestBranch({
      path: "context.children",
      label: "Child Categories",
      kind: "collection",
      provenance: "declared",
      bindable: true,
      initial: true,
      widgetFamilies: ["collection", "taxonomy", "navigation"],
      fields: CATEGORY_CHILDREN_BRANCH_FIELDS
    }),
    createManifestBranch({
      path: "context.posts",
      label: "Category Posts",
      kind: "collection",
      provenance: "declared",
      bindable: true,
      initial: true,
      widgetFamilies: ["collection", "navigation", "text", "media"],
      fields: CATEGORY_POSTS_BRANCH_FIELDS
    }),
    createManifestBranch({
      path: "context.navigation",
      label: "Navigation",
      kind: "record",
      provenance: "derived",
      bindable: false,
      initial: false,
      widgetFamilies: ["navigation"],
      fields: NAVIGATION_BRANCH_FIELDS
    })
  ];
}

function buildUnsupportedPageBranchNotes(payload = {}) {
  const model = readApplicationModel(payload);
  if (model?.kind && model.kind !== "post-detail") {
    return `No V1 widget binding contract is defined yet for '${model.kind}'.`;
  }
  return "No V1 widget binding contract is defined yet for this page configuration.";
}

export function resolvePageContextManifest(payload = {}) {
  const page = readPageSummary(payload);
  const model = readApplicationModel(payload);
  const isPostDetail = isPostDetailPayload(payload);
  const isCategoryDetail = isCategoryDetailPayload(payload);
  const manifestCandidate = {
    contractVersion: 1,
    pageKind: payload?.application?.pageKind ?? model?.kind ?? page.pageKind ?? null,
    primarySourceType: payload?.application?.primarySourceType ?? page.primarySourceType ?? null,
    branches: [
      buildPageBranch(),
      ...(isPostDetail
        ? buildPostDetailBranches()
        : isCategoryDetail
          ? buildCategoryDetailBranches()
        : [
            createManifestBranch({
              path: "context.page",
              label: "Page",
              kind: "record",
              provenance: "declared",
              bindable: true,
              initial: true,
              widgetFamilies: ["meta", "navigation", "layout"],
              fields: PAGE_BRANCH_FIELDS,
              notes: buildUnsupportedPageBranchNotes(payload)
            })
          ])
      ]
  };

  if (!isPostDetail && !isCategoryDetail) {
    manifestCandidate.branches = [manifestCandidate.branches[manifestCandidate.branches.length - 1]];
  }

  const { manifest, issues } = validatePageContextManifest(manifestCandidate);
  return {
    manifest: clonePageContextManifest(manifest),
    issues: normalizeArray(issues)
  };
}

export function attachPageContextManifest(payload = {}) {
  const { manifest, issues } = resolvePageContextManifest(payload);
  return {
    ...payload,
    pageContextManifest: manifest,
    pageContextManifestIssues: issues
  };
}
