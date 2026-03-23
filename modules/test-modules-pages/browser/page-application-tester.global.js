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

  function toText(value, fallback) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback || "";
  }

  function toDisplayDate(value, support) {
    return value ? support.formatDateTime(value) : "";
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

  function normalizeLinkHref(link, delivery) {
    if (!link || typeof link !== "object") {
      return "";
    }
    var publicUrl = toText(link.publicUrl, "");
    if (publicUrl) {
      return shouldUseIndexArtifact(delivery, publicUrl) ? appendIndexArtifact(publicUrl) : publicUrl;
    }
    var path = toText(link.path, "");
    var deliveryOrigin = toText(delivery && delivery.publicOrigin, "");
    if (path && deliveryOrigin) {
      return buildFallbackPublicUrl(deliveryOrigin, path, delivery);
    }
    return path;
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

  function ensureStyles(documentObject) {
    if (documentObject.getElementById("page-application-style")) {
      return;
    }
    var style = documentObject.createElement("style");
    style.id = "page-application-style";
    style.textContent = ":root{color-scheme:light;--page-bg:#f6f1e8;--page-card:#fffdf8;--page-line:rgba(69,52,36,0.14);--page-ink:#2d2116;--page-muted:#6f604f;--page-accent:#9b4d19;--page-accent-soft:#f3dcc7;--page-shadow:0 24px 60px rgba(69,52,36,0.12);font-family:Georgia,'Times New Roman',serif;}body{margin:0;background:radial-gradient(circle at top,#fff7ec 0,#f6f1e8 50%,#efe5d7 100%);color:var(--page-ink);}#page-shell{min-height:100vh;}#page-app.page-app-root{display:grid;gap:24px;max-width:1200px;margin:0 auto;padding:32px 20px 80px;box-sizing:border-box;}.page-app-hero{display:grid;gap:20px;padding:24px;border:1px solid var(--page-line);border-radius:28px;background:linear-gradient(180deg,rgba(255,253,248,0.98),rgba(249,242,233,0.96));box-shadow:var(--page-shadow);}.page-app-hero-media{overflow:hidden;border-radius:22px;border:1px solid var(--page-line);background:#efe5d7;}.page-app-hero-media img,.page-app-gallery-item img,.page-app-card img{display:block;width:100%;height:auto;}.page-app-eyebrow{font:600 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--page-accent);margin:0 0 10px;}.page-app-title{margin:0;font-size:clamp(2.3rem,5vw,4.2rem);line-height:.98;}.page-app-subtitle{margin:0;font-size:1.15rem;line-height:1.55;color:var(--page-muted);max-width:70ch;}.page-app-meta,.page-app-chip-row,.page-app-link-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}.page-app-meta{font:500 14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}.page-app-chip,.page-app-link-chip{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;border:1px solid var(--page-line);background:rgba(255,255,255,.72);font:500 13px/1.3 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-ink);text-decoration:none;}.page-app-link-chip{background:var(--page-accent-soft);color:var(--page-accent);}.page-app-layout{display:grid;gap:24px;grid-template-columns:minmax(0,2fr) minmax(300px,1fr);align-items:start;}.page-app-layout.single-column{grid-template-columns:minmax(0,1fr);}.page-app-main,.page-app-side{display:grid;gap:20px;}.page-app-card{padding:22px;border:1px solid var(--page-line);border-radius:24px;background:var(--page-card);box-shadow:var(--page-shadow);overflow:hidden;}.page-app-card h2,.page-app-card h3,.page-app-card p{margin-top:0;}.page-app-card h2{margin-bottom:14px;font-size:1.5rem;}.page-app-card h3{margin-bottom:10px;font-size:1.1rem;}.page-app-body{font-size:1.1rem;line-height:1.8;color:var(--page-ink);}.page-app-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}.page-app-gallery{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));}.page-app-gallery-item{border-radius:18px;overflow:hidden;border:1px solid var(--page-line);background:#f7efe4;}.page-app-gallery-caption{padding:10px 12px;font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}.page-app-author{display:grid;gap:14px;grid-template-columns:80px minmax(0,1fr);align-items:start;}.page-app-avatar{width:80px;height:80px;border-radius:24px;overflow:hidden;background:#efe5d7;border:1px solid var(--page-line);}.page-app-stat{font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}.page-app-nav{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}.page-app-nav a,.page-app-post-list a{text-decoration:none;color:inherit;}.page-app-nav-card{padding:18px;border-radius:20px;border:1px solid var(--page-line);background:rgba(255,255,255,.74);display:grid;gap:8px;min-height:112px;}.page-app-nav-card strong{font:600 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--page-accent);}.page-app-post-list{display:grid;gap:14px;}.page-app-post-card{display:grid;gap:12px;padding:18px;border:1px solid var(--page-line);border-radius:20px;background:rgba(255,255,255,.74);}.page-app-comments-list{display:grid;gap:12px;}.page-app-comment{padding:14px;border:1px solid var(--page-line);border-radius:18px;background:rgba(255,255,255,.74);}.page-app-comment-head{display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}.page-app-comment.pending{border-style:dashed;background:#fff7ed;}.page-app-form{display:grid;gap:12px;}.page-app-form-row{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));}.page-app-form label{display:grid;gap:6px;font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}.page-app-form input,.page-app-form textarea{width:100%;box-sizing:border-box;border:1px solid var(--page-line);border-radius:14px;padding:11px 12px;font:inherit;background:#fff;}.page-app-form textarea{min-height:140px;resize:vertical;}.page-app-actions{display:flex;gap:10px;flex-wrap:wrap;}.page-app-button{appearance:none;border:0;border-radius:999px;padding:11px 16px;font:600 13px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--page-accent);color:#fff;cursor:pointer;}.page-app-button.alt{background:#3f3a34;}.page-app-button:disabled{opacity:.6;cursor:default;}.page-app-note{font:500 13px/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-muted);}.page-app-empty{padding:18px;border:1px dashed var(--page-line);border-radius:18px;color:var(--page-muted);font:500 14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}.page-app-review{position:fixed;right:16px;top:16px;z-index:2147483000;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;padding:16px;border-radius:22px;border:1px solid rgba(45,33,22,.18);background:rgba(255,253,248,.96);box-shadow:0 18px 42px rgba(45,33,22,.2);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--page-ink);display:grid;gap:12px;}.page-app-review h2,.page-app-review h3,.page-app-review p,.page-app-review pre{margin:0;}.page-app-review pre{padding:12px;border-radius:14px;background:#1f2937;color:#e5eef7;white-space:pre-wrap;word-break:break-word;overflow:auto;font:12px/1.45 Consolas,monospace;}.page-app-review details{border-top:1px solid var(--page-line);padding-top:10px;}.page-app-review summary{cursor:pointer;font-weight:600;}@media (min-width:960px){.page-app-hero{grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);align-items:start;}}@media (max-width:900px){.page-app-layout{grid-template-columns:minmax(0,1fr);} .page-app-form-row{grid-template-columns:minmax(0,1fr);} .page-app-review{position:static;width:auto;max-height:none;margin:0 20px 24px;}}";
    documentObject.head.appendChild(style);
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

  function renderHero(documentObject, model, support, delivery) {
    var hero = createNode(documentObject, "header", { className: "page-app-hero" });
    var copy = createNode(documentObject, "div", { className: "page-app-hero-copy" });
    var breadcrumbs = null;
    if (model.kind === "post-detail") {
      breadcrumbs = renderBreadcrumbs(documentObject, model.navigation && model.navigation.breadcrumbs, delivery);
      if (breadcrumbs) { copy.appendChild(breadcrumbs); }
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
      if (breadcrumbs) { copy.appendChild(breadcrumbs); }
      copy.appendChild(createNode(documentObject, "p", { className: "page-app-eyebrow", text: "Category" }));
      copy.appendChild(createNode(documentObject, "h1", { className: "page-app-title", text: model.category.name }));
      if (model.category.description) { copy.appendChild(createNode(documentObject, "p", { className: "page-app-subtitle", text: model.category.description })); }
      var categoryMeta = createNode(documentObject, "div", { className: "page-app-meta" });
      [model.category.treePath || "", Number.isFinite(Number(model.category.depth)) ? "Depth " + model.category.depth : ""].filter(Boolean).forEach(function (entry) { categoryMeta.appendChild(createNode(documentObject, "span", { text: entry })); });
      copy.appendChild(categoryMeta);
    } else {
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
    state.commentsSection.note.textContent = "Refreshing comments...";
    var result = await targetGlobal.dataLayer.query({ resource: "comments", query: "byPost" });
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
    var payload = { parentCommentId: null, authorDisplayName: state.commentsSection.authorInput.value.trim(), authorEmail: state.commentsSection.emailInput.value.trim(), body: state.commentsSection.bodyInput.value.trim() };
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

  function renderReviewOverlay(targetGlobal, state) {
    if (!state.reviewEnabled && !state.debugEnabled) { return; }
    var documentObject = targetGlobal.document;
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
      layoutDetails.appendChild(createNode(documentObject, "pre", { text: JSON.stringify(state.payload.renderModel && state.payload.renderModel.layoutDocument ? state.payload.renderModel.layoutDocument : {}, null, 2) }));
      overlay.appendChild(layoutDetails);
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
    state.mount.appendChild(renderHero(documentObject, model, state.support, delivery));
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
    navigationCard.appendChild(navGrid.childNodes.length ? navGrid : createNode(documentObject, "div", { className: "page-app-empty", text: "No adjacent routes are available for this story yet." }));
    main.appendChild(navigationCard);
    [{ title: "More From This Author", items: model.related.moreFromAuthor }, { title: "Related By Category", items: model.related.byCategory }, { title: "Related By Tag", items: model.related.byTag }].forEach(function (section) {
      var card = createNode(documentObject, "section", { className: "page-app-card" });
      card.appendChild(createNode(documentObject, "h2", { text: section.title }));
      if (!normalizeArray(section.items).length) { card.appendChild(createNode(documentObject, "div", { className: "page-app-empty", text: "No related stories are available yet." })); }
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
    state.mount.appendChild(renderHero(documentObject, model, state.support, delivery));
    var postsCard = createNode(documentObject, "section", { className: "page-app-card" });
    postsCard.appendChild(createNode(documentObject, "h2", { text: "Stories In This Category" }));
    if (!normalizeArray(model.posts).length) { postsCard.appendChild(createNode(documentObject, "div", { className: "page-app-empty", text: "No stories are currently attached to this category." })); }
    else { var postsList = createNode(documentObject, "div", { className: "page-app-post-list" }); normalizeArray(model.posts).forEach(function (item) { postsList.appendChild(renderPostCard(documentObject, item, delivery)); }); postsCard.appendChild(postsList); }
    main.appendChild(postsCard);
    var childCard = createNode(documentObject, "section", { className: "page-app-card" });
    childCard.appendChild(createNode(documentObject, "h2", { text: "Child Categories" }));
    if (!normalizeArray(model.children).length) { childCard.appendChild(createNode(documentObject, "div", { className: "page-app-empty", text: "This category has no child branches yet." })); }
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
    state.mount.appendChild(renderHero(documentObject, state.model, state.support, state && state.payload ? state.payload.delivery : null));
    var card = createNode(documentObject, "section", { className: "page-app-card" });
    card.appendChild(createNode(documentObject, "h2", { text: "Page" }));
    card.appendChild(createNode(documentObject, "div", { className: "page-app-body", html: state.model.body || "<p>No renderable body was delivered for this page.</p>" }));
    main.appendChild(card);
  }

  function renderApplication(targetGlobal, state) {
    var documentObject = targetGlobal.document; ensureStyles(documentObject); state.mount.replaceChildren(); state.mount.className = "page-app-root";
    var layout = createNode(documentObject, "div", { className: "page-app-layout" }); var main = createNode(documentObject, "main", { className: "page-app-main" }); var side = createNode(documentObject, "aside", { className: "page-app-side" }); layout.appendChild(main); layout.appendChild(side);
    if (state.model.kind === "post-detail") { renderPostPage(documentObject, state, main, side); }
    else if (state.model.kind === "category-detail") { renderCategoryPage(documentObject, state, main, side); }
    else { layout.classList.add("single-column"); side.remove(); renderGenericPage(documentObject, state, main); }
    state.mount.appendChild(layout); renderReviewOverlay(targetGlobal, state);
  }
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
    var contract = targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__ || runtimePayload.clientRuntime || {};
    var support = targetGlobal.__CRUD_PAGE_APPLICATION_TESTER_SUPPORT__;
    if (!support) {
      throw new Error("[page-application] support bridge is unavailable");
    }
    var normalizedTesterContract = support.normalizeApplicationTesterContract(runtimePayload.applicationTester || {});
    var apiOrigin = support.readApiOriginFromQuery(targetGlobal, normalizedTesterContract);
    await support.ensureRuntimeAugment(targetGlobal, normalizedTesterContract, apiOrigin);
    if (!targetGlobal.crudClientRuntime || !targetGlobal.dataLayer || !targetGlobal.actionLayer) {
      throw new Error("[page-application] client runtime is unavailable");
    }
    var state = {
      payload: payload,
      contract: normalizedTesterContract,
      support: support,
      model: payload.application && payload.application.model ? payload.application.model : buildFallbackApplicationModel(payload),
      reviewEnabled: support.isReviewEnabled(normalizedTesterContract, targetGlobal),
      debugEnabled: support.isDebugEnabled(normalizedTesterContract, targetGlobal),
      mount: targetGlobal.document.getElementById("page-app") || targetGlobal.document.getElementById("app") || targetGlobal.document.body,
      commentsApproved: [],
      commentsPending: []
    };
    renderApplication(targetGlobal, state);
    if (state.model.kind === "post-detail" && state.model.comments && state.model.comments.enabled) {
      try {
        await refreshComments(targetGlobal, state);
      } catch (error) {
        if (state.commentsSection && state.commentsSection.status) {
          state.commentsSection.status.textContent = error && error.message ? error.message : String(error);
          state.commentsSection.status.className = "page-app-status error";
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
