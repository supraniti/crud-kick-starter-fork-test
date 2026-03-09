import { normalizeOptionalText } from "./content-shared-runtime.mjs";

const PAGES_COLLECTION_ID = "blog-pages";
const DEFAULT_LAYOUT_KEY = "blog-post";
const DEFAULT_SOURCE_TYPE = "blog-post";

function normalizePathSegment(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
}

function buildDefaultPath(post = {}) {
  const slug = normalizePathSegment(post.slug) || normalizePathSegment(post.id);
  return `/blog/${slug}`;
}

function preservePageValue(currentValue, nextValue) {
  return currentValue ?? nextValue;
}

function buildPageSeoValue(currentPage, post, fieldId) {
  return preservePageValue(currentPage?.[fieldId], normalizeOptionalText(post?.[fieldId]));
}

function buildPageSeoFields(post, currentPage = null) {
  return {
    canonicalUrl: buildPageSeoValue(currentPage, post, "canonicalUrl"),
    seoTitle: buildPageSeoValue(currentPage, post, "seoTitle"),
    seoDescription: buildPageSeoValue(currentPage, post, "seoDescription"),
    ogTitle: buildPageSeoValue(currentPage, post, "ogTitle"),
    ogDescription: buildPageSeoValue(currentPage, post, "ogDescription"),
    ogImageMediaId: buildPageSeoValue(currentPage, post, "ogImageMediaId")
  };
}

function buildPageLifecycleFields(post, currentPage = null) {
  return {
    scheduledOn: normalizeOptionalText(post.scheduledOn) ?? currentPage?.scheduledOn ?? null,
    publishedOn: normalizeOptionalText(post.publishedOn) ?? currentPage?.publishedOn ?? null,
    archivedOn: normalizeOptionalText(post.archivedOn) ?? currentPage?.archivedOn ?? null
  };
}

function buildPageValue(post, currentPage = null) {
  return {
    sourceType: currentPage?.sourceType ?? DEFAULT_SOURCE_TYPE,
    sourcePostId: post.id,
    path: currentPage?.path ?? buildDefaultPath(post),
    layoutKey: currentPage?.layoutKey ?? DEFAULT_LAYOUT_KEY,
    status: post.status,
    ...buildPageSeoFields(post, currentPage),
    ...buildPageLifecycleFields(post, currentPage)
  };
}

async function findPageByPostId(pagesHandler, postId) {
  if (!pagesHandler || typeof pagesHandler.list !== "function") {
    return null;
  }

  const payload = await pagesHandler.list({
    sourcePostId: postId,
    limit: 2,
    offset: 0
  });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items[0] ?? null;
}

async function resolvePost(postsHandler, postId) {
  if (!postsHandler || typeof postsHandler.findById !== "function") {
    return null;
  }
  return postsHandler.findById(postId);
}

async function createPage(pagesHandler, post) {
  const result = await pagesHandler.create({
    value: buildPageValue(post),
    reply: null
  });
  if (!result?.ok) {
    throw new Error(result?.payload?.error?.message ?? "Failed to create page record");
  }
}

async function updatePage(pagesHandler, page, post) {
  const nextValue = buildPageValue(post, page);
  const result = await pagesHandler.update({
    body: nextValue,
    value: nextValue,
    item: page,
    reply: null
  });
  if (!result?.ok) {
    throw new Error(result?.payload?.error?.message ?? "Failed to update page record");
  }
}

export async function syncPostPageRecord({ postsHandler, pagesHandler, postId }) {
  if (typeof postId !== "string" || !postsHandler || !pagesHandler) {
    return;
  }

  const post = await resolvePost(postsHandler, postId);
  if (!post) {
    return;
  }

  const existingPage = await findPageByPostId(pagesHandler, postId);
  if (!existingPage) {
    await createPage(pagesHandler, post);
    return;
  }

  await updatePage(pagesHandler, existingPage, post);
}

export { PAGES_COLLECTION_ID };
