(function (window) {
  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
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

  function mergeByKey(baseValues, augmentValues, readKey) {
    var merged = [];
    var positions = new Map();

    function upsert(entry) {
      if (!entry) {
        return;
      }
      var key = readKey(entry);
      if (!key) {
        merged.push(entry);
        return;
      }
      if (positions.has(key)) {
        merged[positions.get(key)] = entry;
        return;
      }
      positions.set(key, merged.length);
      merged.push(entry);
    }

    normalizeArray(baseValues).forEach(upsert);
    normalizeArray(augmentValues).forEach(upsert);
    return merged;
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
      bootstrapDatasets: Array.from(
        new Set([
          ...normalizeArray(base.bootstrapDatasets),
          ...normalizeArray(augment.bootstrapDatasets)
        ])
      ),
      queries: mergeByKey(
        base.queries,
        augment.queries,
        function (entry) {
          return entry && entry.resource && entry.query ? entry.resource + "." + entry.query : "";
        }
      ),
      actions: mergeByKey(
        base.actions,
        augment.actions,
        function (entry) {
          return entry && entry.action ? entry.action : "";
        }
      ),
      datasets: mergeByKey(
        base.datasets,
        augment.datasets,
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

  function normalizeApiOrigin(value) {
    if (typeof value !== "string") {
      return "";
    }
    return value.trim().replace(/\/+$/g, "");
  }

  function isTruthyQueryParamValue(rawValue) {
    if (!rawValue) {
      return false;
    }
    var normalized = String(rawValue).trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }

  function readFlagFromQuery(targetGlobal, names) {
    var params = new URLSearchParams(targetGlobal.location.search);
    return normalizeArray(names).some(function (name) {
      return isTruthyQueryParamValue(params.get(name));
    });
  }

  function isReviewEnabled(contract, targetGlobal) {
    return readFlagFromQuery(targetGlobal, contract && contract.reviewQueryParams);
  }

  function isDebugEnabled(contract, targetGlobal) {
    return readFlagFromQuery(targetGlobal, contract && contract.debugQueryParams);
  }

  function resolveFirestoreSupport(targetGlobal) {
    return targetGlobal.__CRUD_PAGE_APPLICATION_TESTER_FIRESTORE__ || null;
  }

  function hasFirebaseBrowserConfig(targetGlobal, contract) {
    var support = resolveFirestoreSupport(targetGlobal);
    return Boolean(
      support &&
        typeof support.hasFirebaseBrowserConfig === "function" &&
        support.hasFirebaseBrowserConfig(contract)
    );
  }

  function readApiOriginFromQuery(targetGlobal, contract) {
    if (contract && contract.publicApiMode === "browser-firestore") {
      return "";
    }
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

  function stripApplicationDefinitions(config) {
    var source = config && typeof config === "object" ? cloneJsonValue(config) : {};
    source.queries = normalizeArray(source.queries).filter(function (entry) {
      if (!entry) {
        return false;
      }
      return !(entry.resource === "comments" && entry.query === "byPost");
    });
    source.actions = normalizeArray(source.actions).filter(function (entry) {
      if (!entry) {
        return false;
      }
      return entry.action !== "comments.submit";
    });
    source.datasets = normalizeArray(source.datasets).filter(function (entry) {
      return entry && entry.dataset !== "post-comments";
    });
    return source;
  }

  function buildCommentsCollectionRemote(path) {
    return {
      method: "GET",
      path: path,
      queryParams: {
        postId: "params.postId",
        status: "params.status"
      }
    };
  }

  function buildPublicCommentsRuntimeAugment(contract, apiOrigin) {
    var normalizedOrigin = normalizeApiOrigin(apiOrigin);
    if (!normalizedOrigin || !contract || !contract.publicCommentsApiPath) {
      return {};
    }

    var commentsPath = normalizedOrigin + contract.publicCommentsApiPath;
    return {
      queries: [
        {
          resource: "comments",
          query: "byPost",
          policy: "network-first",
          dataset: "post-comments",
          remote: buildCommentsCollectionRemote(commentsPath),
          remoteResult: {
            type: "collection",
            itemsPath: "items",
            totalPath: "items.length"
          }
        }
      ],
      actions: [
        {
          action: "comments.submit",
          policy: "remote-with-local-update",
          markDatasetsDirty: ["post-comments"],
          remote: {
            method: "POST",
            path: commentsPath,
            body: {
              postId: "payload.postId",
              pagePath: "payload.pagePath",
              parentCommentId: "payload.parentCommentId",
              authorDisplayName: "payload.authorDisplayName",
              authorEmail: "payload.authorEmail",
              body: "payload.body"
            }
          }
        }
      ],
      datasets: [
        {
          dataset: "post-comments",
          recordMode: "array",
          remoteInstall: buildCommentsCollectionRemote(commentsPath),
          remoteSync: buildCommentsCollectionRemote(commentsPath),
          remoteValuePath: "items",
          remoteVersionPath: "timestamp",
          remoteSyncTokenPath: "postId"
        }
      ]
    };
  }

  async function ensureRuntimeAugment(targetGlobal, contract, apiOrigin) {
    var runtimeReady = await waitForRuntime(targetGlobal, 3000);
    if (!runtimeReady) {
      throw new Error("client-runtime is not available on this page");
    }

    var baseConfig = stripApplicationDefinitions(targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__ || {});
    var firestoreSupport = resolveFirestoreSupport(targetGlobal);
    var transportAugment =
      contract && contract.publicApiMode === "browser-firestore"
        ? firestoreSupport &&
          typeof firestoreSupport.buildBrowserFirestoreRuntimeAugment === "function"
          ? firestoreSupport.buildBrowserFirestoreRuntimeAugment(contract, targetGlobal)
          : {}
        : buildPublicCommentsRuntimeAugment(contract, apiOrigin);
    var mergedConfig = mergeRuntimeConfig(
      mergeRuntimeConfig(baseConfig, contract && contract.runtimeAugment ? contract.runtimeAugment : {}),
      transportAugment
    );

    targetGlobal.__CRUD_CLIENT_RUNTIME_CONFIG__ = mergedConfig;
    targetGlobal.crudClientRuntime.configure(mergedConfig);
    if (targetGlobal.crudClientRuntime.ready && typeof targetGlobal.crudClientRuntime.ready.then === "function") {
      await targetGlobal.crudClientRuntime.ready;
    }
    return mergedConfig;
  }

  function normalizeCommentCollectionResult(value) {
    if (Array.isArray(value)) {
      return {
        items: value,
        total: value.length
      };
    }
    if (value && typeof value === "object" && Array.isArray(value.items)) {
      return {
        items: value.items,
        total: Number.isFinite(Number(value.total)) ? Number(value.total) : value.items.length
      };
    }
    return {
      items: [],
      total: 0
    };
  }

  function formatDateTime(value) {
    if (!value) {
      return "";
    }
    try {
      return new Date(value).toLocaleString();
    } catch {
      return String(value);
    }
  }

  function setJsonOutput(node, value) {
    if (!node) {
      return;
    }
    node.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }

  window.__CRUD_PAGE_APPLICATION_TESTER_SUPPORT__ = {
    normalizeApplicationTesterContract: normalizeApplicationTesterContract,
    isReviewEnabled: isReviewEnabled,
    isDebugEnabled: isDebugEnabled,
    readApiOriginFromQuery: readApiOriginFromQuery,
    ensureRuntimeAugment: ensureRuntimeAugment,
    hasFirebaseBrowserConfig: hasFirebaseBrowserConfig,
    normalizeCommentCollectionResult: normalizeCommentCollectionResult,
    formatDateTime: formatDateTime,
    setJsonOutput: setJsonOutput
  };
})(window);
