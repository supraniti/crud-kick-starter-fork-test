  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function dedupeStrings(values) {
    return Array.from(
      new Set(
        normalizeArray(values)
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter(Boolean)
      )
    );
  }

  function dedupeBy(values, readKey) {
    var seen = new Set();
    return normalizeArray(values).filter(function (entry) {
      var key = readKey(entry);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function cloneJsonValue(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function isLocalReviewOrigin(targetGlobal) {
    var hostname = targetGlobal && targetGlobal.location ? targetGlobal.location.hostname : "";
    return hostname === "localhost" || hostname === "127.0.0.1";
  }

  function resolveReviewSnapshotUrl(targetGlobal) {
    var pathname = targetGlobal && targetGlobal.location ? targetGlobal.location.pathname : "";
    if (!isLocalReviewOrigin(targetGlobal) || String(pathname).indexOf("/published/") !== 0) {
      return null;
    }
    return new URL("./runtime-probe.document.json", targetGlobal.location.href).toString();
  }

  function mergeRuntimeConfig(baseConfig, runtimeAugment) {
    var base = baseConfig && typeof baseConfig === "object" ? baseConfig : {};
    var augment = runtimeAugment && typeof runtimeAugment === "object" ? runtimeAugment : {};
    return {
      ...base,
      context: {
        ...(base.context && typeof base.context === "object" ? base.context : {}),
        ...(augment.context && typeof augment.context === "object" ? augment.context : {})
      },
      remote: {
        ...(base.remote && typeof base.remote === "object" ? base.remote : {}),
        ...(augment.remote && typeof augment.remote === "object" ? augment.remote : {})
      },
      bootstrapDatasets: dedupeStrings([
        ...normalizeArray(base.bootstrapDatasets),
        ...normalizeArray(augment.bootstrapDatasets)
      ]),
      queries: dedupeBy(
        [...normalizeArray(base.queries), ...normalizeArray(augment.queries)],
        function (entry) {
          return entry && entry.resource && entry.query ? entry.resource + "." + entry.query : "";
        }
      ),
      actions: dedupeBy(
        [...normalizeArray(base.actions), ...normalizeArray(augment.actions)],
        function (entry) {
          return entry && entry.action ? entry.action : "";
        }
      ),
      datasets: dedupeBy(
        [...normalizeArray(base.datasets), ...normalizeArray(augment.datasets)],
        function (entry) {
          return entry && entry.dataset ? entry.dataset : "";
        }
      )
    };
  }

  function rewriteSnapshotRemotePaths(runtimeAugment, snapshotUrl) {
    var source = runtimeAugment && typeof runtimeAugment === "object" ? cloneJsonValue(runtimeAugment) : {};
    if (!snapshotUrl) {
      return source;
    }

    source.queries = normalizeArray(source.queries).map(function (entry) {
      if (
        entry &&
        entry.remote &&
        entry.resource === "pageApplicationTester" &&
        entry.query === "publishedDocumentSnapshot"
      ) {
        return {
          ...entry,
          remote: {
            ...entry.remote,
            path: snapshotUrl
          }
        };
      }
      return entry;
    });

    source.datasets = normalizeArray(source.datasets).map(function (entry) {
      if (entry && entry.dataset === "page-application-tester-published-document") {
        return {
          ...entry,
          remoteInstall: {
            ...(entry.remoteInstall && typeof entry.remoteInstall === "object" ? entry.remoteInstall : {}),
            path: snapshotUrl
          },
          remoteSync: {
            ...(entry.remoteSync && typeof entry.remoteSync === "object" ? entry.remoteSync : {}),
            path: snapshotUrl
          }
        };
      }
      return entry;
    });

    return source;
  }

  function normalizeApplicationTesterContract(contract, targetGlobal) {
    var source = contract && typeof contract === "object" ? cloneJsonValue(contract) : {};
    var snapshotUrl = resolveReviewSnapshotUrl(targetGlobal);
    if (!snapshotUrl) {
      return source;
    }
    source.documentUrl = snapshotUrl;
    source.runtimeAugment = rewriteSnapshotRemotePaths(source.runtimeAugment, snapshotUrl);
    return source;
  }

  function stripApplicationTesterApiDefinitions(config, contract) {
    var source = config && typeof config === "object" ? cloneJsonValue(config) : {};
    var firestoreQuery = contract && contract.firestoreQuery ? contract.firestoreQuery : null;
    var submitCommentAction =
      contract && contract.actions && typeof contract.actions.submitComment === "string"
        ? contract.actions.submitComment
        : "";

    source.queries = normalizeArray(source.queries).filter(function (entry) {
      if (!firestoreQuery) {
        return true;
      }
      return !(entry && entry.resource === firestoreQuery.resource && entry.query === firestoreQuery.query);
    });

    source.actions = normalizeArray(source.actions).filter(function (entry) {
      return !(submitCommentAction && entry && entry.action === submitCommentAction);
    });

    return source;
  }

  function isTruthyQueryParamValue(rawValue) {
    if (!rawValue) {
      return false;
    }
    var normalized = String(rawValue).trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }

  function isTesterEnabled(contract, targetGlobal) {
    if (!contract || !Array.isArray(contract.enabledQueryParams) || contract.enabledQueryParams.length === 0) {
      return false;
    }
    var params = new URLSearchParams(targetGlobal.location.search);
    return contract.enabledQueryParams.some(function (paramName) {
      return isTruthyQueryParamValue(params.get(paramName));
    });
  }

  function normalizeApiOrigin(value) {
    if (typeof value !== "string") {
      return "";
    }
    return value.trim().replace(/\/+$/g, "");
  }

  function readApiOriginFromQuery(targetGlobal, contract) {
    var params = new URLSearchParams(targetGlobal.location.search);
    var queryOrigin = normalizeArray(contract && contract.apiOriginQueryParams).reduce(function (current, paramName) {
      return current || normalizeApiOrigin(params.get(paramName));
    }, "");
    if (queryOrigin) {
      return queryOrigin;
    }
    var defaultOrigin = normalizeApiOrigin(contract && contract.defaultApiOrigin);
    if (defaultOrigin) {
      return defaultOrigin;
    }
    if (!isLocalReviewOrigin(targetGlobal)) {
      return "";
    }
    return normalizeArray(contract && contract.preferredApplicationApiOrigins).reduce(function (current, entry) {
      return current || normalizeApiOrigin(entry);
    }, "");
  }

  function delay(targetGlobal, timeoutMs) {
    return new Promise(function (resolve) {
      targetGlobal.setTimeout(resolve, timeoutMs);
    });
  }

  async function waitForRuntime(targetGlobal, timeoutMs) {
    var startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (
        targetGlobal.crudClientRuntime &&
        typeof targetGlobal.crudClientRuntime.configure === "function" &&
        targetGlobal.dataLayer &&
        targetGlobal.actionLayer
      ) {
        return true;
      }
      await delay(targetGlobal, 50);
    }
    return false;
  }

  function buildPublicApiRuntimeAugment(contract, apiOrigin) {
    if (!apiOrigin) {
      return {};
    }

    var usingDeployedPublicService = contract && contract.publicApiMode === "deployed-public-service";
    var queries = [];
    if (contract.firestoreQuery && contract.publicPublishedDocumentApiPath) {
      queries.push({
        resource: contract.firestoreQuery.resource,
        query: contract.firestoreQuery.query,
        policy: "remote-only",
        remote: {
          method: "GET",
          path: apiOrigin + contract.publicPublishedDocumentApiPath,
          queryParams: usingDeployedPublicService
            ? {
                projectId: contract.firestore && contract.firestore.projectId,
                collectionPath: contract.firestore && contract.firestore.collectionPath,
                documentId: contract.firestore && contract.firestore.documentId
              }
            : {
                path: "context.pagePath"
              },
          responsePath: "document"
        }
      });
    }

    var actions = [];
    if (
      contract.actions &&
      contract.actions.submitComment &&
      contract.publicCommentsApiPath &&
      contract.primaryRecord &&
      contract.primaryRecord.id
    ) {
      actions.push({
        action: contract.actions.submitComment,
        policy: "remote-required",
        remote: {
          method: "POST",
          path: apiOrigin + contract.publicCommentsApiPath,
          body: usingDeployedPublicService
            ? {
                projectId: contract.firestore && contract.firestore.projectId,
                postId: contract.primaryRecord.id,
                pagePath: contract.pagePath || null,
                parentCommentId: "payload.parentCommentId",
                authorDisplayName: "payload.authorDisplayName",
                authorEmail: "payload.authorEmail",
                body: "payload.body"
              }
            : {
                postId: contract.primaryRecord.id,
                parentCommentId: "payload.parentCommentId",
                authorDisplayName: "payload.authorDisplayName",
                authorEmail: "payload.authorEmail",
                body: "payload.body"
              },
          responsePath: "item"
        }
      });
    }

    return {
      queries: queries,
      actions: actions
    };
  }

  async function ensureRuntimeAugment(targetGlobal, contract, apiOrigin) {
    var runtimeReady = await waitForRuntime(targetGlobal, 3000);
    if (!runtimeReady) {
      throw new Error("client-runtime is not available on this page");
    }

    var cleanedBaseConfig = stripApplicationTesterApiDefinitions(
      targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__ || {},
      contract
    );
    var mergedConfig = mergeRuntimeConfig(
      cleanedBaseConfig,
      mergeRuntimeConfig(contract.runtimeAugment || {}, buildPublicApiRuntimeAugment(contract, apiOrigin))
    );

    targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__ = mergedConfig;
    targetGlobal.crudClientRuntime.configure(mergedConfig);
    if (targetGlobal.crudClientRuntime.ready && typeof targetGlobal.crudClientRuntime.ready.then === "function") {
      await targetGlobal.crudClientRuntime.ready;
    }
  }

  function setOutput(node, value) {
    node.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }

  function createTesterStyles() {
    return [
      "#page-application-tester{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(420px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;border:1px solid rgba(15,23,42,0.16);border-radius:16px;background:rgba(255,255,255,0.98);box-shadow:0 20px 40px rgba(15,23,42,0.22);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#0f172a;}",
      "#page-application-tester .app-tester-stack{display:grid;gap:12px;padding:16px;}",
      "#page-application-tester h2,#page-application-tester p,#page-application-tester pre,#page-application-tester label{margin:0;}",
      "#page-application-tester .app-tester-badges{display:flex;gap:8px;flex-wrap:wrap;}",
      "#page-application-tester .app-tester-badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:12px;}",
      "#page-application-tester .app-tester-actions,#page-application-tester .app-tester-fields{display:grid;gap:8px;}",
      "#page-application-tester .app-tester-grid{display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr));}",
      "#page-application-tester button{border:0;border-radius:10px;padding:10px 12px;background:#0f766e;color:#fff;font:inherit;cursor:pointer;text-align:left;}",
      "#page-application-tester button.alt{background:#334155;}",
      "#page-application-tester button.warn{background:#b45309;}",
      "#page-application-tester button:disabled{opacity:0.65;cursor:default;}",
      "#page-application-tester img{display:block;width:100%;height:auto;border-radius:12px;background:#e2e8f0;}",
      "#page-application-tester .app-tester-empty{padding:12px;border:1px dashed rgba(148,163,184,0.65);border-radius:12px;color:#475569;}",
      "#page-application-tester pre{padding:12px;border-radius:12px;background:#0f172a;color:#e2e8f0;overflow:auto;font:12px/1.45 Consolas,monospace;white-space:pre-wrap;word-break:break-word;}",
      "#page-application-tester .app-tester-kv{display:grid;gap:4px;}",
      "#page-application-tester .app-tester-kv strong{font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#475569;}",
      "#page-application-tester input,#page-application-tester textarea{width:100%;border:1px solid rgba(148,163,184,0.65);border-radius:10px;padding:9px 10px;font:inherit;background:#fff;color:#0f172a;box-sizing:border-box;}",
      "#page-application-tester textarea{min-height:92px;resize:vertical;}",
      "#page-application-tester label{display:grid;gap:6px;font-size:12px;color:#475569;}"
    ].join("");
  }

  function ensureStyles(documentObject) {
    if (documentObject.getElementById("page-application-tester-style")) {
      return;
    }
    var style = documentObject.createElement("style");
    style.id = "page-application-tester-style";
    style.textContent = createTesterStyles();
    documentObject.head.appendChild(style);
  }

  function appendBadgeRow(documentObject, stack, contract) {
    var row = documentObject.createElement("div");
    row.className = "app-tester-badges";
    normalizeArray(contract.flows).forEach(function (entry) {
      var badge = documentObject.createElement("span");
      badge.className = "app-tester-badge";
      badge.textContent = entry;
      row.appendChild(badge);
    });
    stack.appendChild(row);
  }

  function appendFeaturedMedia(documentObject, stack, contract) {
    var featuredMedia = contract.featuredMedia;
    if (!featuredMedia || !featuredMedia.preferredUrl) {
      var empty = documentObject.createElement("div");
      empty.className = "app-tester-empty";
      empty.textContent = "No referenced image was resolved for this page.";
      stack.appendChild(empty);
      return;
    }
    var image = documentObject.createElement("img");
    image.src = featuredMedia.preferredUrl;
    image.alt = featuredMedia.altText || featuredMedia.displayName || "Referenced image";
    stack.appendChild(image);
  }

  function appendMetaRow(documentObject, meta, labelText, valueText) {
    var label = documentObject.createElement("strong");
    label.textContent = labelText;
    var value = documentObject.createElement("span");
    value.textContent = valueText;
    meta.appendChild(label);
    meta.appendChild(value);
  }

  function createDocumentMeta(documentObject, contract) {
    var meta = documentObject.createElement("div");
    meta.className = "app-tester-kv";
    appendMetaRow(documentObject, meta, "Published snapshot URL", contract.documentUrl || "Not available");
    appendMetaRow(
      documentObject,
      meta,
      "Direct Firestore URL",
      contract.firestore && contract.firestore.documentUrl ? contract.firestore.documentUrl : "Not configured"
    );
    appendMetaRow(
      documentObject,
      meta,
      "Public app document API",
      contract.publicPublishedDocumentApiPath || "Not configured"
    );
    appendMetaRow(
      documentObject,
      meta,
      "Application API origin",
      contract.defaultApiOrigin || "Set by query parameter or local review fallback"
    );
    appendMetaRow(
      documentObject,
      meta,
      "Public comments API",
      contract.publicCommentsApiPath || "Not configured"
    );
    return meta;
  }

  function createLabeledInput(documentObject, labelText, value, multiline) {
    var label = documentObject.createElement("label");
    label.textContent = labelText;
    var input = multiline ? documentObject.createElement("textarea") : documentObject.createElement("input");
    if (!multiline) {
      input.type = "text";
    }
    input.value = value || "";
    label.appendChild(input);
    return {
      label: label,
      input: input
    };
  }

  function createActionButtons(documentObject, contract) {
    var actions = documentObject.createElement("div");
    actions.className = "app-tester-actions";

    var loadButton = documentObject.createElement("button");
    loadButton.textContent = "Load Published Snapshot";

    var firestoreButton = documentObject.createElement("button");
    firestoreButton.textContent = "Load Firestore Document Via App API";

    var installButton = documentObject.createElement("button");
    installButton.className = "alt";
    installButton.textContent = "Install Snapshot To IndexedDB";

    actions.appendChild(loadButton);
    actions.appendChild(firestoreButton);
    actions.appendChild(installButton);

    var apiOriginField = createLabeledInput(documentObject, "Application API Origin", "", false);
    apiOriginField.input.placeholder = "https://api.example.com";

    var commentFields = null;
    if (contract.actions && contract.actions.submitComment) {
      var commentGrid = documentObject.createElement("div");
      commentGrid.className = "app-tester-grid";

      var authorField = createLabeledInput(documentObject, "Comment Author", "Runtime Tester", false);
      var emailField = createLabeledInput(documentObject, "Comment Email", "tester@example.com", false);
      commentGrid.appendChild(authorField.label);
      commentGrid.appendChild(emailField.label);

      var bodyField = createLabeledInput(
        documentObject,
        "Comment Body",
        "Runtime tester submission from the temporary application layer.",
        true
      );

      var submitButton = documentObject.createElement("button");
      submitButton.className = "warn";
      submitButton.textContent = "Submit Comment Through App API";

      actions.appendChild(apiOriginField.label);
      actions.appendChild(commentGrid);
      actions.appendChild(bodyField.label);
      actions.appendChild(submitButton);

      commentFields = {
        authorInput: authorField.input,
        emailInput: emailField.input,
        bodyInput: bodyField.input,
        submitButton: submitButton
      };
    } else {
      actions.appendChild(apiOriginField.label);
    }

    return {
      actions: actions,
      apiOriginInput: apiOriginField.input,
      loadButton: loadButton,
      firestoreButton: firestoreButton,
      installButton: installButton,
      commentFields: commentFields
    };
  }

  function readApiOrigin(controls) {
    return normalizeApiOrigin(controls.apiOriginInput.value);
  }

  function readCommentPayload(controls) {
    if (!controls.commentFields) {
      return null;
    }
    return {
      parentCommentId: null,
      authorDisplayName: controls.commentFields.authorInput.value.trim(),
      authorEmail: controls.commentFields.emailInput.value.trim(),
      body: controls.commentFields.bodyInput.value.trim()
    };
  }

  function refreshActionAvailability(contract, controls) {
    var apiOrigin = readApiOrigin(controls);
    var hasPublicApi = Boolean(apiOrigin);

    if (!contract.firestoreQuery || !contract.publicPublishedDocumentApiPath) {
      controls.firestoreButton.disabled = true;
      controls.firestoreButton.title = "No Firestore application API contract is configured for this page.";
    } else if (!hasPublicApi) {
      controls.firestoreButton.disabled = true;
      controls.firestoreButton.title = "Set Application API Origin to enable Firestore reads through the public app API.";
    } else {
      controls.firestoreButton.disabled = false;
      controls.firestoreButton.title = "";
    }

    if (controls.commentFields && controls.commentFields.submitButton) {
      if (!contract.actions || !contract.actions.submitComment || !contract.publicCommentsApiPath) {
        controls.commentFields.submitButton.disabled = true;
        controls.commentFields.submitButton.title = "Comment submission is not available for this page.";
      } else if (!hasPublicApi) {
        controls.commentFields.submitButton.disabled = true;
        controls.commentFields.submitButton.title = "Set Application API Origin to enable comment submission.";
      } else {
        controls.commentFields.submitButton.disabled = false;
        controls.commentFields.submitButton.title = "";
      }
    }
  }

  window.__CRUD_PAGE_APPLICATION_TESTER_SUPPORT__ = {
    normalizeApplicationTesterContract,
    isTesterEnabled,
    readApiOriginFromQuery,
    ensureRuntimeAugment,
    setOutput,
    ensureStyles,
    appendBadgeRow,
    appendFeaturedMedia,
    createDocumentMeta,
    createActionButtons,
    readApiOrigin,
    readCommentPayload,
    refreshActionAvailability
  };
