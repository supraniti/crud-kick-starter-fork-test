(function (window) {
  function getSupport(targetGlobal) {
    var support = targetGlobal.__CRUD_PAGE_APPLICATION_TESTER_SUPPORT__;
    if (!support) {
      throw new Error("page-application support script is missing");
    }
    return support;
  }

  function createNode(documentObject, tagName, options) {
    var node = documentObject.createElement(tagName);
    var config = options && typeof options === "object" ? options : {};
    if (config.className) {
      node.className = config.className;
    }
    if (config.text) {
      node.textContent = config.text;
    }
    if (config.html) {
      node.innerHTML = config.html;
    }
    if (config.style) {
      node.style.cssText = config.style;
    }
    if (config.attributes && typeof config.attributes === "object") {
      Object.entries(config.attributes).forEach(function (entry) {
        var key = entry[0];
        var value = entry[1];
        if (value !== null && value !== undefined && value !== "") {
          node.setAttribute(key, String(value));
        }
      });
    }
    return node;
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function uniqueById(items) {
    var seen = Object.create(null);
    return normalizeArray(items).filter(function (item) {
      var itemId = item && item.id ? String(item.id) : "";
      if (!itemId || seen[itemId]) {
        return false;
      }
      seen[itemId] = true;
      return true;
    });
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function toText(value, fallback) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback || "";
  }

  function toClassToken(value, fallback) {
    var rawValue = toText(value, fallback || "");
    if (!rawValue) {
      return fallback || "node";
    }
    return rawValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || (fallback || "node");
  }

  function joinClassNames(entries) {
    return normalizeArray(entries).filter(Boolean).join(" ");
  }

  function toDisplayDate(value, support) {
    return value ? support.formatDateTime(value) : "";
  }

  function cloneJsonValue(value) {
    if (value === null || value === undefined) {
      return value == null ? null : value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeLocaleCode(value, fallback) {
    var normalized = toText(value, "");
    return normalized || toText(fallback, "en-US") || "en-US";
  }

  function listSupportedLocales(state) {
    var locales =
      state &&
      state.contract &&
      Array.isArray(state.contract.supportedTranslationLocales)
        ? state.contract.supportedTranslationLocales
        : [];
    if (!locales.length) {
      return [
        { code: "en-US", label: "English (US)" },
        { code: "fr-FR", label: "French" },
        { code: "he-IL", label: "Hebrew" },
        { code: "es-ES", label: "Spanish" },
        { code: "de-DE", label: "German" }
      ];
    }
    return locales.map(function (entry) {
      return {
        code: normalizeLocaleCode(entry && entry.code, "en-US"),
        label: toText(entry && entry.label, normalizeLocaleCode(entry && entry.code, "en-US"))
      };
    });
  }

  function deriveSourceLocaleFromDocument(bootstrapDocument, state) {
    if (bootstrapDocument && bootstrapDocument.sourceLocale) {
      return normalizeLocaleCode(bootstrapDocument.sourceLocale, "en-US");
    }
    var model = bootstrapDocument && bootstrapDocument.model ? bootstrapDocument.model : null;
    if (model && model.kind === "post-detail" && model.post) {
      return normalizeLocaleCode(model.post.locale, state && state.contract ? state.contract.translationDefaultLocale : "en-US");
    }
    if (model && model.kind === "category-detail" && model.category) {
      return normalizeLocaleCode(model.category.locale, state && state.contract ? state.contract.translationDefaultLocale : "en-US");
    }
    return normalizeLocaleCode(
      state && state.contract ? state.contract.translationDefaultLocale : "en-US",
      "en-US"
    );
  }

  function buildLocaleQueryValue(localeCode, sourceLocale) {
    var normalizedLocale = normalizeLocaleCode(localeCode, sourceLocale);
    var normalizedSourceLocale = normalizeLocaleCode(sourceLocale, "en-US");
    return normalizedLocale === normalizedSourceLocale ? "" : normalizedLocale;
  }

  function buildLocalizedPageUrl(targetGlobal, pagePath, localeCode, sourceLocale) {
    var nextUrl = new URL(pagePath, targetGlobal.location.origin);
    var localeQueryValue = buildLocaleQueryValue(localeCode, sourceLocale);
    if (localeQueryValue) {
      nextUrl.searchParams.set("locale", localeQueryValue);
    } else {
      nextUrl.searchParams.delete("locale");
    }
    return nextUrl.pathname + nextUrl.search + nextUrl.hash;
  }

  function readRequestedLocale(targetGlobal, sourceLocale) {
    try {
      var params = new URLSearchParams(targetGlobal.location.search || "");
      return normalizeLocaleCode(params.get("locale"), sourceLocale);
    } catch (_error) {
      return normalizeLocaleCode(sourceLocale, "en-US");
    }
  }

  function updateLocaleUrl(targetGlobal, state, mode) {
    if (!targetGlobal || !targetGlobal.history) {
      return;
    }
    var pagePath = readCurrentPagePath(targetGlobal, state);
    var nextUrl = buildLocalizedPageUrl(targetGlobal, pagePath, state.activeLocale, state.sourceLocale);
    if (mode === "push") {
      targetGlobal.history.pushState({ pagePath: pagePath, locale: state.activeLocale }, "", nextUrl);
      return;
    }
    targetGlobal.history.replaceState({ pagePath: pagePath, locale: state.activeLocale }, "", nextUrl);
  }

  function buildTranslationCacheKey(pagePath, localeCode) {
    return normalizePagePathValue(pagePath) + "::" + normalizeLocaleCode(localeCode, "en-US");
  }

  function parsePatchPath(pathValue) {
    return String(pathValue || "")
      .split(".")
      .map(function (entry) { return entry.trim(); })
      .filter(Boolean)
      .flatMap(function (entry) {
        var segments = [];
        entry.replace(/([^[.\]]+)|\[(\d+)\]/g, function (_match, objectKey, arrayIndex) {
          segments.push(objectKey !== undefined ? objectKey : Number.parseInt(arrayIndex, 10));
          return "";
        });
        return segments;
      });
  }

  function writeJsonValueAtPath(rootValue, pathValue, nextValue) {
    var segments = parsePatchPath(pathValue);
    if (!segments.length) {
      return cloneJsonValue(nextValue);
    }
    var clonedRoot =
      Array.isArray(rootValue)
        ? rootValue.slice()
        : rootValue && typeof rootValue === "object"
          ? { ...rootValue }
          : {};
    var cursor = clonedRoot;
    for (var index = 0; index < segments.length - 1; index += 1) {
      var segment = segments[index];
      var nextSegment = segments[index + 1];
      var existing = cursor[segment];
      var replacement =
        Array.isArray(existing)
          ? existing.slice()
          : existing && typeof existing === "object"
            ? { ...existing }
            : typeof nextSegment === "number"
              ? []
              : {};
      cursor[segment] = replacement;
      cursor = replacement;
    }
    cursor[segments[segments.length - 1]] = cloneJsonValue(nextValue);
    return clonedRoot;
  }

  function applyOverlayPatches(documentValue, patches) {
    var nextDocument = cloneJsonValue(documentValue);
    normalizeArray(patches).forEach(function (patch) {
      if (!patch || !patch.path) {
        return;
      }
      nextDocument = writeJsonValueAtPath(nextDocument, patch.path, patch.value);
    });
    return nextDocument;
  }

  function shouldUseIndexArtifact(delivery, href) {
    var accessMode = toText(delivery && delivery.accessMode, "");
    if (accessMode !== "custom-domain") {
      return true;
    }
    var candidate = toText(href, toText(delivery && delivery.publicOrigin, ""));
    if (!candidate) {
      return false;
    }
    try {
      var parsed = new URL(candidate);
      return parsed.hostname === "storage.googleapis.com" || /\\.storage\\.googleapis\\.com$/i.test(parsed.hostname);
    } catch (_error) {
      return false;
    }
  }

  function appendIndexArtifact(href) {
    var candidate = toText(href, "");
    if (!candidate) {
      return "";
    }
    try {
      var parsed = new URL(candidate);
      if (parsed.pathname === "/" || parsed.pathname === "") {
        parsed.pathname = "/index.html";
        return parsed.toString();
      }
      if (/\/index\.html$/i.test(parsed.pathname)) {
        return parsed.toString();
      }
      parsed.pathname = parsed.pathname.replace(/\/+$/g, "") + "/index.html";
      return parsed.toString();
    } catch (_error) {
      if (/\/index\.html$/i.test(candidate)) {
        return candidate;
      }
      return candidate.replace(/\/+$/g, "") + "/index.html";
    }
  }

  function appendActiveLocaleToHref(href) {
    var candidate = toText(href, "");
    if (!candidate) {
      return "";
    }
    var activeLocale = normalizeLocaleCode(
      window.__CRUD_PAGE_APPLICATION_ACTIVE_LOCALE__,
      window.__CRUD_PAGE_APPLICATION_SOURCE_LOCALE__ || "en-US"
    );
    var sourceLocale = normalizeLocaleCode(window.__CRUD_PAGE_APPLICATION_SOURCE_LOCALE__, "en-US");
    if (!activeLocale || activeLocale === sourceLocale) {
      return candidate;
    }
    try {
      var parsed = new URL(candidate, window.location.origin);
      parsed.searchParams.set("locale", activeLocale);
      return parsed.toString();
    } catch (_error) {
      return candidate;
    }
  }

  function normalizeLinkHref(link, delivery) {
    if (!link || typeof link !== "object") {
      return "";
    }
    var publicUrl = toText(link.publicUrl, "");
    if (publicUrl) {
      return appendActiveLocaleToHref(
        shouldUseIndexArtifact(delivery, publicUrl) ? appendIndexArtifact(publicUrl) : publicUrl
      );
    }
    var path = toText(link.path, "");
    var deliveryOrigin = toText(delivery && delivery.publicOrigin, "");
    if (path && deliveryOrigin) {
      return appendActiveLocaleToHref(buildFallbackPublicUrl(deliveryOrigin, path, delivery));
    }
    return appendActiveLocaleToHref(path);
  }

  function buildFallbackMediaSummary(media) {
    if (!media || typeof media !== "object") {
      return null;
    }
    return {
      id: media.id || null,
      displayName: toText(media.displayName, toText(media.altText, "Media")),
      altText: toText(media.altText, toText(media.displayName, "Media")),
      preferredUrl: toText(media.preferredUrl, toText(media.publicUrl, toText(media.temporaryUrl, ""))) || null
    };
  }

  function buildFallbackPublicUrl(publicOrigin, pathValue, delivery) {
    var origin = toText(publicOrigin, "");
    var path = toText(pathValue, "");
    if (!origin || !path) {
      return null;
    }
    var normalizedOrigin = origin.replace(/\/+$/g, "");
    var normalizedPath = path.replace(/^\/+/, "");
    var isCustomDomain = toText(delivery && delivery.accessMode, "") === "custom-domain";
    if (!normalizedPath) {
      return isCustomDomain ? normalizedOrigin + "/" : normalizedOrigin + "/index.html";
    }
    return isCustomDomain
      ? normalizedOrigin + "/" + normalizedPath
      : normalizedOrigin + "/" + normalizedPath + "/index.html";
  }

  function buildFallbackPostCard(record, publicOrigin, delivery) {
    if (!record || typeof record !== "object") {
      return null;
    }
    var slug = toText(record.slug, "");
    var path = slug ? "/post/" + slug : null;
    return {
      id: record.id || null,
      title: toText(record.title, "Untitled post"),
      slug: slug || null,
      excerpt: toText(record.excerpt, ""),
      publishedOn: record.publishedOn || null,
      updatedOn: record.updatedOn || null,
      path: path,
      publicUrl: buildFallbackPublicUrl(publicOrigin, path, delivery),
      featuredMedia: buildFallbackMediaSummary(record.featuredMedia)
    };
  }

  function buildFallbackPostModel(payload) {
    var record = payload && payload.data && payload.data.primary ? payload.data.primary.record : null;
    if (!record || typeof record !== "object") {
      return null;
    }
    var delivery = payload && payload.delivery ? payload.delivery : null;
    var publicOrigin = delivery ? toText(delivery.publicOrigin, "") : "";
    return {
      kind: "post-detail",
      post: {
        id: record.id || null,
        title: toText(record.title, payload && payload.page ? payload.page.title : "Untitled post"),
        slug: toText(record.slug, "") || null,
        subtitle: toText(record.subtitle, ""),
        excerpt: toText(record.excerpt, ""),
        body: toText(record.body, ""),
        format: toText(record.format, "article"),
        locale: toText(record.locale, "") || null,
        readTimeMinutes: record.readTimeMinutes || null,
        wordCount: record.wordCount || null,
        publishedOn: record.publishedOn || null,
        updatedOn: record.updatedOn || null,
        featuredMedia: buildFallbackMediaSummary(record.featuredMedia),
        galleryMedia: normalizeArray(record.galleryMedia).map(buildFallbackMediaSummary).filter(Boolean),
        author: {
          id: record.primaryAuthorId || null,
          displayName: toText(record.primaryAuthorTitle, toText(record.primaryAuthorIdTitle, "Author")),
          slug: null,
          bio: "",
          role: null,
          locale: null,
          avatarMedia: null,
          path: null,
          publicUrl: null
        },
        coAuthors: [],
        categories: normalizeArray(record.categoryIdsTitles || record.categoryTitles).map(function (item, index) {
          return { id: normalizeArray(record.categoryIds)[index] || null, name: toText(item, "Category"), path: null, publicUrl: null };
        }),
        tags: normalizeArray(record.tagIdsTitles || record.tagTitles).map(function (item, index) {
          return { id: normalizeArray(record.tagIds)[index] || null, name: toText(item, "Tag"), path: null, publicUrl: null };
        })
      },
      navigation: {
        previousPost: null,
        nextPost: null,
        authorPage: null,
        primaryCategory: null,
        breadcrumbs: []
      },
      related: {
        moreFromAuthor: [],
        byCategory: [],
        byTag: []
      },
      comments: {
        enabled: record.allowComments !== false && record.commentPolicy !== "closed",
        policy: toText(record.commentPolicy, "open"),
        postId: record.id || null
      }
    };
  }

  function buildFallbackCategoryModel(payload) {
    var record = payload && payload.data && payload.data.primary ? payload.data.primary.record : null;
    if (!record || typeof record !== "object") {
      return null;
    }
    var delivery = payload && payload.delivery ? payload.delivery : null;
    var publicOrigin = delivery ? toText(delivery.publicOrigin, "") : "";
    return {
      kind: "category-detail",
      category: {
        id: record.id || null,
        name: toText(record.name, payload && payload.page ? payload.page.title : "Category"),
        slug: toText(record.slug, "") || null,
        description: toText(record.description, ""),
        treePath: toText(record.path, ""),
        depth: record.depth || 0,
        featuredMedia: buildFallbackMediaSummary(record.featuredMedia)
      },
      navigation: {
        parentCategory: null,
        breadcrumbs: []
      },
      children: [],
      posts: normalizeArray(payload && payload.data ? payload.data.categoryPosts : []).map(function (item) {
        return buildFallbackPostCard(item && item.record ? item.record : item, publicOrigin, delivery);
      }).filter(Boolean)
    };
  }

  function buildFallbackApplicationModel(payload) {
    var primarySourceType = payload && payload.page ? toText(payload.page.primarySourceType, "none") : "none";
    if (primarySourceType === "blog-post") {
      return buildFallbackPostModel(payload);
    }
    if (primarySourceType === "blog-category") {
      return buildFallbackCategoryModel(payload);
    }
    return {
      kind: "generic-page",
      title: payload && payload.head ? toText(payload.head.title, payload && payload.page ? payload.page.title : "Page") : "Page",
      description: payload && payload.head ? toText(payload.head.description, "") : "",
      body: payload && payload.data && payload.data.primary && payload.data.primary.record ? toText(payload.data.primary.record.body, "") : ""
    };
  }

  function normalizePagePathValue(value) {
    var normalized = toText(value, "/");
    if (!normalized) {
      return "/";
    }
    if (normalized.charAt(0) !== "/") {
      normalized = "/" + normalized;
    }
    if (normalized.length > 1) {
      normalized = normalized.replace(/\/+$/g, "");
    }
    return normalized || "/";
  }

  function readRouteManifest(payload, targetGlobal) {
    var runtimeConfig =
      targetGlobal &&
      targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__ &&
      typeof targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__ === "object"
        ? targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__
        : null;
    var fromRuntime =
      runtimeConfig &&
      runtimeConfig.context &&
      runtimeConfig.context.routeManifest &&
      typeof runtimeConfig.context.routeManifest === "object"
        ? runtimeConfig.context.routeManifest
        : null;
    if (fromRuntime) {
      return fromRuntime;
    }
    var fromPayload =
      payload &&
      payload.application &&
      payload.application.routeManifest &&
      typeof payload.application.routeManifest === "object"
        ? payload.application.routeManifest
        : null;
    return fromPayload || null;
  }

  function normalizeRouteManifestEntries(routeManifest) {
    return normalizeArray(routeManifest && routeManifest.entries);
  }

  function buildRegexFromRoutePattern(pattern) {
    var normalized = toText(pattern, "");
    if (!normalized) {
      return null;
    }
    var escaped = normalized.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
    var source = escaped.replace(/\\\{([a-zA-Z0-9_-]+)\\\}/g, function (_match, tokenName) {
      return "(?<" + tokenName + ">[^/]+)";
    });
    return new RegExp("^" + source + "$");
  }

  function resolveRouteEntryByPath(routeManifest, pagePath) {
    var normalizedPath = normalizePagePathValue(pagePath);
    var entries = normalizeRouteManifestEntries(routeManifest);
    for (var index = 0; index < entries.length; index += 1) {
      var entry = entries[index];
      if (toText(entry && entry.deploymentMode, "") === "per-record") {
        continue;
      }
      if (normalizePagePathValue(entry && entry.path) === normalizedPath) {
        return {
          entry: entry,
          pathMatch: null
        };
      }
    }
    for (var patternIndex = 0; patternIndex < entries.length; patternIndex += 1) {
      var patternEntry = entries[patternIndex];
      if (toText(patternEntry && patternEntry.deploymentMode, "") !== "per-record") {
        continue;
      }
      var matcher = buildRegexFromRoutePattern(patternEntry && patternEntry.pathPattern);
      if (!matcher) {
        continue;
      }
      var match = matcher.exec(normalizedPath);
      if (!match) {
        continue;
      }
      return {
        entry: patternEntry,
        pathMatch: match.groups || {}
      };
    }
    return null;
  }

  function resolveRouteDocumentId(matchResult) {
    var entry = matchResult && matchResult.entry ? matchResult.entry : null;
    var pathMatch = matchResult && matchResult.pathMatch ? matchResult.pathMatch : {};
    var tokenName =
      entry &&
      entry.contentSource &&
      entry.contentSource.documentIdToken
        ? entry.contentSource.documentIdToken
        : "slug";
    if (tokenName && Object.prototype.hasOwnProperty.call(pathMatch, tokenName)) {
      return toText(pathMatch[tokenName], "");
    }
    if (Object.prototype.hasOwnProperty.call(pathMatch, "slug")) {
      return toText(pathMatch.slug, "");
    }
    if (Object.prototype.hasOwnProperty.call(pathMatch, "id")) {
      return toText(pathMatch.id, "");
    }
    return "";
  }

  function selectRouteEntryBySourceType(routeManifest, sourceType, preferredPageId) {
    var candidates = normalizeRouteManifestEntries(routeManifest).filter(function (entry) {
      return toText(entry && entry.primarySourceType, "") === toText(sourceType, "");
    });
    if (!candidates.length) {
      return null;
    }
    if (preferredPageId) {
      var preferred = candidates.find(function (entry) {
        return toText(entry && entry.pageId, "") === toText(preferredPageId, "");
      });
      if (preferred) {
        return preferred;
      }
    }
    return candidates[0] || null;
  }

  function buildResolvedRoutePath(entry, record) {
    if (!entry) {
      return null;
    }
    if (toText(entry.deploymentMode, "") !== "per-record") {
      return normalizePagePathValue(entry.path);
    }
    var pattern = toText(entry.pathPattern, "");
    if (!pattern) {
      return normalizePagePathValue(entry.path);
    }
    return normalizePagePathValue(
      pattern.replace(/\{([a-zA-Z0-9_-]+)\}/g, function (_match, tokenName) {
        if (tokenName === "slug") {
          return toText(record && record.slug, "");
        }
        if (tokenName === "id") {
          return toText(record && record.id, "");
        }
        return "";
      })
    );
  }

  function buildLinkedRoute(pathValue, delivery) {
    if (!pathValue) {
      return {
        path: null,
        publicUrl: null
      };
    }
    return {
      path: pathValue,
      publicUrl: buildFallbackPublicUrl(
        delivery && delivery.publicOrigin ? delivery.publicOrigin : "",
        pathValue,
        delivery
      )
    };
  }

  function buildLinkedRecordRoute(routeManifest, sourceType, record, preferredPageId, delivery) {
    if (!record) {
      return {
        path: null,
        publicUrl: null
      };
    }
    var entry = selectRouteEntryBySourceType(routeManifest, sourceType, preferredPageId);
    var pathValue = entry ? buildResolvedRoutePath(entry, record) : null;
    return buildLinkedRoute(pathValue, delivery);
  }

  function buildMediaSummaryFromPublishedDocument(media) {
    return buildFallbackMediaSummary(media);
  }

  function buildAuthorSummaryFromPublishedDocument(author, routeManifest, preferredPageId, delivery) {
    if (!author || typeof author !== "object") {
      return null;
    }
    var route = buildLinkedRecordRoute(routeManifest, "blog-author", author, preferredPageId, delivery);
    return {
      id: author.id || null,
      displayName: toText(author.displayName, toText(author.slug, "Author")),
      slug: toText(author.slug, "") || null,
      bio: toText(author.bio, ""),
      role: toText(author.role, "") || null,
      locale: toText(author.locale, "") || null,
      avatarMedia: buildMediaSummaryFromPublishedDocument(author.avatarMedia),
      path: route.path,
      publicUrl: route.publicUrl
    };
  }

  function buildCategorySummaryFromPublishedDocument(category, routeManifest, preferredPageId, delivery) {
    if (!category || typeof category !== "object") {
      return null;
    }
    var route = buildLinkedRecordRoute(routeManifest, "blog-category", category, preferredPageId, delivery);
    return {
      id: category.id || null,
      name: toText(category.name, toText(category.slug, "Category")),
      slug: toText(category.slug, "") || null,
      description: toText(category.description, ""),
      parentCategoryId: toText(category.parentCategoryId, "") || null,
      treePath: toText(category.path, "") || null,
      depth: Number.isFinite(Number(category.depth)) ? Number(category.depth) : 0,
      featuredMedia: buildMediaSummaryFromPublishedDocument(category.featuredMedia),
      path: route.path,
      publicUrl: route.publicUrl
    };
  }

  function buildTagSummaryFromPublishedDocument(tag, routeManifest, preferredPageId, delivery) {
    if (!tag || typeof tag !== "object") {
      return null;
    }
    var route = buildLinkedRecordRoute(routeManifest, "blog-tag", tag, preferredPageId, delivery);
    return {
      id: tag.id || null,
      name: toText(tag.name, toText(tag.slug, "Tag")),
      slug: toText(tag.slug, "") || null,
      description: toText(tag.description, ""),
      color: toText(tag.color, "") || null,
      path: route.path,
      publicUrl: route.publicUrl
    };
  }

  function buildPostCardFromPublishedDocument(post, routeManifest, preferredPageId, delivery) {
    if (!post || typeof post !== "object") {
      return null;
    }
    var route = buildLinkedRecordRoute(routeManifest, "blog-post", post, preferredPageId, delivery);
    return {
      id: post.id || null,
      title: toText(post.title, toText(post.slug, "Untitled post")),
      slug: toText(post.slug, "") || null,
      subtitle: toText(post.subtitle, ""),
      excerpt: toText(post.excerpt, ""),
      publishedOn: post.publishedOn || null,
      updatedOn: post.updatedOn || null,
      readTimeMinutes: Number.isFinite(Number(post.readTimeMinutes)) ? Number(post.readTimeMinutes) : null,
      wordCount: Number.isFinite(Number(post.wordCount)) ? Number(post.wordCount) : null,
      path: route.path,
      publicUrl: route.publicUrl,
      featuredMedia: buildMediaSummaryFromPublishedDocument(post.featuredMedia)
    };
  }

  function buildPostCategoriesFromPublishedDocument(record, routeManifest, preferredPageId, delivery) {
    var categories = normalizeArray(record && record.categories);
    if (categories.length) {
      return categories
        .map(function (item) {
          return buildCategorySummaryFromPublishedDocument(item, routeManifest, preferredPageId, delivery);
        })
        .filter(Boolean);
    }
    return normalizeArray(record && record.categoryIds).map(function (categoryId, index) {
      return buildCategorySummaryFromPublishedDocument({
        id: categoryId,
        name: normalizeArray(record && (record.categoryIdsTitles || record.categoryTitles))[index] || "Category"
      }, routeManifest, preferredPageId, delivery);
    }).filter(Boolean);
  }

  function buildPostTagsFromPublishedDocument(record, routeManifest, preferredPageId, delivery) {
    var tags = normalizeArray(record && record.tags);
    if (tags.length) {
      return tags
        .map(function (item) {
          return buildTagSummaryFromPublishedDocument(item, routeManifest, preferredPageId, delivery);
        })
        .filter(Boolean);
    }
    return normalizeArray(record && record.tagIds).map(function (tagId, index) {
      return buildTagSummaryFromPublishedDocument({
        id: tagId,
        name: normalizeArray(record && (record.tagIdsTitles || record.tagTitles))[index] || "Tag"
      }, routeManifest, preferredPageId, delivery);
    }).filter(Boolean);
  }

  function buildHeadFromPublishedDocument(documentRecord, routeEntry) {
    var title = toText(
      documentRecord && documentRecord.seoTitle,
      toText(documentRecord && documentRecord.title, toText(routeEntry && routeEntry.title, "Page"))
    );
    var description = toText(
      documentRecord && documentRecord.seoDescription,
      toText(documentRecord && documentRecord.excerpt, toText(documentRecord && documentRecord.description, ""))
    );
    return {
      title: title,
      description: description,
      canonicalUrl: null,
      openGraph: {
        title: toText(documentRecord && documentRecord.ogTitle, title),
        description: toText(documentRecord && documentRecord.ogDescription, description)
      }
    };
  }

  function buildInitialPostModelFromPublishedDocument(routeEntry, documentRecord, routeManifest, delivery) {
    var preferredPageId = routeEntry && routeEntry.pageId ? routeEntry.pageId : null;
    var categories = buildPostCategoriesFromPublishedDocument(
      documentRecord,
      routeManifest,
      preferredPageId,
      delivery
    );
    var tags = buildPostTagsFromPublishedDocument(
      documentRecord,
      routeManifest,
      preferredPageId,
      delivery
    );
    var primaryAuthor =
      documentRecord && documentRecord.primaryAuthor && typeof documentRecord.primaryAuthor === "object"
        ? buildAuthorSummaryFromPublishedDocument(
            documentRecord.primaryAuthor,
            routeManifest,
            preferredPageId,
            delivery
          )
        : buildAuthorSummaryFromPublishedDocument(
            {
              id: documentRecord && documentRecord.primaryAuthorId ? documentRecord.primaryAuthorId : null,
              slug: documentRecord && documentRecord.primaryAuthorSlug ? documentRecord.primaryAuthorSlug : null,
              displayName:
                documentRecord && documentRecord.primaryAuthorTitle
                  ? documentRecord.primaryAuthorTitle
                  : documentRecord && documentRecord.primaryAuthorId
                    ? documentRecord.primaryAuthorId
                    : "Author"
            },
            routeManifest,
            preferredPageId,
            delivery
          );
    var primaryCategory = categories[0] || null;
    return {
      kind: "post-detail",
      post: {
        id: documentRecord && documentRecord.id ? documentRecord.id : null,
        title: toText(documentRecord && documentRecord.title, toText(documentRecord && documentRecord.slug, "Untitled post")),
        slug: toText(documentRecord && documentRecord.slug, "") || null,
        subtitle: toText(documentRecord && documentRecord.subtitle, ""),
        excerpt: toText(documentRecord && documentRecord.excerpt, ""),
        body: toText(documentRecord && documentRecord.body, ""),
        format: toText(documentRecord && documentRecord.format, "article"),
        locale: toText(documentRecord && documentRecord.locale, "") || null,
        readTimeMinutes: Number.isFinite(Number(documentRecord && documentRecord.readTimeMinutes)) ? Number(documentRecord.readTimeMinutes) : null,
        wordCount: Number.isFinite(Number(documentRecord && documentRecord.wordCount)) ? Number(documentRecord.wordCount) : null,
        publishedOn: documentRecord && documentRecord.publishedOn ? documentRecord.publishedOn : null,
        updatedOn: documentRecord && documentRecord.updatedOn ? documentRecord.updatedOn : null,
        featuredMedia: buildMediaSummaryFromPublishedDocument(documentRecord && documentRecord.featuredMedia),
        galleryMedia: normalizeArray(documentRecord && documentRecord.galleryMedia).map(buildMediaSummaryFromPublishedDocument).filter(Boolean),
        author: primaryAuthor,
        coAuthors: normalizeArray(documentRecord && documentRecord.coAuthors)
          .map(function (item) {
            return buildAuthorSummaryFromPublishedDocument(item, routeManifest, preferredPageId, delivery);
          })
          .filter(Boolean),
        categories: categories,
        tags: tags
      },
      navigation: {
        previousPost: null,
        nextPost: null,
        authorPage: primaryAuthor && primaryAuthor.path
          ? { path: primaryAuthor.path, publicUrl: primaryAuthor.publicUrl }
          : null,
        primaryCategory: primaryCategory,
        breadcrumbs: categories
      },
      related: {
        moreFromAuthor: [],
        byCategory: [],
        byTag: []
      },
      comments: {
        enabled:
          documentRecord && documentRecord.allowComments !== false &&
          toText(documentRecord && documentRecord.commentPolicy, "open") !== "closed",
        policy: toText(documentRecord && documentRecord.commentPolicy, "open"),
        postId: documentRecord && documentRecord.id ? documentRecord.id : null
      }
    };
  }

  function buildInitialCategoryModelFromPublishedDocument(routeEntry, documentRecord, routeManifest, delivery) {
    var preferredPageId = routeEntry && routeEntry.pageId ? routeEntry.pageId : null;
    var parentCategory =
      documentRecord && documentRecord.parentCategory && typeof documentRecord.parentCategory === "object"
        ? buildCategorySummaryFromPublishedDocument(
            documentRecord.parentCategory,
            routeManifest,
            preferredPageId,
            delivery
          )
        : null;
    return {
      kind: "category-detail",
      category: {
        id: documentRecord && documentRecord.id ? documentRecord.id : null,
        name: toText(documentRecord && documentRecord.name, toText(documentRecord && documentRecord.slug, "Category")),
        slug: toText(documentRecord && documentRecord.slug, "") || null,
        description: toText(documentRecord && documentRecord.description, ""),
        treePath: toText(documentRecord && documentRecord.path, ""),
        depth: Number.isFinite(Number(documentRecord && documentRecord.depth)) ? Number(documentRecord.depth) : 0,
        featuredMedia: buildMediaSummaryFromPublishedDocument(documentRecord && documentRecord.featuredMedia)
      },
      navigation: {
        parentCategory: parentCategory,
        breadcrumbs: []
      },
      children: [],
      posts: []
    };
  }

  function buildBootstrapDocumentFromPublishedRoute(targetGlobal, payload, routeEntry, pagePath, documentRecord, routeManifestOverride) {
    var delivery = payload && payload.delivery ? payload.delivery : {};
    var routeManifest =
      routeManifestOverride && typeof routeManifestOverride === "object"
        ? routeManifestOverride
        : readRouteManifest(payload, targetGlobal);
    var resolvedRouteManifest =
      routeManifest && typeof routeManifest === "object"
        ? JSON.parse(JSON.stringify(routeManifest))
        : null;
    if (resolvedRouteManifest && routeEntry && routeEntry.pageId) {
      resolvedRouteManifest.currentPageId = routeEntry.pageId;
    }
    var primarySourceType = routeEntry && routeEntry.primarySourceType ? routeEntry.primarySourceType : "none";
    var model =
      primarySourceType === "blog-post"
        ? buildInitialPostModelFromPublishedDocument(routeEntry, documentRecord, resolvedRouteManifest, delivery)
        : primarySourceType === "blog-category"
          ? buildInitialCategoryModelFromPublishedDocument(routeEntry, documentRecord, resolvedRouteManifest, delivery)
          : buildFallbackApplicationModel(payload);
    var head = buildHeadFromPublishedDocument(documentRecord, routeEntry);
    return {
      contractVersion: 2,
      tier: "initial",
      path: normalizePagePathValue(pagePath),
      pageId: routeEntry && routeEntry.pageId ? routeEntry.pageId : null,
      pageKind: model && model.kind ? model.kind : "generic-page",
      primarySourceType: primarySourceType,
      head: head,
      delivery: {
        ...(delivery && typeof delivery === "object" ? delivery : {}),
        publicUrl: buildFallbackPublicUrl(
          delivery && delivery.publicOrigin ? delivery.publicOrigin : "",
          pagePath,
          delivery
        )
      },
      layout: routeEntry && routeEntry.layout ? JSON.parse(JSON.stringify(routeEntry.layout)) : null,
      theme: routeEntry && routeEntry.theme ? JSON.parse(JSON.stringify(routeEntry.theme)) : null,
      routeManifest: resolvedRouteManifest,
      model: model,
      review: {
        pageId: routeEntry && routeEntry.pageId ? routeEntry.pageId : null,
        pagePath: normalizePagePathValue(pagePath),
        layoutId: routeEntry && routeEntry.layout ? routeEntry.layout.layoutId || null : null,
        layoutKey: routeEntry && routeEntry.layout ? routeEntry.layout.layoutKey || null : null,
        publicUrl: buildFallbackPublicUrl(
          delivery && delivery.publicOrigin ? delivery.publicOrigin : "",
          pagePath,
          delivery
        ),
        resolvedAt: new Date().toISOString()
      },
      resolvedAt: new Date().toISOString()
    };
  }

  function buildDeferredDocumentForRoute(payload, routeEntry, pagePath, deferredPayload) {
    var routeManifest = readRouteManifest(payload, window);
    var delivery = payload && payload.delivery ? payload.delivery : {};
    var preferredPageId = routeEntry && routeEntry.pageId ? routeEntry.pageId : null;
    var deferred = deferredPayload && deferredPayload.deferred ? deferredPayload.deferred : {};
    if (toText(routeEntry && routeEntry.primarySourceType, "") === "blog-post") {
      return {
        contractVersion: 2,
        path: normalizePagePathValue(pagePath),
        pageId: routeEntry && routeEntry.pageId ? routeEntry.pageId : null,
        pageKind: "post-detail",
        deferred: {
          navigation: {
            previousPost:
              deferred.navigation && deferred.navigation.previousPost
                ? (deferred.navigation.previousPost.path || deferred.navigation.previousPost.publicUrl
                    ? deferred.navigation.previousPost
                    : buildPostCardFromPublishedDocument(
                        deferred.navigation.previousPost,
                        routeManifest,
                        preferredPageId,
                        delivery
                      ))
                : null,
            nextPost:
              deferred.navigation && deferred.navigation.nextPost
                ? (deferred.navigation.nextPost.path || deferred.navigation.nextPost.publicUrl
                    ? deferred.navigation.nextPost
                    : buildPostCardFromPublishedDocument(
                        deferred.navigation.nextPost,
                        routeManifest,
                        preferredPageId,
                        delivery
                      ))
                : null,
            authorPage:
              deferred.navigation && deferred.navigation.authorPage
                ? deferred.navigation.authorPage
                : null
          },
          related: {
            moreFromAuthor: normalizeArray(deferred.related && deferred.related.moreFromAuthor).map(function (item) {
              return item && (item.path || item.publicUrl)
                ? item
                : buildPostCardFromPublishedDocument(item, routeManifest, preferredPageId, delivery);
            }).filter(Boolean),
            byCategory: normalizeArray(deferred.related && deferred.related.byCategory).map(function (item) {
              return item && (item.path || item.publicUrl)
                ? item
                : buildPostCardFromPublishedDocument(item, routeManifest, preferredPageId, delivery);
            }).filter(Boolean),
            byTag: normalizeArray(deferred.related && deferred.related.byTag).map(function (item) {
              return item && (item.path || item.publicUrl)
                ? item
                : buildPostCardFromPublishedDocument(item, routeManifest, preferredPageId, delivery);
            }).filter(Boolean)
          }
        },
        resolvedAt: deferredPayload && deferredPayload.resolvedAt ? deferredPayload.resolvedAt : new Date().toISOString()
      };
    }
    if (toText(routeEntry && routeEntry.primarySourceType, "") === "blog-category") {
      return {
        contractVersion: 2,
        path: normalizePagePathValue(pagePath),
        pageId: routeEntry && routeEntry.pageId ? routeEntry.pageId : null,
        pageKind: "category-detail",
        deferred: {
          children: normalizeArray(deferred.children).map(function (item) {
            return item && (item.path || item.publicUrl)
              ? item
              : buildCategorySummaryFromPublishedDocument(item, routeManifest, preferredPageId, delivery);
          }).filter(Boolean),
          posts: normalizeArray(deferred.posts).map(function (item) {
            return item && (item.path || item.publicUrl)
              ? item
              : buildPostCardFromPublishedDocument(item, routeManifest, preferredPageId, delivery);
          }).filter(Boolean)
        },
        resolvedAt: deferredPayload && deferredPayload.resolvedAt ? deferredPayload.resolvedAt : new Date().toISOString()
      };
    }
    return deferredPayload;
  }

  function ensureStyles(documentObject) {
    if (documentObject.getElementById("page-application-style")) {
      return;
    }
    var style = documentObject.createElement("style");
    style.id = "page-application-style";
    style.textContent = [
      ":root{",
      "color-scheme:light;",
      "--page-bg:#f6efe3;",
      "--page-card:#fffaf2;",
      "--page-line:rgba(69,52,36,0.14);",
      "--page-ink:#2d2116;",
      "--page-muted:#6f604f;",
      "--page-accent:#9b4d19;",
      "--page-accent-soft:#f3dcc7;",
      "--page-shadow:0 24px 60px rgba(69,52,36,0.12);",
      "--page-primary:#8a4b22;",
      "--page-secondary:#325c74;",
      "--page-heading-font:Georgia,'Times New Roman',serif;",
      "--page-body-font:Georgia,'Times New Roman',serif;",
      "--page-h1-size:clamp(2.9rem,7vw,5.4rem);",
      "--page-h1-line-height:0.94;",
      "--page-h1-weight:700;",
      "--page-h1-letter-spacing:-0.04em;",
      "--page-h2-size:2rem;",
      "--page-h2-line-height:1.04;",
      "--page-h2-weight:700;",
      "--page-h2-letter-spacing:-0.02em;",
      "--page-h3-size:1.35rem;",
      "--page-h3-line-height:1.18;",
      "--page-h3-weight:700;",
      "--page-h3-letter-spacing:-0.01em;",
      "--page-body-size:1.05rem;",
      "--page-body-line-height:1.8;",
      "--page-body-weight:400;",
      "--page-caption-size:0.92rem;",
      "--page-caption-line-height:1.45;",
      "--page-caption-weight:500;",
      "--page-gutter:24px;",
      "--page-section-gap:32px;",
      "--page-block-gap:16px;",
      "--page-radius:28px;",
      "}",
      "body{margin:0;font-family:var(--page-body-font);background:var(--page-bg);color:var(--page-ink);}",
      "#page-shell{min-height:100vh;}",
      "#page-app.page-app-root{display:grid;gap:24px;max-width:1200px;margin:0 auto;padding:32px 20px 80px;box-sizing:border-box;}",
      ".page-app-hero{display:grid;gap:20px;padding:24px;border:1px solid var(--page-line);border-radius:28px;background:var(--page-card);box-shadow:var(--page-shadow);}",
      ".page-app-hero-top{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;}",
      ".page-app-locale-menu{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;}",
      ".page-app-locale-menu label{font:600 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--page-muted);}",
      ".page-app-locale-menu select{min-width:160px;border:1px solid var(--page-line);border-radius:999px;padding:9px 14px;background:var(--page-card);color:var(--page-ink);font:500 13px/1.3 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}",
      ".page-app-hero-media{overflow:hidden;border-radius:22px;border:1px solid var(--page-line);background:var(--page-card);}",
      ".page-app-hero-media img,.page-app-gallery-item img,.page-app-card img{display:block;width:100%;height:auto;}",
      ".page-app-eyebrow{font:600 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--page-accent);margin:0 0 10px;}",
      ".page-app-title{margin:0;font-size:clamp(2.3rem,5vw,4.2rem);line-height:.98;}",
      ".page-app-subtitle{margin:0;font-size:1.15rem;line-height:1.55;color:var(--page-muted);max-width:70ch;}",
      ".page-app-meta,.page-app-chip-row,.page-app-link-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}",
      ".page-app-meta{font:500 14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}",
      ".page-app-chip,.page-app-link-chip{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;border:1px solid var(--page-line);background:var(--page-card);font:500 13px/1.3 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-ink);text-decoration:none;}",
      ".page-app-link-chip{background:var(--page-accent-soft);color:var(--page-accent);}",
      ".page-app-layout{display:grid;gap:24px;grid-template-columns:minmax(0,2fr) minmax(300px,1fr);align-items:start;}",
      ".page-app-layout.single-column{grid-template-columns:minmax(0,1fr);}",
      ".page-app-main,.page-app-side{display:grid;gap:20px;}",
      ".page-app-card{padding:22px;border:1px solid var(--page-line);border-radius:24px;background:var(--page-card);box-shadow:var(--page-shadow);overflow:hidden;}",
      ".page-app-card h2,.page-app-card h3,.page-app-card p{margin-top:0;}",
      ".page-app-card h2{margin-bottom:14px;font-size:1.5rem;}",
      ".page-app-card h3{margin-bottom:10px;font-size:1.1rem;}",
      ".page-app-body{font-size:1.1rem;line-height:1.8;color:var(--page-ink);}",
      ".page-app-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}",
      ".page-app-gallery{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));}",
      ".page-app-gallery-item{border-radius:18px;overflow:hidden;border:1px solid var(--page-line);background:var(--page-card);}",
      ".page-app-gallery-caption{padding:10px 12px;font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}",
      ".page-app-author{display:grid;gap:14px;grid-template-columns:80px minmax(0,1fr);align-items:start;}",
      ".page-app-avatar{width:80px;height:80px;border-radius:24px;overflow:hidden;background:var(--page-card);border:1px solid var(--page-line);}",
      ".page-app-stat{font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}",
      ".page-app-nav{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}",
      ".page-app-nav a,.page-app-post-list a{text-decoration:none;color:inherit;}",
      ".page-app-nav-card{padding:18px;border-radius:20px;border:1px solid var(--page-line);background:var(--page-card);display:grid;gap:8px;min-height:112px;}",
      ".page-app-nav-card strong{font:600 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--page-accent);}",
      ".page-app-post-list{display:grid;gap:14px;}",
      ".page-app-post-card{display:grid;gap:12px;padding:18px;border:1px solid var(--page-line);border-radius:20px;background:var(--page-card);}",
      ".page-app-comments-list{display:grid;gap:12px;}",
      ".page-app-comment{padding:14px;border:1px solid var(--page-line);border-radius:18px;background:var(--page-card);}",
      ".page-app-comment-head{display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}",
      ".page-app-comment.pending{border-style:dashed;background:var(--page-accent-soft);}",
      ".page-app-form{display:grid;gap:12px;}",
      ".page-app-form-row{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));}",
      ".page-app-form label{display:grid;gap:6px;font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}",
      ".page-app-form input,.page-app-form textarea{width:100%;box-sizing:border-box;border:1px solid var(--page-line);border-radius:14px;padding:11px 12px;font:inherit;background:var(--page-card);color:var(--page-ink);}",
      ".page-app-form textarea{min-height:140px;resize:vertical;}",
      ".page-app-actions{display:flex;gap:10px;flex-wrap:wrap;}",
      ".page-app-button{appearance:none;border:0;border-radius:999px;padding:11px 16px;font:600 13px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--page-accent);color:#fff;cursor:pointer;}",
      ".page-app-button.alt{background:var(--page-secondary);}",
      ".page-app-button:disabled{opacity:.6;cursor:default;}",
      ".page-app-note{font:500 13px/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}",
      ".page-app-empty{padding:18px;border:1px dashed var(--page-line);border-radius:18px;color:var(--page-muted);font:500 14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}",
      ".page-app-review{position:fixed;right:16px;top:16px;z-index:2147483000;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;padding:16px;border-radius:22px;border:1px solid var(--page-line);background:var(--page-card);box-shadow:var(--page-shadow);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-ink);display:grid;gap:12px;}",
      ".page-app-review h2,.page-app-review h3,.page-app-review p,.page-app-review pre{margin:0;}",
      ".page-app-review pre{padding:12px;border-radius:14px;background:#1f2937;color:#e5eef7;white-space:pre-wrap;word-break:break-word;overflow:auto;font:12px/1.45 Consolas,monospace;}",
      ".page-app-review details{border-top:1px solid var(--page-line);padding-top:10px;}",
      ".page-app-review summary{cursor:pointer;font-weight:600;}",
      "#page-app.page-app-root{max-width:1280px;padding:40px 24px 96px;gap:32px;}",
      ".page-app-widget-layout{display:grid;gap:32px;}",
      ".page-app-container{min-width:0;}",
      ".page-app-container--flex{display:flex;}",
      ".page-app-container--grid{display:grid;}",
      ".page-app-container--label-hero-row,.page-app-container--label-support-row{align-items:flex-start;}",
      ".page-app-block{min-width:0;display:grid;gap:16px;align-content:start;}",
      ".page-app-block--surface-plain{padding:0;border:0;background:transparent;box-shadow:none;overflow:visible;}",
      ".page-app-block--surface-soft{padding:20px;border:1px solid var(--page-line);border-radius:24px;background:var(--page-card);box-shadow:var(--page-shadow);overflow:hidden;}",
      ".page-app-block--surface-card,.page-app-block--surface-strong{padding:24px;border:1px solid var(--page-line);border-radius:28px;background:var(--page-card);box-shadow:var(--page-shadow);overflow:hidden;}",
      ".page-app-block--surface-strong{background:var(--page-card);}",
      ".page-app-block--label-breadcrumbs,.page-app-block--label-story-title,.page-app-block--label-story-body,.page-app-block--widget-post-rich-text,.page-app-block--widget-category-chips,.page-app-block--widget-related-posts{padding:0;border:0;background:transparent;box-shadow:none;overflow:visible;}",
      ".page-app-block--widget-post-title .page-app-title{font-size:clamp(3rem,7vw,5.6rem);line-height:.92;letter-spacing:-.045em;max-width:12ch;text-wrap:balance;}",
      ".page-app-block--widget-breadcrumbs .page-app-link-row{gap:8px;}",
      ".page-app-block--widget-breadcrumbs .page-app-link-chip,.page-app-block--widget-category-chips .page-app-link-chip{background:var(--page-card);}",
      ".page-app-block--widget-media-image figure{margin:0;border-radius:30px;border:1px solid var(--page-line);background:var(--page-card);box-shadow:var(--page-shadow);overflow:hidden;}",
      ".page-app-block--label-static-library-media figure{border-radius:22px;box-shadow:var(--page-shadow);}",
      ".page-app-block--widget-post-rich-text .page-app-body{max-width:74ch;font-size:1.12rem;line-height:1.95;}",
      ".page-app-block--widget-post-rich-text .page-app-body p:first-child{font-size:1.22rem;line-height:1.9;color:var(--page-primary);}",
      ".page-app-block--widget-author-card{padding:22px;border:1px solid var(--page-line);border-radius:24px;background:var(--page-card);box-shadow:var(--page-shadow);}",
      ".page-app-block--widget-author-card .page-app-link-chip{justify-self:start;}",
      ".page-app-block--widget-tabs .page-app-chip,.page-app-block--widget-tabs .page-app-link-chip{cursor:pointer;}",
      ".page-app-block--widget-post-navigation .page-app-nav{grid-template-columns:repeat(auto-fit,minmax(200px,1fr));}",
      ".page-app-block--widget-related-posts .page-app-post-list{grid-template-columns:repeat(auto-fit,minmax(260px,1fr));}",
      ".page-app-block--widget-related-posts .page-app-post-list>*{min-width:0;}",
      ".page-app-block--widget-related-posts .page-app-post-card{height:100%;}",
      ".page-app-block--widget-post-navigation h2,.page-app-block--widget-related-posts h2{margin:0;font-size:1.35rem;}",
      ".page-app-container--label-story-sidebar{position:relative;}",
      ".page-app-container--label-story-sidebar>.page-app-block{height:fit-content;}",
      "@media (min-width:960px){.page-app-hero{grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);align-items:start;}}",
      "@media (max-width:980px){#page-app.page-app-root{padding:28px 18px 72px;}.page-app-container--label-hero-row,.page-app-container--label-support-row{flex-direction:column!important;}.page-app-container--label-hero-row>.page-app-block,.page-app-container--label-support-row>.page-app-block{flex-basis:100%!important;}}",
      "@media (max-width:900px){.page-app-layout{grid-template-columns:minmax(0,1fr);} .page-app-form-row{grid-template-columns:minmax(0,1fr);} .page-app-review{position:static;width:auto;max-height:none;margin:0 20px 24px;}}"
    ].join("");
    documentObject.head.appendChild(style);
  }

  function readResolvedThemeDocument(state) {
    return state && state.payload && state.payload.application && state.payload.application.theme
      ? state.payload.application.theme
      : null;
  }

  function ensureThemeStyleNodes(documentObject) {
    var fontStyle = documentObject.getElementById("page-application-theme-fonts");
    if (!fontStyle) {
      fontStyle = documentObject.createElement("style");
      fontStyle.id = "page-application-theme-fonts";
      documentObject.head.appendChild(fontStyle);
    }
    var themeStyle = documentObject.getElementById("page-application-theme-style");
    if (!themeStyle) {
      themeStyle = documentObject.createElement("style");
      themeStyle.id = "page-application-theme-style";
      documentObject.head.appendChild(themeStyle);
    }
    return {
      fontStyle: fontStyle,
      themeStyle: themeStyle
    };
  }

  function buildCssVariableBlock(selector, variables) {
    var entries = variables && typeof variables === "object" ? Object.entries(variables) : [];
    if (!entries.length) {
      return "";
    }
    return selector + "{" + entries.map(function (entry) {
      return entry[0] + ":" + String(entry[1]) + ";";
    }).join("") + "}";
  }

  function buildThemeFontStylesheet(themeDocument) {
    var urls =
      themeDocument &&
      themeDocument.document &&
      themeDocument.document.resolved &&
      Array.isArray(themeDocument.document.resolved.stylesheetUrls)
        ? themeDocument.document.resolved.stylesheetUrls
        : [];
    return urls.map(function (url) {
      return "@import url('" + String(url).replace(/'/g, "\\'") + "');";
    }).join("\n");
  }

  function buildThemeStylesheet(themeDocument) {
    var variables =
      themeDocument &&
      themeDocument.document &&
      themeDocument.document.resolved &&
      themeDocument.document.resolved.variables &&
      typeof themeDocument.document.resolved.variables === "object"
        ? themeDocument.document.resolved.variables
        : {};
    var baseVariables = variables.base || {};
    var tabletVariables = variables.tablet || {};
    var mobileVariables = variables.mobile || {};
    return [
      buildCssVariableBlock(":root", baseVariables),
      "body{font-family:var(--page-body-font);background:var(--page-bg);color:var(--page-ink);}",
      "#page-app.page-app-root{gap:var(--page-section-gap);padding:calc(var(--page-section-gap) + 8px) var(--page-gutter) calc(var(--page-section-gap) * 3);}",
      ".page-app-widget-layout,.page-app-layout,.page-app-main,.page-app-side{gap:var(--page-section-gap);}",
      ".page-app-block,.page-app-grid,.page-app-gallery,.page-app-post-list,.page-app-comments-list,.page-app-nav{gap:var(--page-block-gap);}",
      ".page-app-card,.page-app-hero,.page-app-block--surface-card,.page-app-block--surface-strong,.page-app-block--surface-soft,.page-app-nav-card,.page-app-post-card,.page-app-comment{border-radius:var(--page-radius);}",
      ".page-app-title,.page-app-card h2,.page-app-card h3{font-family:var(--page-heading-font);}",
      ".page-app-title{font-size:var(--page-h1-size);line-height:var(--page-h1-line-height);font-weight:var(--page-h1-weight);letter-spacing:var(--page-h1-letter-spacing);}",
      ".page-app-card h2,.page-app-block--widget-post-navigation h2,.page-app-block--widget-related-posts h2{font-size:var(--page-h2-size);line-height:var(--page-h2-line-height);font-weight:var(--page-h2-weight);letter-spacing:var(--page-h2-letter-spacing);}",
      ".page-app-card h3{font-size:var(--page-h3-size);line-height:var(--page-h3-line-height);font-weight:var(--page-h3-weight);letter-spacing:var(--page-h3-letter-spacing);}",
      ".page-app-body,.page-app-subtitle,.page-app-post-card,.page-app-form input,.page-app-form textarea{font-family:var(--page-body-font);font-size:var(--page-body-size);line-height:var(--page-body-line-height);font-weight:var(--page-body-weight);}",
      ".page-app-meta,.page-app-chip,.page-app-link-chip,.page-app-note,.page-app-empty,.page-app-review,.page-app-comment-head,.page-app-form label,.page-app-button,.page-app-gallery-caption,.page-app-stat{font-family:var(--page-body-font);}",
      ".page-app-meta,.page-app-note,.page-app-empty,.page-app-gallery-caption,.page-app-stat,.page-app-comment-head,.page-app-form label{font-size:var(--page-caption-size);line-height:var(--page-caption-line-height);font-weight:var(--page-caption-weight);}",
      "@media (max-width:960px){" + buildCssVariableBlock(":root", tabletVariables) + "}",
      "@media (max-width:640px){" + buildCssVariableBlock(":root", mobileVariables) + "}"
    ].join("");
  }

  function applyResolvedTheme(documentObject, themeDocument) {
    var nodes = ensureThemeStyleNodes(documentObject);
    documentObject.head.appendChild(nodes.fontStyle);
    documentObject.head.appendChild(nodes.themeStyle);
    if (!themeDocument || typeof themeDocument !== "object") {
      nodes.fontStyle.textContent = "";
      nodes.themeStyle.textContent = "";
      return;
    }
    nodes.fontStyle.textContent = buildThemeFontStylesheet(themeDocument);
    nodes.themeStyle.textContent = buildThemeStylesheet(themeDocument);
  }

  function renderBreadcrumbs(documentObject, items, delivery) {
    if (!normalizeArray(items).length) {
      return null;
    }
    var nav = createNode(documentObject, "nav", { className: "page-app-link-row", attributes: { "aria-label": "Breadcrumb" } });
    normalizeArray(items).forEach(function (item, index) {
      var href = normalizeLinkHref(item, delivery);
      var node = href ? createNode(documentObject, "a", { className: "page-app-link-chip", attributes: { href: href } }) : createNode(documentObject, "span", { className: "page-app-chip" });
      node.textContent = toText(item.name || item.title || item.displayName, "Item");
      nav.appendChild(node);
      if (index < items.length - 1) {
        nav.appendChild(createNode(documentObject, "span", { className: "page-app-note", text: "/" }));
      }
    });
    return nav;
  }

  function renderLocaleMenu(documentObject, state) {
    var locales = listSupportedLocales(state);
    if (!locales.length) {
      return null;
    }
    var container = createNode(documentObject, "div", { className: "page-app-locale-menu" });
    var label = createNode(documentObject, "label", { text: "Locale" });
    var select = createNode(documentObject, "select", {
      attributes: {
        "aria-label": "Locale"
      }
    });
    locales.forEach(function (entry) {
      var option = createNode(documentObject, "option", {
        attributes: {
          value: entry.code
        },
        text: entry.label
      });
      if (entry.code === state.activeLocale) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.addEventListener("change", function (event) {
      handleLocaleSelection(window, state, event.target.value).catch(function (error) {
        console.error(error);
      });
    });
    label.appendChild(select);
    container.appendChild(label);
    return container;
  }

  function renderHero(documentObject, model, support, delivery, state) {
    var hero = createNode(documentObject, "header", { className: "page-app-hero" });
    var copy = createNode(documentObject, "div", { className: "page-app-hero-copy" });
    var heroTop = createNode(documentObject, "div", { className: "page-app-hero-top" });
    var breadcrumbs = null;
    if (model.kind === "post-detail") {
      breadcrumbs = renderBreadcrumbs(documentObject, model.navigation && model.navigation.breadcrumbs, delivery);
      if (breadcrumbs) { heroTop.appendChild(breadcrumbs); }
      var localeMenu = renderLocaleMenu(documentObject, state);
      if (localeMenu) { heroTop.appendChild(localeMenu); }
      if (heroTop.childNodes.length) { copy.appendChild(heroTop); }
      copy.appendChild(createNode(documentObject, "p", { className: "page-app-eyebrow", text: "Blog Post" }));
      copy.appendChild(createNode(documentObject, "h1", { className: "page-app-title", text: model.post.title }));
      if (model.post.subtitle || model.post.excerpt) {
        copy.appendChild(createNode(documentObject, "p", { className: "page-app-subtitle", text: model.post.subtitle || model.post.excerpt }));
      }
      var postMeta = createNode(documentObject, "div", { className: "page-app-meta" });
      [model.post.publishedOn ? "Published " + toDisplayDate(model.post.publishedOn, support) : "", model.post.updatedOn ? "Updated " + toDisplayDate(model.post.updatedOn, support) : "", model.post.readTimeMinutes ? model.post.readTimeMinutes + " min read" : "", model.post.wordCount ? model.post.wordCount + " words" : ""].filter(Boolean).forEach(function (entry) { postMeta.appendChild(createNode(documentObject, "span", { text: entry })); });
      copy.appendChild(postMeta);
    } else if (model.kind === "category-detail") {
      breadcrumbs = renderBreadcrumbs(documentObject, model.navigation && model.navigation.breadcrumbs, delivery);
      if (breadcrumbs) { heroTop.appendChild(breadcrumbs); }
      var categoryLocaleMenu = renderLocaleMenu(documentObject, state);
      if (categoryLocaleMenu) { heroTop.appendChild(categoryLocaleMenu); }
      if (heroTop.childNodes.length) { copy.appendChild(heroTop); }
      copy.appendChild(createNode(documentObject, "p", { className: "page-app-eyebrow", text: "Category" }));
      copy.appendChild(createNode(documentObject, "h1", { className: "page-app-title", text: model.category.name }));
      if (model.category.description) { copy.appendChild(createNode(documentObject, "p", { className: "page-app-subtitle", text: model.category.description })); }
      var categoryMeta = createNode(documentObject, "div", { className: "page-app-meta" });
      [model.category.treePath || "", Number.isFinite(Number(model.category.depth)) ? "Depth " + model.category.depth : ""].filter(Boolean).forEach(function (entry) { categoryMeta.appendChild(createNode(documentObject, "span", { text: entry })); });
      copy.appendChild(categoryMeta);
    } else {
      var genericLocaleMenu = renderLocaleMenu(documentObject, state);
      if (genericLocaleMenu) {
        heroTop.appendChild(genericLocaleMenu);
        copy.appendChild(heroTop);
      }
      copy.appendChild(createNode(documentObject, "p", { className: "page-app-eyebrow", text: "Page" }));
      copy.appendChild(createNode(documentObject, "h1", { className: "page-app-title", text: model.title || "Page" }));
      if (model.description) { copy.appendChild(createNode(documentObject, "p", { className: "page-app-subtitle", text: model.description })); }
    }
    hero.appendChild(copy);
    var media = model.kind === "post-detail" ? model.post.featuredMedia : model.kind === "category-detail" ? model.category.featuredMedia : null;
    if (media && media.preferredUrl) {
      var mediaWrap = createNode(documentObject, "figure", { className: "page-app-hero-media" });
      mediaWrap.appendChild(createNode(documentObject, "img", { attributes: { src: media.preferredUrl, alt: toText(media.altText, toText(media.displayName, "Media")) } }));
      hero.appendChild(mediaWrap);
    }
    return hero;
  }

  function renderChipSection(documentObject, items, title, delivery) {
    if (!normalizeArray(items).length) { return null; }
    var card = createNode(documentObject, "section", { className: "page-app-card" });
    card.appendChild(createNode(documentObject, "h2", { text: title }));
    var row = createNode(documentObject, "div", { className: "page-app-chip-row" });
    normalizeArray(items).forEach(function (item) {
      var href = normalizeLinkHref(item, delivery);
      var node = href ? createNode(documentObject, "a", { className: "page-app-link-chip", attributes: { href: href } }) : createNode(documentObject, "span", { className: "page-app-chip" });
      node.textContent = toText(item.name || item.title || item.displayName, title);
      row.appendChild(node);
    });
    card.appendChild(row);
    return card;
  }

  function renderAuthorCard(documentObject, author, delivery) {
    if (!author) { return createNode(documentObject, "div", { className: "page-app-empty", text: "No author is attached to this story yet." }); }
    var card = createNode(documentObject, "section", { className: "page-app-card" });
    card.appendChild(createNode(documentObject, "h2", { text: "Author" }));
    var layout = createNode(documentObject, "div", { className: "page-app-author" });
    var avatar = createNode(documentObject, "div", { className: "page-app-avatar" });
    if (author.avatarMedia && author.avatarMedia.preferredUrl) { avatar.appendChild(createNode(documentObject, "img", { attributes: { src: author.avatarMedia.preferredUrl, alt: toText(author.avatarMedia.altText, author.displayName) } })); }
    layout.appendChild(avatar);
    var copy = createNode(documentObject, "div", {});
    var href = normalizeLinkHref(author, delivery);
    var heading = href ? createNode(documentObject, "a", { className: "page-app-link-chip", attributes: { href: href } }) : createNode(documentObject, "strong", {});
    heading.textContent = author.displayName;
    copy.appendChild(heading);
    if (author.role) { copy.appendChild(createNode(documentObject, "p", { className: "page-app-stat", text: author.role })); }
    if (author.bio) { copy.appendChild(createNode(documentObject, "p", { text: author.bio })); }
    layout.appendChild(copy);
    card.appendChild(layout);
    return card;
  }

  function renderGallery(documentObject, items) {
    if (!normalizeArray(items).length) { return null; }
    var card = createNode(documentObject, "section", { className: "page-app-card" });
    card.appendChild(createNode(documentObject, "h2", { text: "Gallery" }));
    var grid = createNode(documentObject, "div", { className: "page-app-gallery" });
    normalizeArray(items).forEach(function (item) {
      if (!item || !item.preferredUrl) { return; }
      var figure = createNode(documentObject, "figure", { className: "page-app-gallery-item" });
      figure.appendChild(createNode(documentObject, "img", { attributes: { src: item.preferredUrl, alt: toText(item.altText, toText(item.displayName, "Gallery image")) } }));
      figure.appendChild(createNode(documentObject, "figcaption", { className: "page-app-gallery-caption", text: toText(item.displayName, "Gallery image") }));
      grid.appendChild(figure);
    });
    card.appendChild(grid);
    return card;
  }

  function renderNavigationCard(documentObject, label, item, delivery) {
    var href = normalizeLinkHref(item, delivery);
    if (!item || !href) { return null; }
    var anchor = createNode(documentObject, "a", { attributes: { href: href } });
    var card = createNode(documentObject, "div", { className: "page-app-nav-card" });
    card.appendChild(createNode(documentObject, "strong", { text: label }));
    card.appendChild(createNode(documentObject, "div", { text: toText(item.title || item.name || item.displayName, "Open") }));
    if (item.excerpt || item.description) { card.appendChild(createNode(documentObject, "p", { className: "page-app-note", text: toText(item.excerpt || item.description, "") })); }
    anchor.appendChild(card);
    return anchor;
  }

  function renderPostCard(documentObject, item, delivery) {
    var href = normalizeLinkHref(item, delivery);
    var wrapper = href ? createNode(documentObject, "a", { attributes: { href: href } }) : createNode(documentObject, "div", {});
    var card = createNode(documentObject, "article", { className: "page-app-post-card" });
    card.appendChild(createNode(documentObject, "h3", { text: toText(item.title, "Untitled post") }));
    if (item.excerpt) { card.appendChild(createNode(documentObject, "p", { text: item.excerpt })); }
    var meta = createNode(documentObject, "div", { className: "page-app-meta" });
    [item.publishedOn || "", item.readTimeMinutes ? item.readTimeMinutes + " min read" : ""].filter(Boolean).forEach(function (entry) { meta.appendChild(createNode(documentObject, "span", { text: entry })); });
    card.appendChild(meta);
    wrapper.appendChild(card);
    return wrapper;
  }

  function readCurrentPagePath(targetGlobal, state) {
    var routePath = targetGlobal && targetGlobal.location ? targetGlobal.location.pathname : "";
    if (routePath) {
      return routePath;
    }
    return state && state.payload && state.payload.page ? toText(state.payload.page.path, "/") : "/";
  }

  function derivePrimaryRecordId(model) {
    if (!model || typeof model !== "object") {
      return null;
    }
    if (model.kind === "post-detail") {
      return model.post && model.post.id ? model.post.id : null;
    }
    if (model.kind === "category-detail") {
      return model.category && model.category.id ? model.category.id : null;
    }
    return null;
  }

  function derivePrimaryRecordSlug(model) {
    if (!model || typeof model !== "object") {
      return null;
    }
    if (model.kind === "post-detail") {
      return model.post && model.post.slug ? model.post.slug : null;
    }
    if (model.kind === "category-detail") {
      return model.category && model.category.slug ? model.category.slug : null;
    }
    return null;
  }

  function unwrapReaderDocument(value) {
    if (!value) {
      return null;
    }
    if (Array.isArray(value)) {
      return value[0] || null;
    }
    if (value && typeof value === "object" && Array.isArray(value.items)) {
      return value.items[0] || null;
    }
    return value;
  }

  function deriveCurrentPublicUrl(targetGlobal, pagePath, readerDocument) {
    var explicitUrl = toText(
      (readerDocument && readerDocument.delivery ? readerDocument.delivery.publicUrl : "") ||
      (readerDocument && readerDocument.review ? readerDocument.review.publicUrl : ""),
      ""
    );
    if (explicitUrl) {
      return explicitUrl;
    }
    try {
      return new URL(pagePath, targetGlobal.location.origin).toString();
    } catch (_error) {
      return "";
    }
  }

  function deriveDocumentSnapshotUrl(targetGlobal, pagePath) {
    var normalizedPath = toText(pagePath, "/");
    try {
      var baseOrigin = targetGlobal.location && targetGlobal.location.origin ? targetGlobal.location.origin : "";
      if (!baseOrigin) {
        return "";
      }
      if (normalizedPath === "/") {
        return new URL("runtime-probe.document.json", baseOrigin + "/").toString();
      }
      return new URL(normalizedPath.replace(/^\/+/, "").replace(/\/+$/g, "") + "/runtime-probe.document.json", baseOrigin + "/").toString();
    } catch (_error) {
      return "";
    }
  }

  function mergeReaderDeferredIntoState(state, deferredDocument, options) {
    if (!deferredDocument || typeof deferredDocument !== "object" || !deferredDocument.deferred) {
      return;
    }
    var shouldStoreBase = !options || options.storeAsBase !== false;
    if (state.model && state.model.kind === "post-detail") {
      state.model = {
        ...state.model,
        navigation: {
          ...(state.model.navigation && typeof state.model.navigation === "object" ? state.model.navigation : {}),
          ...((deferredDocument.deferred.navigation && typeof deferredDocument.deferred.navigation === "object")
            ? deferredDocument.deferred.navigation
            : {})
        },
        related: {
          ...(state.model.related && typeof state.model.related === "object" ? state.model.related : {}),
          ...((deferredDocument.deferred.related && typeof deferredDocument.deferred.related === "object")
            ? deferredDocument.deferred.related
            : {})
        }
      };
    } else if (state.model && state.model.kind === "category-detail") {
      state.model = {
        ...state.model,
        children: normalizeArray(deferredDocument.deferred.children)
      };
    }
    state.payload = {
      ...(state.payload && typeof state.payload === "object" ? state.payload : {}),
      application: {
        ...((state.payload && state.payload.application && typeof state.payload.application === "object")
          ? state.payload.application
          : {}),
        deferred: deferredDocument.deferred,
        deferredResolvedAt: deferredDocument.resolvedAt || null
      }
    };
    if (shouldStoreBase) {
      state.baseDeferredDocument = cloneJsonValue(deferredDocument);
    }
  }

  function mergeReaderBootstrapIntoState(targetGlobal, state, bootstrapDocument, pagePath, options) {
    if (!bootstrapDocument || typeof bootstrapDocument !== "object" || !bootstrapDocument.model) {
      return;
    }
    var shouldStoreBase = !options || options.storeAsBase !== false;
    var primaryRecordId = derivePrimaryRecordId(bootstrapDocument.model);
    var primaryRecordSlug = derivePrimaryRecordSlug(bootstrapDocument.model);
    var publicUrl = deriveCurrentPublicUrl(targetGlobal, pagePath, bootstrapDocument);
    var documentUrl = deriveDocumentSnapshotUrl(targetGlobal, pagePath);
    var pageId = toText(bootstrapDocument.pageId, "");
    var primarySourceType = toText(bootstrapDocument.primarySourceType, "");
    var commentsEnabled = Boolean(
      bootstrapDocument &&
      bootstrapDocument.model &&
      bootstrapDocument.model.kind === "post-detail" &&
      bootstrapDocument.model.comments &&
      bootstrapDocument.model.comments.enabled
    );
    var deliveryMerge = {
      ...((state.payload && state.payload.delivery && typeof state.payload.delivery === "object") ? state.payload.delivery : {})
    };
    Object.entries(
      bootstrapDocument.delivery && typeof bootstrapDocument.delivery === "object"
        ? bootstrapDocument.delivery
        : {}
    ).forEach(function (entry) {
      var key = entry[0];
      var value = entry[1];
      if (value !== null && value !== undefined && value !== "") {
        deliveryMerge[key] = value;
      }
    });
    state.model = bootstrapDocument.model;
    state.payload = {
      ...(state.payload && typeof state.payload === "object" ? state.payload : {}),
      page: {
        ...((state.payload && state.payload.page && typeof state.payload.page === "object") ? state.payload.page : {}),
        id: pageId || (state.payload && state.payload.page ? state.payload.page.id : null),
        path: pagePath
      },
      head: {
        ...((state.payload && state.payload.head && typeof state.payload.head === "object") ? state.payload.head : {}),
        ...((bootstrapDocument.head && typeof bootstrapDocument.head === "object") ? bootstrapDocument.head : {})
      },
      delivery: deliveryMerge,
      application: bootstrapDocument,
      resolvedAt: bootstrapDocument.resolvedAt || null
    };
    applyResolvedTheme(targetGlobal.document, readResolvedThemeDocument(state));
    state.contract = {
      ...((state.contract && typeof state.contract === "object") ? state.contract : {}),
      pagePath: pagePath,
      primaryRecordId: primaryRecordId,
      documentUrl: documentUrl || state.contract.documentUrl || "",
      primaryRecord: {
        ...((state.contract && state.contract.primaryRecord && typeof state.contract.primaryRecord === "object")
          ? state.contract.primaryRecord
          : {}),
        id: primaryRecordId,
        slug: primaryRecordSlug
      },
      firestore: state.contract && state.contract.firestore && typeof state.contract.firestore === "object"
        ? {
            ...state.contract.firestore,
            documentId: primaryRecordSlug || state.contract.firestore.documentId || null
          }
        : state.contract.firestore,
      runtimeAugment: {
        ...((state.contract && state.contract.runtimeAugment && typeof state.contract.runtimeAugment === "object")
          ? state.contract.runtimeAugment
          : {}),
        context: {
          ...((state.contract &&
            state.contract.runtimeAugment &&
            state.contract.runtimeAugment.context &&
            typeof state.contract.runtimeAugment.context === "object")
            ? state.contract.runtimeAugment.context
            : {}),
          pagePath: pagePath,
          primaryRecordId: primaryRecordId,
          pageId: pageId || null,
          primarySourceType: primarySourceType || null,
          themeKey:
            bootstrapDocument && bootstrapDocument.theme && bootstrapDocument.theme.themeKey
              ? bootstrapDocument.theme.themeKey
              : null,
          commentsEnabled: commentsEnabled,
          publicUrl: publicUrl || null,
          routeManifest:
            bootstrapDocument && bootstrapDocument.routeManifest && typeof bootstrapDocument.routeManifest === "object"
              ? bootstrapDocument.routeManifest
              : ((state.contract &&
                  state.contract.runtimeAugment &&
                  state.contract.runtimeAugment.context &&
                  typeof state.contract.runtimeAugment.context === "object" &&
                  state.contract.runtimeAugment.context.routeManifest &&
                  typeof state.contract.runtimeAugment.context.routeManifest === "object")
                  ? state.contract.runtimeAugment.context.routeManifest
                  : null)
        }
      }
    };
    targetGlobal.__CRUD_PAGE_APPLICATION_TESTER__ = {
      ...((targetGlobal.__CRUD_PAGE_APPLICATION_TESTER__ && typeof targetGlobal.__CRUD_PAGE_APPLICATION_TESTER__ === "object")
        ? targetGlobal.__CRUD_PAGE_APPLICATION_TESTER__
        : {}),
      ...state.contract
    };
    if (targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__ && typeof targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__ === "object") {
      targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__ = {
        ...targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__,
        context: {
          ...((targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__.context && typeof targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__.context === "object")
            ? targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__.context
            : {}),
          pagePath: pagePath,
          primaryRecordId: state.contract.primaryRecordId,
          pageId: pageId || null,
          primarySourceType: primarySourceType || null,
          themeKey:
            bootstrapDocument && bootstrapDocument.theme && bootstrapDocument.theme.themeKey
              ? bootstrapDocument.theme.themeKey
              : null,
          commentsEnabled: commentsEnabled,
          publicUrl: publicUrl || null,
          routeManifest:
            bootstrapDocument && bootstrapDocument.routeManifest && typeof bootstrapDocument.routeManifest === "object"
              ? bootstrapDocument.routeManifest
              : null
        }
      };
    }
    if (shouldStoreBase) {
      state.baseBootstrapDocument = cloneJsonValue(bootstrapDocument);
      state.sourceLocale = deriveSourceLocaleFromDocument(bootstrapDocument, state);
      state.activeLocale = readRequestedLocale(targetGlobal, state.sourceLocale);
      state.translationOverlayDocument = null;
    }
    targetGlobal.__CRUD_PAGE_APPLICATION_SOURCE_LOCALE__ = state.sourceLocale;
    targetGlobal.__CRUD_PAGE_APPLICATION_ACTIVE_LOCALE__ = state.activeLocale;
    state.commentsApproved = [];
    state.commentsPending = [];
    state.deferredLoaded = false;
    targetGlobal.document.title = toText(
      bootstrapDocument.head && bootstrapDocument.head.title,
      toText(
        state.model && state.model.post
          ? state.model.post.title
          : state.model && state.model.category
            ? state.model.category.name
            : "Page"
      )
    );
  }

  async function queryReaderDocument(targetGlobal, resource, query, params) {
    if (!targetGlobal.dataLayer || typeof targetGlobal.dataLayer.query !== "function") {
      throw new Error("reader runtime is unavailable on this page");
    }
    var result = await targetGlobal.dataLayer.query({
      resource: resource,
      query: query,
      params: params || {}
    });
    if (!result || result.ok !== true) {
      throw new Error(
        result && result.error && result.error.message
          ? result.error.message
          : "Reader data could not be loaded."
      );
    }
    return unwrapReaderDocument(result.data);
  }

  async function queryReaderTranslationOverlay(targetGlobal, state, pagePath, localeCode) {
    var normalizedLocale = normalizeLocaleCode(localeCode, state.sourceLocale);
    if (normalizedLocale === state.sourceLocale) {
      return null;
    }
    return queryReaderDocument(
      targetGlobal,
      "readerTranslations",
      "byPathAndLocale",
      {
        path: pagePath,
        locale: normalizedLocale,
        cacheKey: buildTranslationCacheKey(pagePath, normalizedLocale),
        filters: {
          cacheKey: buildTranslationCacheKey(pagePath, normalizedLocale)
        },
        pageSize: 1
      }
    );
  }

  function applyLocalizedDocumentsToState(targetGlobal, state, pagePath, bootstrapDocument, deferredDocument) {
    mergeReaderBootstrapIntoState(targetGlobal, state, bootstrapDocument, pagePath, {
      storeAsBase: false
    });
    if (deferredDocument) {
      mergeReaderDeferredIntoState(state, deferredDocument, {
        storeAsBase: false
      });
      state.deferredLoaded = true;
    } else {
      state.deferredLoaded = false;
    }
    renderApplication(targetGlobal, state);
  }

  async function applyActiveLocaleToState(targetGlobal, state, pagePathOverride) {
    var pagePath = normalizePagePathValue(pagePathOverride || readCurrentPagePath(targetGlobal, state));
    if (!state.baseBootstrapDocument) {
      return;
    }

    if (state.activeLocale === state.sourceLocale) {
      state.translationOverlayDocument = null;
      applyLocalizedDocumentsToState(
        targetGlobal,
        state,
        pagePath,
        cloneJsonValue(state.baseBootstrapDocument),
        state.baseDeferredDocument ? cloneJsonValue(state.baseDeferredDocument) : null
      );
      updateLocaleUrl(targetGlobal, state, "replace");
      return;
    }

    var overlayDocument = null;
    try {
      overlayDocument = await queryReaderTranslationOverlay(targetGlobal, state, pagePath, state.activeLocale);
    } catch (error) {
      console.warn(error);
      overlayDocument = null;
    }
    state.translationOverlayDocument = overlayDocument || null;

    var localizedBootstrap = overlayDocument
      ? applyOverlayPatches(
          cloneJsonValue(state.baseBootstrapDocument),
          overlayDocument.bootstrapPatches
        )
      : cloneJsonValue(state.baseBootstrapDocument);
    var localizedDeferred =
      state.baseDeferredDocument
        ? overlayDocument
          ? applyOverlayPatches(
              cloneJsonValue(state.baseDeferredDocument),
              overlayDocument.deferredPatches
            )
          : cloneJsonValue(state.baseDeferredDocument)
        : null;

    applyLocalizedDocumentsToState(targetGlobal, state, pagePath, localizedBootstrap, localizedDeferred);
    updateLocaleUrl(targetGlobal, state, "replace");
  }

  async function handleLocaleSelection(targetGlobal, state, localeCode) {
    state.activeLocale = normalizeLocaleCode(localeCode, state.sourceLocale);
    await applyActiveLocaleToState(targetGlobal, state);
    if (state.model.kind === "post-detail" && state.model.comments && state.model.comments.enabled) {
      await refreshComments(targetGlobal, state);
    }
  }

  async function queryReaderRouteManifest(targetGlobal) {
    var manifest = await queryReaderDocument(
      targetGlobal,
      "readerRouteManifest",
      "current",
      {
        pageSize: 1
      }
    );
    if (!manifest || typeof manifest !== "object") {
      throw new Error("Reader route manifest was not available.");
    }
    return manifest;
  }

  async function resolveRouteContractByPath(targetGlobal, pagePath) {
    var payload = readPayload(targetGlobal.document);
    var routeManifest = readRouteManifest(payload, targetGlobal);
    var matchResult = resolveRouteEntryByPath(routeManifest, pagePath);
    if (matchResult && matchResult.entry && matchResult.entry.layout) {
      return {
        payload: payload,
        routeManifest: routeManifest,
        matchResult: matchResult
      };
    }

    var fetchedRouteManifest = await queryReaderRouteManifest(targetGlobal);
    var fetchedMatchResult = resolveRouteEntryByPath(fetchedRouteManifest, pagePath);
    if (!fetchedMatchResult || !fetchedMatchResult.entry) {
      if (matchResult && matchResult.entry) {
        return {
          payload: payload,
          routeManifest: routeManifest,
          matchResult: matchResult
        };
      }
      throw new Error("No route contract matched the requested path.");
    }
    return {
      payload: payload,
      routeManifest: fetchedRouteManifest,
      matchResult: fetchedMatchResult
    };
  }

  function buildReaderByPathParams(pagePath) {
    return {
      path: pagePath,
      filters: {
        path: pagePath
      },
      pageSize: 1
    };
  }

  async function loadCurrentReaderPage(targetGlobal, state, pagePath) {
    var document = await queryReaderDocument(
      targetGlobal,
      "readerPage",
      "current",
      buildReaderByPathParams(pagePath)
    );
    if (!document) {
      throw new Error("Current page bootstrap was not available.");
    }
    mergeReaderBootstrapIntoState(targetGlobal, state, document, pagePath);
  }

  async function loadReaderPageByPath(targetGlobal, state, pagePath) {
    var document = await queryReaderDocument(
      targetGlobal,
      "readerPage",
      "byPath",
      buildReaderByPathParams(pagePath)
    );
    if (!document) {
      throw new Error("Requested page bootstrap was not available.");
    }
    mergeReaderBootstrapIntoState(targetGlobal, state, document, pagePath);
  }

  async function hydrateDeferredReaderData(targetGlobal, state, pagePath) {
    var deferredDocument = await queryReaderDocument(
      targetGlobal,
      "readerDeferred",
      "byPath",
      buildReaderByPathParams(pagePath)
    );
    if (!deferredDocument) {
      state.deferredLoaded = true;
      return;
    }
    mergeReaderDeferredIntoState(state, deferredDocument);
    state.deferredLoaded = true;
    renderApplication(targetGlobal, state);
  }

  function shouldHandleInternalNavigation(targetGlobal, anchor, event) {
    if (!anchor || !anchor.href || event.defaultPrevented) {
      return false;
    }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }
    var target = toText(anchor.getAttribute("target"), "");
    if (target && target !== "_self") {
      return false;
    }
    try {
      var currentUrl = new URL(targetGlobal.location.href);
      var nextUrl = new URL(anchor.href, currentUrl);
      if (nextUrl.origin !== currentUrl.origin) {
        return false;
      }
      if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search && nextUrl.hash === currentUrl.hash) {
        return false;
      }
      return /^\/(post|journal|category)\//.test(nextUrl.pathname);
    } catch (_error) {
      return false;
    }
  }

  async function navigateToPage(targetGlobal, state, nextPath, mode) {
    if (!nextPath) {
      return;
    }
    var historyMode = toText(mode, "push");
    if (state.routeLoadPending) {
      return;
    }
    state.routeLoadPending = true;
    try {
      await loadReaderPageByPath(targetGlobal, state, nextPath);
      await hydrateDeferredReaderData(targetGlobal, state, nextPath);
      await applyActiveLocaleToState(targetGlobal, state, nextPath);
      if (historyMode === "push") {
        targetGlobal.history.pushState(
          { pagePath: nextPath, locale: state.activeLocale },
          "",
          buildLocalizedPageUrl(targetGlobal, nextPath, state.activeLocale, state.sourceLocale)
        );
      } else if (historyMode === "replace") {
        targetGlobal.history.replaceState(
          { pagePath: nextPath, locale: state.activeLocale },
          "",
          buildLocalizedPageUrl(targetGlobal, nextPath, state.activeLocale, state.sourceLocale)
        );
      }
      if (state.model.kind === "post-detail" && state.model.comments && state.model.comments.enabled) {
        await refreshComments(targetGlobal, state);
      }
    } finally {
      state.routeLoadPending = false;
    }
  }

  function bindClientNavigation(targetGlobal, state) {
    if (state.navigationBound) {
      return;
    }
    state.navigationBound = true;
    state.navigationHandler = function (event) {
      var rawTarget = event.target && event.target.nodeType === 1
        ? event.target
        : event.target && event.target.parentElement
          ? event.target.parentElement
          : null;
      var anchor = rawTarget && typeof rawTarget.closest === "function" ? rawTarget.closest("a[href]") : null;
      if (!anchor || !state.mount || (anchor !== state.mount && !state.mount.contains(anchor))) {
        return;
      }
      if (!shouldHandleInternalNavigation(targetGlobal, anchor, event)) {
        return;
      }
      var nextUrl = new URL(anchor.href, targetGlobal.location.href);
      event.preventDefault();
      if (typeof event.stopPropagation === "function") {
        event.stopPropagation();
      }
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      anchor.setAttribute("aria-busy", "true");
      navigateToPage(targetGlobal, state, nextUrl.pathname, "push")
        .catch(function (error) {
          console.error(error);
        })
        .finally(function () {
          anchor.removeAttribute("aria-busy");
        });
    };
    targetGlobal.document.addEventListener("click", state.navigationHandler, true);
    targetGlobal.addEventListener("popstate", function () {
      state.activeLocale = readRequestedLocale(targetGlobal, state.sourceLocale);
      navigateToPage(targetGlobal, state, readCurrentPagePath(targetGlobal, state), "replace").catch(function (error) {
        console.error(error);
      });
    });
  }

  function createCommentsSection(documentObject) {
    var card = createNode(documentObject, "section", { className: "page-app-card" });
    card.appendChild(createNode(documentObject, "h2", { text: "Comments" }));
    var note = createNode(documentObject, "p", { className: "page-app-note", text: "Loading comments..." });
    var list = createNode(documentObject, "div", { className: "page-app-comments-list" });
    var form = createNode(documentObject, "form", { className: "page-app-form" });
    var row = createNode(documentObject, "div", { className: "page-app-form-row" });
    var authorLabel = createNode(documentObject, "label", { text: "Name" });
    var authorInput = createNode(documentObject, "input", { attributes: { type: "text", name: "authorDisplayName", placeholder: "Your name" } });
    authorLabel.appendChild(authorInput);
    var emailLabel = createNode(documentObject, "label", { text: "Email" });
    var emailInput = createNode(documentObject, "input", { attributes: { type: "email", name: "authorEmail", placeholder: "name@example.com" } });
    emailLabel.appendChild(emailInput);
    row.appendChild(authorLabel); row.appendChild(emailLabel);
    var bodyLabel = createNode(documentObject, "label", { text: "Comment" });
    var bodyInput = createNode(documentObject, "textarea", { attributes: { name: "body", placeholder: "Share a thoughtful response." } });
    bodyLabel.appendChild(bodyInput);
    var actions = createNode(documentObject, "div", { className: "page-app-actions" });
    var submitButton = createNode(documentObject, "button", { className: "page-app-button", text: "Send Comment", attributes: { type: "submit" } });
    actions.appendChild(submitButton);
    form.appendChild(row); form.appendChild(bodyLabel); form.appendChild(actions);
    card.appendChild(note); card.appendChild(list); card.appendChild(form);
    return { card: card, note: note, list: list, form: form, authorInput: authorInput, emailInput: emailInput, bodyInput: bodyInput, submitButton: submitButton };
  }

  function renderCommentList(documentObject, state) {
    if (!state.commentsSection) { return; }
    var items = normalizeArray(state.commentsApproved).concat(normalizeArray(state.commentsPending));
    state.commentsSection.list.replaceChildren();
    if (!items.length) {
      state.commentsSection.note.textContent = "No public comments yet. Be the first reader to respond.";
      state.commentsSection.list.appendChild(createNode(documentObject, "div", { className: "page-app-empty", text: "No comments are visible yet." }));
      return;
    }
    state.commentsSection.note.textContent = items.length + (items.length === 1 ? " comment" : " comments");
    items.forEach(function (item) {
      var comment = createNode(documentObject, "article", { className: "page-app-comment" + (item.status === "pending" ? " pending" : "") });
      var head = createNode(documentObject, "div", { className: "page-app-comment-head" });
      head.appendChild(createNode(documentObject, "strong", { text: toText(item.authorDisplayName, "Reader") }));
      head.appendChild(createNode(documentObject, "span", { text: item.status === "pending" ? "Awaiting moderation" : toDisplayDate(item.createdOn || item.createdAt, state.support) }));
      comment.appendChild(head);
      comment.appendChild(createNode(documentObject, "p", { text: toText(item.body, "") }));
      state.commentsSection.list.appendChild(comment);
    });
  }

  async function refreshComments(targetGlobal, state) {
    if (!state.model || state.model.kind !== "post-detail" || !state.model.comments || !state.model.comments.enabled) { return; }
    if (!targetGlobal.dataLayer || typeof targetGlobal.dataLayer.query !== "function") { state.commentsSection.note.textContent = "Comments runtime is unavailable on this page."; return; }
    var postId = toText(state.model.comments.postId, toText(state.contract && state.contract.primaryRecordId, ""));
    if (!postId) {
      state.commentsSection.note.textContent = "This story does not expose a comment target.";
      return;
    }
    state.commentsSection.note.textContent = "Refreshing comments...";
    var result = await targetGlobal.dataLayer.query({
      resource: "comments",
      query: "byPost",
      params: {
        postId: postId,
        status: "approved",
        filters: {
          postId: postId
        },
        pageSize: 50
      }
    });
    if (!result || result.ok !== true) {
      state.commentsSection.note.textContent = result && result.error && result.error.message ? result.error.message : "Comments could not be loaded.";
      renderCommentList(targetGlobal.document, state);
      return;
    }
    var normalized = state.support.normalizeCommentCollectionResult(result.data);
    state.commentsApproved = normalizeArray(normalized.items);
    renderCommentList(targetGlobal.document, state);
  }

  async function handleCommentSubmit(targetGlobal, state, event) {
    event.preventDefault();
    var postId = toText(state.model && state.model.comments ? state.model.comments.postId : "", toText(state.contract && state.contract.primaryRecordId, ""));
    var payload = {
      postId: postId,
      pagePath: readCurrentPagePath(targetGlobal, state),
      parentCommentId: null,
      authorDisplayName: state.commentsSection.authorInput.value.trim(),
      authorEmail: state.commentsSection.emailInput.value.trim(),
      body: state.commentsSection.bodyInput.value.trim()
    };
    if (!payload.authorDisplayName || !payload.body) { state.commentsSection.note.textContent = "Name and comment body are required."; return; }
    state.commentsSection.submitButton.disabled = true;
    try {
      var result = await targetGlobal.actionLayer.dispatch({ action: "comments.submit", payload: payload });
      if (!result || result.ok !== true) { throw new Error(result && result.error && result.error.message ? result.error.message : "Comment submission failed."); }
      state.commentsPending = [{ id: result.data && result.data.id ? result.data.id : "pending-" + Date.now(), authorDisplayName: payload.authorDisplayName, body: payload.body, createdAt: new Date().toISOString(), status: "pending" }].concat(normalizeArray(state.commentsPending));
      state.commentsSection.form.reset();
      state.commentsSection.note.textContent = "Comment sent. It is awaiting moderation.";
      renderCommentList(targetGlobal.document, state);
      await refreshComments(targetGlobal, state);
    } catch (error) {
      state.commentsSection.note.textContent = error && error.message ? error.message : String(error);
    } finally {
      state.commentsSection.submitButton.disabled = false;
    }
  }

  function readWidgetRenderContract(state) {
    var layout = state && state.payload && state.payload.application ? state.payload.application.layout : null;
    var contract = layout && layout.widgetRenderContract ? layout.widgetRenderContract : null;
    return contract && contract.enabled ? contract : null;
  }

  function normalizeBindingPath(pathValue) {
    var rawPath = toText(pathValue, "");
    if (!rawPath) {
      return "";
    }
    return rawPath.replace(/^context\./, "");
  }

  function resolveValueBySegments(currentValue, segments) {
    if (!segments.length) {
      return currentValue;
    }
    if (currentValue === null || currentValue === undefined) {
      return null;
    }
    var segment = segments[0];
    var restSegments = segments.slice(1);
    var isCollectionSegment = /\\[\\]$/.test(segment);
    var fieldKey = isCollectionSegment ? segment.slice(0, -2) : segment;
    var nextValue = fieldKey ? currentValue[fieldKey] : currentValue;
    if (isCollectionSegment) {
      var collection = Array.isArray(nextValue) ? nextValue : [];
      if (!restSegments.length) {
        return collection;
      }
      return collection.map(function (entry) {
        return resolveValueBySegments(entry, restSegments);
      });
    }
    return resolveValueBySegments(nextValue, restSegments);
  }

  function resolveContextBindingValue(pathValue, context) {
    var normalizedPath = normalizeBindingPath(pathValue);
    if (!normalizedPath) {
      return null;
    }
    var segments = normalizedPath.split(".").map(function (entry) { return entry.trim(); }).filter(Boolean);
    return resolveValueBySegments(context, segments);
  }

  function buildWidgetContext(state) {
    var context = {
      page: {
        id: state && state.payload && state.payload.page ? state.payload.page.id || null : null,
        title: state && state.payload && state.payload.page ? state.payload.page.title || null : null,
        path: state && state.payload && state.payload.page ? state.payload.page.path || null : null,
        primarySourceType: state && state.payload && state.payload.page ? state.payload.page.primarySourceType || null : null
      }
    };
    if (state.model && state.model.kind === "post-detail") {
      context.post = state.model.post || null;
      context.author = state.model.post && state.model.post.author ? state.model.post.author : null;
      context.categories = state.model.post && state.model.post.categories ? state.model.post.categories : [];
      context.tags = state.model.post && state.model.post.tags ? state.model.post.tags : [];
      context.navigation = state.model.navigation || null;
      context.related = state.model.related || null;
      context.commentsMeta = state.model.comments || null;
      return context;
    }
    if (state.model && state.model.kind === "category-detail") {
      context.category = state.model.category || null;
      context.navigation = state.model.navigation || null;
      context.children = state.model.children || [];
      context.posts = state.model.posts || [];
      return context;
    }
    return context;
  }

  function resolveBindingValue(binding, context, contract, state) {
    if (!binding || typeof binding !== "object") {
      return binding === undefined ? null : binding;
    }
    var fallback = Object.prototype.hasOwnProperty.call(binding, "fallback") ? binding.fallback : null;
    if (binding.mode !== "dynamic") {
      return Object.prototype.hasOwnProperty.call(binding, "value") ? binding.value : fallback;
    }
    if (binding.source === "context" || binding.source === "item") {
      var contextValue = resolveContextBindingValue(binding.path, context);
      return contextValue === null || contextValue === undefined || contextValue === "" ? fallback : contextValue;
    }
    if (binding.source === "library") {
      var mediaById = contract && contract.libraries && contract.libraries.mediaById ? contract.libraries.mediaById : {};
      var libraryValue = binding.itemId && mediaById[binding.itemId]
        ? mediaById[binding.itemId]
        : (binding.snapshot || null);
      if (
        libraryValue &&
        !libraryValue.preferredUrl &&
        libraryValue.relativePath &&
        state &&
        state.payload &&
        state.payload.delivery &&
        state.payload.delivery.publicMediaBaseUrl
      ) {
        libraryValue = {
          ...libraryValue,
          preferredUrl:
            toText(state.payload.delivery.publicMediaBaseUrl, "").replace(/\/+$/g, "") +
            "/" +
            String(libraryValue.relativePath).replace(/^\/+/, "")
        };
      }
      return libraryValue || fallback;
    }
    return fallback;
  }

  function renderWidgetTitle(documentObject, widget, context) {
    var text = toText(resolveBindingValue(widget.content && widget.content.text, context, null, null), "Untitled");
    var tag = toText(resolveBindingValue(widget.props && widget.props.tag, context, null, null), "h1");
    if (!/^(h1|h2|h3)$/i.test(tag)) {
      tag = "h1";
    }
    return createNode(documentObject, tag.toLowerCase(), {
      className: tag.toLowerCase() === "h1" ? "page-app-title" : "",
      text: text
    });
  }

  function renderWidgetRichText(documentObject, widget, context, contract) {
    var body = resolveBindingValue(widget.content && widget.content.body, context, contract, null);
    return createNode(documentObject, "div", {
      className: "page-app-body",
      html: toText(body, "<p>No rich text content is available for this block.</p>")
    });
  }

  function renderWidgetImage(documentObject, widget, context, contract, state) {
    var media = resolveBindingValue(widget.content && widget.content.media, context, contract, state);
    if (!media || !media.preferredUrl) {
      return createNode(documentObject, "div", { className: "page-app-empty", text: "No media is available for this block." });
    }
    var aspect = toText(resolveBindingValue(widget.props && widget.props.aspect, context, contract, state), "auto");
    var figure = createNode(documentObject, "figure", {
      style:
        "margin:0;overflow:hidden;border-radius:18px;border:1px solid var(--page-line);background:#efe5d7;"
    });
    var image = createNode(documentObject, "img", {
      attributes: {
        src: media.preferredUrl,
        alt: toText(media.altText, toText(media.displayName, "Media"))
      },
      style:
        aspect === "auto"
          ? "display:block;width:100%;height:auto;"
          : "display:block;width:100%;aspect-ratio:" + aspect + ";object-fit:cover;"
    });
    figure.appendChild(image);
    var captionText = toText(media.description, "");
    if (!captionText) {
      var altText = toText(media.altText, "");
      var displayName = toText(media.displayName, "");
      captionText = altText && altText !== displayName ? altText : "";
    }
    if (captionText) {
      figure.appendChild(createNode(documentObject, "figcaption", {
        className: "page-app-gallery-caption",
        text: captionText
      }));
    }
    return figure;
  }

  function renderWidgetCategoryChips(documentObject, widget, context, contract, delivery, state) {
    var items = normalizeArray(resolveBindingValue(widget.content && widget.content.items, context, contract, state));
    if (!items.length) {
      return createNode(documentObject, "div", { className: "page-app-empty", text: "No categories are attached to this page yet." });
    }
    var row = createNode(documentObject, "div", { className: "page-app-chip-row" });
    items.forEach(function (item) {
      var href = normalizeLinkHref(item, delivery);
      var node = href
        ? createNode(documentObject, "a", { className: "page-app-link-chip", attributes: { href: href } })
        : createNode(documentObject, "span", { className: "page-app-chip" });
      node.textContent = toText(item && (item.name || item.title || item.displayName), "Category");
      row.appendChild(node);
    });
    return row;
  }

  function renderWidgetAuthorCard(documentObject, widget, context, contract, delivery, state) {
    var author = resolveBindingValue(widget.content && widget.content.author, context, contract, state);
    if (!author) {
      return createNode(documentObject, "div", { className: "page-app-empty", text: "No author is attached to this post yet." });
    }
    var layout = createNode(documentObject, "div", { className: "page-app-author" });
    var avatar = createNode(documentObject, "div", { className: "page-app-avatar" });
    if (author.avatarMedia && author.avatarMedia.preferredUrl) {
      avatar.appendChild(createNode(documentObject, "img", {
        attributes: {
          src: author.avatarMedia.preferredUrl,
          alt: toText(author.avatarMedia.altText, toText(author.displayName, "Author"))
        }
      }));
    }
    layout.appendChild(avatar);
    var copy = createNode(documentObject, "div", {});
    var href = normalizeLinkHref(author, delivery);
    var heading = href
      ? createNode(documentObject, "a", { className: "page-app-link-chip", attributes: { href: href } })
      : createNode(documentObject, "strong", {});
    heading.textContent = toText(author.displayName, "Author");
    copy.appendChild(heading);
    if (author.role) {
      copy.appendChild(createNode(documentObject, "p", { className: "page-app-stat", text: author.role }));
    }
    if (author.bio) {
      copy.appendChild(createNode(documentObject, "p", { text: author.bio }));
    }
    layout.appendChild(copy);
    return layout;
  }

  function renderWidgetBreadcrumbs(documentObject, context, delivery) {
    var items = normalizeArray(context && context.navigation ? context.navigation.breadcrumbs : []);
    if (!items.length) {
      return createNode(documentObject, "div", { className: "page-app-empty", text: "No breadcrumb route is available for this page yet." });
    }
    return renderBreadcrumbs(documentObject, items, delivery);
  }

  function renderWidgetTabs(documentObject, widget, context, contract, state) {
    var tabs = normalizeArray(widget && widget.content ? widget.content.tabs : []);
    if (!tabs.length) {
      return createNode(documentObject, "div", { className: "page-app-empty", text: "No tabs are configured for this block yet." });
    }
    var container = createNode(documentObject, "div", { style: "display:grid;gap:12px;" });
    var headerRow = createNode(documentObject, "div", { className: "page-app-chip-row" });
    var body = createNode(documentObject, "div", { className: "page-app-body" });

    function applyActiveTab(index) {
      body.replaceChildren();
      normalizeArray(headerRow.children).forEach(function (buttonNode, buttonIndex) {
        if (!buttonNode || !buttonNode.style) {
          return;
        }
        buttonNode.style.background = buttonIndex === index ? "var(--page-accent-soft)" : "rgba(255,255,255,.72)";
        buttonNode.style.color = buttonIndex === index ? "var(--page-accent)" : "var(--page-ink)";
      });
      var activeTab = tabs[index] || null;
      var value = activeTab ? resolveBindingValue(activeTab.body, context, contract, state) : "";
      body.appendChild(createNode(documentObject, "div", {
        html: toText(value, "<p>No tab content is available.</p>")
      }));
    }

    tabs.forEach(function (tab, index) {
      var headerButton = createNode(documentObject, "button", {
        className: index === 0 ? "page-app-link-chip" : "page-app-chip",
        text: toText(resolveBindingValue(tab.header, context, contract, state), "Tab " + (index + 1)),
        attributes: {
          type: "button"
        },
        style: "cursor:pointer;"
      });
      headerButton.addEventListener("click", function () {
        applyActiveTab(index);
      });
      headerRow.appendChild(headerButton);
    });

    container.appendChild(headerRow);
    container.appendChild(body);
    applyActiveTab(0);
    return container;
  }

  function renderWidgetPostNavigation(documentObject, widget, context, delivery, state) {
    var navigation = context && context.navigation ? context.navigation : {};
    var previousPost = navigation ? navigation.previousPost : null;
    var nextPost = navigation ? navigation.nextPost : null;
    var heading = toText(resolveBindingValue(widget.props && widget.props.heading, context, null, state), "Keep Reading");
    var card = createNode(documentObject, "div", { style: "display:grid;gap:16px;" });
    card.appendChild(createNode(documentObject, "h2", { text: heading }));

    if (!previousPost && !nextPost) {
      card.appendChild(
        createNode(documentObject, "div", {
          className: "page-app-empty",
          text: state && state.deferredLoaded
            ? "No adjacent stories are available for this route yet."
            : "Loading adjacent stories..."
        })
      );
      return card;
    }

    var grid = createNode(documentObject, "div", { className: "page-app-nav" });
    [
      { label: "Previous Story", item: previousPost },
      { label: "Next Story", item: nextPost }
    ].forEach(function (entry) {
      var item = entry.item;
      if (!item) {
        return;
      }
      var href = normalizeLinkHref(item, delivery);
      var wrapper = href
        ? createNode(documentObject, "a", { attributes: { href: href } })
        : createNode(documentObject, "div", {});
      var navCard = createNode(documentObject, "article", { className: "page-app-nav-card" });
      navCard.appendChild(createNode(documentObject, "strong", { text: entry.label }));
      navCard.appendChild(createNode(documentObject, "h3", { text: toText(item.title, "Untitled story") }));
      if (item.excerpt) {
        navCard.appendChild(createNode(documentObject, "p", { className: "page-app-note", text: item.excerpt }));
      }
      wrapper.appendChild(navCard);
      grid.appendChild(wrapper);
    });
    card.appendChild(grid);
    return card;
  }

  function renderWidgetRelatedPosts(documentObject, widget, context, delivery, state) {
    var related = context && context.related ? context.related : {};
    var source = toText(resolveBindingValue(widget.props && widget.props.source, context, null, state), "combined");
    var heading = toText(resolveBindingValue(widget.props && widget.props.heading, context, null, state), "Related Stories");
    var limit = Number(resolveBindingValue(widget.props && widget.props.limit, context, null, state));
    var maxItems = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 3;
    var selectedItems;
    if (source === "moreFromAuthor") {
      selectedItems = normalizeArray(related.moreFromAuthor);
    } else if (source === "byCategory") {
      selectedItems = normalizeArray(related.byCategory);
    } else if (source === "byTag") {
      selectedItems = normalizeArray(related.byTag);
    } else {
      selectedItems = uniqueById(
        normalizeArray(related.moreFromAuthor)
          .concat(normalizeArray(related.byCategory))
          .concat(normalizeArray(related.byTag))
      );
    }
    selectedItems = selectedItems.slice(0, maxItems);

    var card = createNode(documentObject, "div", { style: "display:grid;gap:16px;" });
    card.appendChild(createNode(documentObject, "h2", { text: heading }));
    if (!selectedItems.length) {
      card.appendChild(
        createNode(documentObject, "div", {
          className: "page-app-empty",
          text: state && state.deferredLoaded
            ? "No related stories are available for this route yet."
            : "Loading related stories..."
        })
      );
      return card;
    }

    var list = createNode(documentObject, "div", { className: "page-app-post-list" });
    selectedItems.forEach(function (item) {
      var href = normalizeLinkHref(item, delivery);
      var wrapper = href
        ? createNode(documentObject, "a", { attributes: { href: href } })
        : createNode(documentObject, "div", {});
      var postCard = createNode(documentObject, "article", { className: "page-app-post-card" });
      if (item.featuredMedia && item.featuredMedia.preferredUrl) {
        postCard.appendChild(
          createNode(documentObject, "img", {
            attributes: {
              src: item.featuredMedia.preferredUrl,
              alt: toText(item.featuredMedia.altText, toText(item.title, "Related story"))
            },
            style: "width:100%;border-radius:16px;border:1px solid var(--page-line);"
          })
        );
      }
      postCard.appendChild(createNode(documentObject, "h3", { text: toText(item.title, "Untitled story") }));
      if (item.excerpt) {
        postCard.appendChild(createNode(documentObject, "p", { className: "page-app-note", text: item.excerpt }));
      }
      if (item.publishedOn) {
        postCard.appendChild(createNode(documentObject, "div", { className: "page-app-meta", text: "Published " + toDisplayDate(item.publishedOn, state.support) }));
      }
      wrapper.appendChild(postCard);
      list.appendChild(wrapper);
    });
    card.appendChild(list);
    return card;
  }

  function renderCompiledWidget(documentObject, state, widget, contract) {
    var context = buildWidgetContext(state);
    var delivery = state && state.payload ? state.payload.delivery : null;
    if (!widget || !widget.componentKey) {
      return createNode(documentObject, "div", { className: "page-app-empty", text: "No widget is assigned to this block yet." });
    }
    if (widget.componentKey === "post-title") {
      return renderWidgetTitle(documentObject, widget, context);
    }
    if (widget.componentKey === "post-rich-text") {
      return renderWidgetRichText(documentObject, widget, context, contract);
    }
    if (widget.componentKey === "media-image") {
      return renderWidgetImage(documentObject, widget, context, contract, state);
    }
    if (widget.componentKey === "category-chips") {
      return renderWidgetCategoryChips(documentObject, widget, context, contract, delivery, state);
    }
    if (widget.componentKey === "author-card") {
      return renderWidgetAuthorCard(documentObject, widget, context, contract, delivery, state);
    }
    if (widget.componentKey === "breadcrumbs") {
      return renderWidgetBreadcrumbs(documentObject, context, delivery);
    }
    if (widget.componentKey === "post-navigation") {
      return renderWidgetPostNavigation(documentObject, widget, context, delivery, state);
    }
    if (widget.componentKey === "related-posts") {
      return renderWidgetRelatedPosts(documentObject, widget, context, delivery, state);
    }
    if (widget.componentKey === "tabs") {
      return renderWidgetTabs(documentObject, widget, context, contract, state);
    }
    return createNode(documentObject, "div", {
      className: "page-app-empty",
      text: "Widget '" + widget.componentKey + "' is not supported by the reader yet."
    });
  }

  function buildContainerStyle(node) {
    var props = node && node.props ? node.props : {};
    if (node && node.layoutMode === "grid") {
      return [
        "display:grid",
        "gap:" + Number(props.gap || 0) + "px",
        "padding:" + Number(props.padding || 0) + "px",
        "min-height:" + Number(props.minHeight || 0) + "px",
        "grid-template-columns:repeat(" + Math.max(Number(props.columns || 1), 1) + ", minmax(0, 1fr))",
        "grid-auto-rows:minmax(" + Math.max(Number(props.autoRows || 120), 24) + "px, auto)"
      ].join(";");
    }
    return [
      "display:flex",
      "flex-direction:" + toText(props.direction, "column"),
      "flex-wrap:" + toText(props.wrap, "nowrap"),
      "justify-content:" + toText(props.justifyContent, "flex-start"),
      "align-items:" + toText(props.alignItems, "stretch"),
      "gap:" + Number(props.gap || 0) + "px",
      "padding:" + Number(props.padding || 0) + "px",
      "min-height:" + Number(props.minHeight || 0) + "px"
    ].join(";");
  }

  function buildChildPlacementStyle(parentNode, childNode) {
    var placement = childNode && childNode.placement ? childNode.placement : {};
    if (parentNode && parentNode.layoutMode === "grid") {
      var grid = placement.grid || {};
      return [
        "grid-column:" + (Number(grid.x || 0) + 1) + " / span " + Math.max(Number(grid.w || 1), 1),
        "grid-row:" + (Number(grid.y || 0) + 1) + " / span " + Math.max(Number(grid.h || 1), 1)
      ].join(";");
    }
    var flex = placement.flex || {};
    var isColumnFlow =
      parentNode &&
      parentNode.layoutMode === "flex" &&
      toText(parentNode.props && parentNode.props.direction, "column") === "column";
    return [
      "order:" + Number(flex.order || 0),
      "flex-basis:" + (isColumnFlow ? "auto" : toText(flex.basis, "100%")),
      isColumnFlow ? "width:" + toText(flex.basis, "100%") : "",
      "flex-grow:" + Number(flex.grow || 0),
      "flex-shrink:" + Number(flex.shrink || 0)
    ].filter(Boolean).join(";");
  }

  function resolveBlockSurfaceVariant(node) {
    var widgetKey = toText(node && node.widget ? node.widget.componentKey : "", "");
    var placeholderType = toClassToken(node && node.props ? node.props.placeholderType : "", "content");
    if (
      widgetKey === "breadcrumbs" ||
      widgetKey === "post-title" ||
      widgetKey === "category-chips" ||
      widgetKey === "post-rich-text" ||
      widgetKey === "related-posts"
    ) {
      return "plain";
    }
    if (widgetKey === "media-image" && placeholderType === "image") {
      return "plain";
    }
    if (widgetKey === "author-card" || widgetKey === "tabs" || widgetKey === "post-navigation") {
      return "soft";
    }
    var emphasis = toText(node && node.props ? node.props.emphasis : "", "default");
    if (emphasis === "quiet") {
      return "plain";
    }
    if (emphasis === "strong") {
      return "strong";
    }
    return "card";
  }

  function buildContainerClassName(node) {
    return joinClassNames([
      "page-app-container",
      "page-app-container--" + toClassToken(node && node.layoutMode, "flex"),
      "page-app-container--label-" + toClassToken(node && node.label, "container")
    ]);
  }

  function buildBlockClassName(node) {
    return joinClassNames([
      "page-app-block",
      "page-app-block--surface-" + resolveBlockSurfaceVariant(node),
      "page-app-block--emphasis-" + toClassToken(node && node.props ? node.props.emphasis : "", "default"),
      "page-app-block--placeholder-" + toClassToken(node && node.props ? node.props.placeholderType : "", "content"),
      "page-app-block--label-" + toClassToken(node && node.label, "block"),
      node && node.widget && node.widget.componentKey
        ? "page-app-block--widget-" + toClassToken(node.widget.componentKey, "widget")
        : "page-app-block--widget-empty"
    ]);
  }

  function renderWidgetLayoutNode(documentObject, state, contract, nodeId) {
    var node = contract && contract.nodes ? contract.nodes[nodeId] : null;
    if (!node) {
      return null;
    }
    if (node.kind === "container") {
      var container = createNode(documentObject, "section", {
        className: buildContainerClassName(node),
        style: buildContainerStyle(node)
      });
      normalizeArray(node.children).forEach(function (childId) {
        var childNode = contract.nodes && contract.nodes[childId] ? contract.nodes[childId] : null;
        var childElement = renderWidgetLayoutNode(documentObject, state, contract, childId);
        if (!childNode || !childElement) {
          return;
        }
        childElement.style.cssText += ";" + buildChildPlacementStyle(node, childNode);
        container.appendChild(childElement);
      });
      return container;
    }
    var block = createNode(documentObject, "section", {
      className: buildBlockClassName(node),
      style: "min-height:" + Number(node.props && node.props.minHeight ? node.props.minHeight : 0) + "px;"
    });
    block.appendChild(renderCompiledWidget(documentObject, state, node.widget, contract));
    return block;
  }

  function renderWidgetizedUtilityBar(documentObject) {
    return createNode(documentObject, "div", {
      className: "page-app-widget-utility-bar",
      style: "display:flex;justify-content:flex-end;align-items:center;gap:12px;padding:0 0 12px;"
    });
  }

  function renderWidgetizedPage(documentObject, state) {
    var contract = readWidgetRenderContract(state);
    if (!contract) {
      return false;
    }
    var localeMenu = renderLocaleMenu(documentObject, state);
    var utilityBar = localeMenu ? renderWidgetizedUtilityBar(documentObject) : null;
    var root = renderWidgetLayoutNode(documentObject, state, contract, contract.rootId);
    if (!root) {
      return false;
    }
    root.className = joinClassNames(["page-app-widget-layout", root.className]);
    root.style.cssText = buildContainerStyle(contract.nodes[contract.rootId]);
    if (utilityBar) {
      utilityBar.appendChild(localeMenu);
      state.mount.appendChild(utilityBar);
    }
    state.mount.appendChild(root);
    if (state.model.kind === "post-detail" && state.model.comments && state.model.comments.enabled) {
      state.commentsSection = createCommentsSection(documentObject);
      state.mount.appendChild(state.commentsSection.card);
      state.commentsSection.form.addEventListener("submit", function (event) {
        handleCommentSubmit(window, state, event);
      });
    }
    return true;
  }

  function renderReviewOverlay(targetGlobal, state) {
    if (!state.reviewEnabled && !state.debugEnabled) { return; }
    var documentObject = targetGlobal.document;
    var existing = documentObject.querySelector(".page-app-review");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    var overlay = createNode(documentObject, "aside", { className: "page-app-review" });
    overlay.appendChild(createNode(documentObject, "h2", { text: state.debugEnabled ? "Debug Overlay" : "Review Overlay" }));
    overlay.appendChild(createNode(documentObject, "p", { text: "Inspect deployment state, query the runtime, and exercise the page contract without leaving the page." }));
    var output = createNode(documentObject, "pre", { text: "Ready." });
    var actions = createNode(documentObject, "div", { className: "page-app-actions" });

    var snapshotButton = createNode(documentObject, "button", { className: "page-app-button alt", text: "Load Snapshot" });
    snapshotButton.addEventListener("click", async function () {
      snapshotButton.disabled = true;
      try { state.support.setJsonOutput(output, await targetGlobal.dataLayer.query({ resource: state.contract.remoteQuery.resource, query: state.contract.remoteQuery.query })); }
      catch (error) { state.support.setJsonOutput(output, { ok: false, error: error && error.message ? error.message : String(error) }); }
      finally { snapshotButton.disabled = false; }
    });
    actions.appendChild(snapshotButton);

    if (state.contract.firestoreQuery) {
      var firestoreButton = createNode(documentObject, "button", { className: "page-app-button alt", text: "Load Firestore" });
      firestoreButton.addEventListener("click", async function () {
        firestoreButton.disabled = true;
        try { state.support.setJsonOutput(output, await targetGlobal.dataLayer.query({ resource: state.contract.firestoreQuery.resource, query: state.contract.firestoreQuery.query })); }
        catch (error) { state.support.setJsonOutput(output, { ok: false, error: error && error.message ? error.message : String(error) }); }
        finally { firestoreButton.disabled = false; }
      });
      actions.appendChild(firestoreButton);
    }

    if (state.contract.actions && state.contract.actions.install) {
      var installButton = createNode(documentObject, "button", { className: "page-app-button alt", text: "Install To IndexedDB" });
      installButton.addEventListener("click", async function () {
        installButton.disabled = true;
        try { await targetGlobal.actionLayer.dispatch({ action: state.contract.actions.install }); state.support.setJsonOutput(output, await targetGlobal.dataLayer.getDatasetStatus(state.contract.dataset)); }
        catch (error) { state.support.setJsonOutput(output, { ok: false, error: error && error.message ? error.message : String(error) }); }
        finally { installButton.disabled = false; }
      });
      actions.appendChild(installButton);
    }

    if (state.model && state.model.kind === "post-detail" && state.model.comments && state.model.comments.enabled) {
      var refreshCommentsButton = createNode(documentObject, "button", { className: "page-app-button alt", text: "Refresh Comments" });
      refreshCommentsButton.addEventListener("click", async function () {
        refreshCommentsButton.disabled = true;
        try { await refreshComments(targetGlobal, state); state.support.setJsonOutput(output, { ok: true, approved: normalizeArray(state.commentsApproved).length, pending: normalizeArray(state.commentsPending).length }); }
        catch (error) { state.support.setJsonOutput(output, { ok: false, error: error && error.message ? error.message : String(error) }); }
        finally { refreshCommentsButton.disabled = false; }
      });
      actions.appendChild(refreshCommentsButton);
    }

    overlay.appendChild(actions); overlay.appendChild(output);
    var review = state.payload && state.payload.application ? state.payload.application.review : null;
    if (review) { overlay.appendChild(createNode(documentObject, "div", { className: "page-app-note", text: [review.pageId ? "Page: " + review.pageId : "", review.layoutId ? "Layout: " + review.layoutId : "", review.resolvedAt ? "Resolved: " + review.resolvedAt : ""].filter(Boolean).join(" | ") })); }
    if (state.debugEnabled) {
      var applicationDetails = createNode(documentObject, "details", { attributes: { open: "open" } });
      applicationDetails.appendChild(createNode(documentObject, "summary", { text: "Application Model" }));
      applicationDetails.appendChild(createNode(documentObject, "pre", { text: JSON.stringify(state.payload.application || {}, null, 2) }));
      overlay.appendChild(applicationDetails);
      var layoutDetails = createNode(documentObject, "details", {});
      layoutDetails.appendChild(createNode(documentObject, "summary", { text: "Layout JSON" }));
      layoutDetails.appendChild(createNode(documentObject, "pre", { text: JSON.stringify(state.payload.application && state.payload.application.layout ? state.payload.application.layout.layoutDocument || {} : {}, null, 2) }));
      overlay.appendChild(layoutDetails);
      var widgetDetails = createNode(documentObject, "details", {});
      widgetDetails.appendChild(createNode(documentObject, "summary", { text: "Widget Render Contract" }));
      widgetDetails.appendChild(createNode(documentObject, "pre", { text: JSON.stringify(readWidgetRenderContract(state) || {}, null, 2) }));
      overlay.appendChild(widgetDetails);
      var payloadDetails = createNode(documentObject, "details", {});
      payloadDetails.appendChild(createNode(documentObject, "summary", { text: "Full Payload" }));
      payloadDetails.appendChild(createNode(documentObject, "pre", { text: JSON.stringify(state.payload, null, 2) }));
      overlay.appendChild(payloadDetails);
    }
    documentObject.body.appendChild(overlay);
  }

  function renderPostPage(documentObject, state, main, side) {
    var model = state.model;
    var delivery = state && state.payload ? state.payload.delivery : null;
    state.mount.appendChild(renderHero(documentObject, model, state.support, delivery, state));
    var storyCard = createNode(documentObject, "article", { className: "page-app-card" });
    storyCard.appendChild(createNode(documentObject, "h2", { text: "Story" }));
    storyCard.appendChild(createNode(documentObject, "div", { className: "page-app-body", html: model.post.body || "<p>No story body was delivered for this page.</p>" }));
    main.appendChild(storyCard);
    var categoriesSection = renderChipSection(documentObject, model.post.categories, "Categories", delivery); if (categoriesSection) { main.appendChild(categoriesSection); }
    var tagsSection = renderChipSection(documentObject, model.post.tags, "Tags", delivery); if (tagsSection) { main.appendChild(tagsSection); }
    var gallery = renderGallery(documentObject, model.post.galleryMedia); if (gallery) { main.appendChild(gallery); }
    var navigationCard = createNode(documentObject, "section", { className: "page-app-card" });
    navigationCard.appendChild(createNode(documentObject, "h2", { text: "Keep Reading" }));
    var navGrid = createNode(documentObject, "div", { className: "page-app-nav" });
    [renderNavigationCard(documentObject, "Previous Story", model.navigation.previousPost, delivery), renderNavigationCard(documentObject, "Next Story", model.navigation.nextPost, delivery), renderNavigationCard(documentObject, "Primary Category", model.navigation.primaryCategory, delivery), renderNavigationCard(documentObject, "Author Page", model.navigation.authorPage, delivery)].filter(Boolean).forEach(function (entry) { navGrid.appendChild(entry); });
    navigationCard.appendChild(navGrid.childNodes.length ? navGrid : createNode(documentObject, "div", { className: "page-app-empty", text: state.deferredLoaded ? "No adjacent routes are available for this story yet." : "Loading adjacent routes..." }));
    main.appendChild(navigationCard);
    [{ title: "More From This Author", items: model.related.moreFromAuthor }, { title: "Related By Category", items: model.related.byCategory }, { title: "Related By Tag", items: model.related.byTag }].forEach(function (section) {
      var card = createNode(documentObject, "section", { className: "page-app-card" });
      card.appendChild(createNode(documentObject, "h2", { text: section.title }));
      if (!normalizeArray(section.items).length) { card.appendChild(createNode(documentObject, "div", { className: "page-app-empty", text: state.deferredLoaded ? "No related stories are available yet." : "Loading related stories..." })); }
      else { var list = createNode(documentObject, "div", { className: "page-app-post-list" }); normalizeArray(section.items).forEach(function (item) { list.appendChild(renderPostCard(documentObject, item, delivery)); }); card.appendChild(list); }
      side.appendChild(card);
    });
    side.appendChild(renderAuthorCard(documentObject, model.post.author, delivery));
    if (model.comments && model.comments.enabled) {
      state.commentsSection = createCommentsSection(documentObject);
      main.appendChild(state.commentsSection.card);
      state.commentsSection.form.addEventListener("submit", function (event) { handleCommentSubmit(window, state, event); });
    }
  }

  function renderCategoryPage(documentObject, state, main, side) {
    var model = state.model;
    var delivery = state && state.payload ? state.payload.delivery : null;
    state.mount.appendChild(renderHero(documentObject, model, state.support, delivery, state));
    var postsCard = createNode(documentObject, "section", { className: "page-app-card" });
    postsCard.appendChild(createNode(documentObject, "h2", { text: "Stories In This Category" }));
    if (!normalizeArray(model.posts).length) { postsCard.appendChild(createNode(documentObject, "div", { className: "page-app-empty", text: state.deferredLoaded ? "No stories are currently attached to this category." : "Loading stories in this category..." })); }
    else { var postsList = createNode(documentObject, "div", { className: "page-app-post-list" }); normalizeArray(model.posts).forEach(function (item) { postsList.appendChild(renderPostCard(documentObject, item, delivery)); }); postsCard.appendChild(postsList); }
    main.appendChild(postsCard);
    var childCard = createNode(documentObject, "section", { className: "page-app-card" });
    childCard.appendChild(createNode(documentObject, "h2", { text: "Child Categories" }));
    if (!normalizeArray(model.children).length) { childCard.appendChild(createNode(documentObject, "div", { className: "page-app-empty", text: state.deferredLoaded ? "This category has no child branches yet." : "Loading child branches..." })); }
    else { var childGrid = createNode(documentObject, "div", { className: "page-app-grid" }); normalizeArray(model.children).forEach(function (item) { var node = renderNavigationCard(documentObject, "Category", item, delivery); if (node) { childGrid.appendChild(node); } }); childCard.appendChild(childGrid); }
    side.appendChild(childCard);
    if (model.navigation.parentCategory) {
      var parentCard = createNode(documentObject, "section", { className: "page-app-card" });
      parentCard.appendChild(createNode(documentObject, "h2", { text: "Parent Category" }));
      var parentLink = renderNavigationCard(documentObject, "Up One Level", model.navigation.parentCategory, delivery); if (parentLink) { parentCard.appendChild(parentLink); }
      side.appendChild(parentCard);
    }
  }

  function renderGenericPage(documentObject, state, main) {
    state.mount.appendChild(renderHero(documentObject, state.model, state.support, state && state.payload ? state.payload.delivery : null, state));
    var card = createNode(documentObject, "section", { className: "page-app-card" });
    card.appendChild(createNode(documentObject, "h2", { text: "Page" }));
    card.appendChild(createNode(documentObject, "div", { className: "page-app-body", html: state.model.body || "<p>No renderable body was delivered for this page.</p>" }));
    main.appendChild(card);
  }

  function renderApplication(targetGlobal, state) {
    var documentObject = targetGlobal.document; ensureStyles(documentObject); applyResolvedTheme(documentObject, readResolvedThemeDocument(state)); state.mount.replaceChildren(); state.mount.className = "page-app-root";
    state.commentsSection = null;
    if (renderWidgetizedPage(documentObject, state)) {
      renderReviewOverlay(targetGlobal, state);
      return;
    }
    var layout = createNode(documentObject, "div", { className: "page-app-layout" }); var main = createNode(documentObject, "main", { className: "page-app-main" }); var side = createNode(documentObject, "aside", { className: "page-app-side" }); layout.appendChild(main); layout.appendChild(side);
    if (state.model.kind === "post-detail") { renderPostPage(documentObject, state, main, side); }
    else if (state.model.kind === "category-detail") { renderCategoryPage(documentObject, state, main, side); }
    else { layout.classList.add("single-column"); side.remove(); renderGenericPage(documentObject, state, main); }
    state.mount.appendChild(layout); renderReviewOverlay(targetGlobal, state);
  }

  function unwrapCollectionEnvelope(value) {
    if (!value) {
      return null;
    }
    if (Array.isArray(value)) {
      return value[0] || null;
    }
    if (value && typeof value === "object" && Array.isArray(value.items)) {
      return value.items[0] || null;
    }
    return value;
  }

  async function fetchJsonPayload(targetGlobal, requestUrl) {
    var response = await targetGlobal.fetch(requestUrl, {
      headers: {
        Accept: "application/json"
      }
    });
    var body = await response.json();
    if (!response.ok || (body && body.ok === false)) {
      throw new Error(
        body && body.error && body.error.message
          ? body.error.message
          : "Reader transport request failed."
      );
    }
    return body;
  }

  function buildLocalPublishedDocumentUrl(pagePath) {
    return (
      "/api/reference/modules/test-modules-pages/public/published-document?path=" +
      encodeURIComponent(normalizePagePathValue(pagePath))
    );
  }

  function buildDeployedPublishedDocumentUrl(apiOrigin, routeEntry, documentId) {
    var collectionPath =
      routeEntry &&
      routeEntry.contentSource &&
      routeEntry.contentSource.collectionPath
        ? routeEntry.contentSource.collectionPath
        : "";
    var projectId =
      routeEntry &&
      routeEntry.contentSource &&
      routeEntry.contentSource.projectId
        ? routeEntry.contentSource.projectId
        : "";
    if (!apiOrigin || !collectionPath || !projectId || !documentId) {
      throw new Error("The route manifest does not define a complete published-document source.");
    }
    return (
      apiOrigin.replace(/\/+$/g, "") +
      "/published-document?projectId=" +
      encodeURIComponent(projectId) +
      "&collectionPath=" +
      encodeURIComponent(collectionPath) +
      "&documentId=" +
      encodeURIComponent(documentId)
    );
  }

  function buildDeployedReaderDeferredUrl(apiOrigin, routeEntry, pagePath, documentId) {
    if (!apiOrigin || !routeEntry || !documentId) {
      throw new Error("The deployed reader deferred request is missing route context.");
    }
    return (
      apiOrigin.replace(/\/+$/g, "") +
      "/reader/deferred?path=" +
      encodeURIComponent(normalizePagePathValue(pagePath)) +
      "&pageId=" +
      encodeURIComponent(toText(routeEntry.pageId, "")) +
      "&primarySourceType=" +
      encodeURIComponent(toText(routeEntry.primarySourceType, "")) +
      "&documentId=" +
      encodeURIComponent(documentId)
    );
  }

  async function fetchReaderBootstrap(targetGlobal, contract, apiOrigin, pagePath) {
    var routeResolution = await resolveRouteContractByPath(targetGlobal, pagePath);
    var payload = routeResolution.payload;
    var routeManifest = routeResolution.routeManifest;
    var matchResult = routeResolution.matchResult;
    var routeEntry = matchResult.entry;
    var documentId = resolveRouteDocumentId(matchResult);
    var responseBody = await fetchJsonPayload(
      targetGlobal,
      apiOrigin
        ? buildDeployedPublishedDocumentUrl(apiOrigin, routeEntry, documentId)
        : buildLocalPublishedDocumentUrl(pagePath)
    );
    var documentRecord = responseBody && responseBody.document ? responseBody.document : null;
    if (!documentRecord) {
      throw new Error("The published document query returned no document.");
    }
    return buildBootstrapDocumentFromPublishedRoute(
      targetGlobal,
      payload,
      routeEntry,
      pagePath,
      documentRecord,
      routeManifest
    );
  }

  async function fetchReaderDeferred(targetGlobal, contract, apiOrigin, pagePath) {
    var routeResolution = await resolveRouteContractByPath(targetGlobal, pagePath);
    var payload = routeResolution.payload;
    var matchResult = routeResolution.matchResult;
    var routeEntry = matchResult.entry;
    var documentId = resolveRouteDocumentId(matchResult);
    var responseBody = await fetchJsonPayload(
      targetGlobal,
      apiOrigin
        ? buildDeployedReaderDeferredUrl(apiOrigin, routeEntry, pagePath, documentId)
        : "/api/reference/modules/test-modules-pages/public/reader/deferred?path=" +
          encodeURIComponent(normalizePagePathValue(pagePath))
    );
    return buildDeferredDocumentForRoute(
      payload,
      routeEntry,
      pagePath,
      unwrapCollectionEnvelope(responseBody)
    );
  }

  window.__CRUD_PAGE_APPLICATION_RUNTIME__ = {
    fetchReaderBootstrap: fetchReaderBootstrap,
    fetchReaderDeferred: fetchReaderDeferred
  };

  function readPayload(documentObject) {
    var payloadScript = documentObject.getElementById("page-data");
    if (!payloadScript || !payloadScript.textContent) {
      throw new Error("[page-application] page-data payload was not found");
    }
    return JSON.parse(payloadScript.textContent);
  }

  async function bootPageApplication(targetGlobal) {
    var payload = readPayload(targetGlobal.document);
    var runtimePayload = payload && payload.runtime ? payload.runtime : {};
    var support = targetGlobal.__CRUD_PAGE_APPLICATION_TESTER_SUPPORT__;
    if (!support) {
      throw new Error("[page-application] support bridge is unavailable");
    }
    var globalTesterContract =
      targetGlobal.__CRUD_PAGE_APPLICATION_TESTER__ &&
      typeof targetGlobal.__CRUD_PAGE_APPLICATION_TESTER__ === "object"
        ? targetGlobal.__CRUD_PAGE_APPLICATION_TESTER__
        : {};
    var normalizedTesterContract = support.normalizeApplicationTesterContract(
      runtimePayload.applicationTester || globalTesterContract || {},
      targetGlobal
    );
    var apiOrigin = support.readApiOriginFromQuery(targetGlobal, normalizedTesterContract);
    await support.ensureRuntimeAugment(targetGlobal, normalizedTesterContract, apiOrigin);
    if (!targetGlobal.crudClientRuntime || !targetGlobal.dataLayer || !targetGlobal.actionLayer) {
      throw new Error("[page-application] client runtime is unavailable");
    }
    var state = {
      payload: payload,
      contract: normalizedTesterContract,
      apiOrigin: apiOrigin,
      support: support,
      model: payload.application && payload.application.model ? payload.application.model : buildFallbackApplicationModel(payload),
      reviewEnabled: support.isReviewEnabled(normalizedTesterContract, targetGlobal),
      debugEnabled: support.isDebugEnabled(normalizedTesterContract, targetGlobal),
      mount: targetGlobal.document.getElementById("page-app") || targetGlobal.document.getElementById("app") || targetGlobal.document.body,
      deferredLoaded: false,
      routeLoadPending: false,
      navigationBound: false,
      sourceLocale: normalizeLocaleCode(
        normalizedTesterContract.translationDefaultLocale,
        "en-US"
      ),
      activeLocale: normalizeLocaleCode(
        readRequestedLocale(
          targetGlobal,
          normalizeLocaleCode(normalizedTesterContract.translationDefaultLocale, "en-US")
        ),
        "en-US"
      ),
      baseBootstrapDocument: null,
      baseDeferredDocument: null,
      translationOverlayDocument: null,
      commentsApproved: [],
      commentsPending: []
    };
    applyResolvedTheme(targetGlobal.document, readResolvedThemeDocument(state));

    try {
      await loadCurrentReaderPage(targetGlobal, state, readCurrentPagePath(targetGlobal, state));
    } catch (error) {
      console.warn(error);
      state.deferredLoaded = true;
    }

    await applyActiveLocaleToState(targetGlobal, state);
    if (!state.baseBootstrapDocument) {
      renderApplication(targetGlobal, state);
    }
    bindClientNavigation(targetGlobal, state);
    try {
      await hydrateDeferredReaderData(targetGlobal, state, readCurrentPagePath(targetGlobal, state));
      await applyActiveLocaleToState(targetGlobal, state);
    } catch (error) {
      state.deferredLoaded = true;
      console.warn(error);
    }
    if (state.model.kind === "post-detail" && state.model.comments && state.model.comments.enabled) {
      try {
        await refreshComments(targetGlobal, state);
      } catch (error) {
        if (state.commentsSection && state.commentsSection.note) {
          state.commentsSection.note.textContent = error && error.message ? error.message : String(error);
        }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bootPageApplication(window).catch(function (error) {
        console.error(error);
        var mount = document.getElementById("page-app") || document.getElementById("app") || document.body;
        mount.replaceChildren(createNode(document, "div", { className: "page-app-card", text: error && error.message ? error.message : String(error) }));
      });
    });
  } else {
    bootPageApplication(window).catch(function (error) {
      console.error(error);
      var mount = document.getElementById("page-app") || document.getElementById("app") || document.body;
      mount.replaceChildren(createNode(document, "div", { className: "page-app-card", text: error && error.message ? error.message : String(error) }));
    });
  }
})(window);
