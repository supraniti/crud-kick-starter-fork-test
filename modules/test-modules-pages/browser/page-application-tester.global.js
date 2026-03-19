function getSupport(globalObject) {
  var support = globalObject.__CRUD_PAGE_APPLICATION_TESTER_SUPPORT__;
  if (!support) {
    throw new Error("page-application-tester support script is missing");
  }
  return support;
}

async function runSnapshotRead(globalObject, contract, controls) {
  var support = getSupport(globalObject);
  await support.ensureRuntimeAugment(globalObject, contract, support.readApiOrigin(controls));
  var remoteQuery = contract.remoteQuery || {};
  var result = await globalObject.dataLayer.query({
    resource: remoteQuery.resource,
    query: remoteQuery.query
  });
  support.setOutput(controls.output, {
    flow: "published-document-snapshot-read",
    documentUrl: contract.documentUrl || null,
    result: result
  });
}

async function runFirestoreRead(globalObject, contract, controls) {
  var support = getSupport(globalObject);
  var apiOrigin = support.readApiOrigin(controls);
  if (contract.publicApiMode !== "browser-firestore" && !apiOrigin) {
    throw new Error("Application API Origin is required for Firestore reads through the public app API.");
  }
  await support.ensureRuntimeAugment(globalObject, contract, apiOrigin);
  var firestoreQuery = contract.firestoreQuery || {};
  var result = await globalObject.dataLayer.query({
    resource: firestoreQuery.resource,
    query: firestoreQuery.query
  });
  support.setOutput(controls.output, {
    flow: contract.publicApiMode === "browser-firestore" ? "browser-firestore-read" : "public-app-firestore-read",
    apiOrigin: apiOrigin || null,
    directFirestoreUrl: contract.firestore && contract.firestore.documentUrl ? contract.firestore.documentUrl : null,
    result: result
  });
}

async function runInstall(globalObject, contract, controls) {
  var support = getSupport(globalObject);
  await support.ensureRuntimeAugment(globalObject, contract, support.readApiOrigin(controls));
  var installAction = contract.actions && contract.actions.install;
  if (installAction) {
    await globalObject.actionLayer.dispatch({
      action: installAction
    });
  }
  var status = await globalObject.dataLayer.getDatasetStatus(contract.dataset);
  var localQuery = contract.localQuery || {};
  var localResult = await globalObject.dataLayer.query({
    resource: localQuery.resource,
    query: localQuery.query
  });
  support.setOutput(controls.output, {
    flow: "indexeddb-install-and-local-query",
    datasetStatus: status,
    localResult: localResult
  });
}

async function runCommentSubmit(globalObject, contract, controls) {
  var support = getSupport(globalObject);
  var apiOrigin = support.readApiOrigin(controls);
  if (contract.publicApiMode !== "browser-firestore" && !apiOrigin) {
    throw new Error("Application API Origin is required for comment submission.");
  }
  var payload = support.readCommentPayload(controls);
  if (!payload || !payload.authorDisplayName || !payload.body) {
    throw new Error("Comment author and body are required.");
  }
  await support.ensureRuntimeAugment(globalObject, contract, apiOrigin);
  var result = await globalObject.actionLayer.dispatch({
    action: contract.actions.submitComment,
    payload: payload
  });
  support.setOutput(controls.output, {
    flow: contract.publicApiMode === "browser-firestore" ? "browser-firestore-comment-submit" : "public-app-comment-submit",
    apiOrigin: apiOrigin || null,
    result: result
  });
}

function bindActions(globalObject, contract, controls) {
  var support = getSupport(globalObject);
  controls.apiOriginInput.addEventListener("input", function () {
    support.refreshActionAvailability(contract, controls);
  });

  controls.loadButton.addEventListener("click", async function () {
    controls.loadButton.disabled = true;
    try {
      await runSnapshotRead(globalObject, contract, controls);
    } catch (error) {
      support.setOutput(controls.output, {
        ok: false,
        flow: "published-document-snapshot-read",
        error: error && error.message ? error.message : String(error)
      });
    } finally {
      controls.loadButton.disabled = false;
      support.refreshActionAvailability(contract, controls);
    }
  });

  controls.firestoreButton.addEventListener("click", async function () {
    controls.firestoreButton.disabled = true;
    try {
      await runFirestoreRead(globalObject, contract, controls);
    } catch (error) {
      support.setOutput(controls.output, {
        ok: false,
        flow: contract.publicApiMode === "browser-firestore" ? "browser-firestore-read" : "public-app-firestore-read",
        error: error && error.message ? error.message : String(error)
      });
    } finally {
      support.refreshActionAvailability(contract, controls);
    }
  });

  controls.installButton.addEventListener("click", async function () {
    controls.installButton.disabled = true;
    try {
      await runInstall(globalObject, contract, controls);
    } catch (error) {
      support.setOutput(controls.output, {
        ok: false,
        flow: "indexeddb-install-and-local-query",
        error: error && error.message ? error.message : String(error)
      });
    } finally {
      controls.installButton.disabled = false;
      support.refreshActionAvailability(contract, controls);
    }
  });

  if (controls.commentFields && controls.commentFields.submitButton) {
    controls.commentFields.submitButton.addEventListener("click", async function () {
      controls.commentFields.submitButton.disabled = true;
      try {
        await runCommentSubmit(globalObject, contract, controls);
      } catch (error) {
        support.setOutput(controls.output, {
          ok: false,
          flow:
            contract.publicApiMode === "browser-firestore"
              ? "browser-firestore-comment-submit"
              : "public-app-comment-submit",
          error: error && error.message ? error.message : String(error)
        });
      } finally {
        support.refreshActionAvailability(contract, controls);
      }
    });
  }

  support.refreshActionAvailability(contract, controls);
}

function renderPanel(globalObject, contract) {
  var support = getSupport(globalObject);
  var documentObject = globalObject.document;
  support.ensureStyles(documentObject);

  var panel = documentObject.createElement("aside");
  panel.id = "page-application-tester";
  var stack = documentObject.createElement("div");
  stack.className = "app-tester-stack";

  var title = documentObject.createElement("h2");
  title.textContent = "Application Tester";
  stack.appendChild(title);

  var intro = documentObject.createElement("p");
  intro.textContent =
    "Temporary application layer on top of client-runtime. It exercises the published snapshot, IndexedDB install, and remote Firestore interaction either directly from the browser or through a bounded public API, depending on the delivery configuration.";
  stack.appendChild(intro);

  support.appendBadgeRow(documentObject, stack, contract);
  support.appendFeaturedMedia(documentObject, stack, contract);
  stack.appendChild(support.createDocumentMeta(documentObject, contract));

  var buttonGroup = support.createActionButtons(documentObject, contract);
  buttonGroup.apiOriginInput.value = support.readApiOriginFromQuery(globalObject, contract);
  stack.appendChild(buttonGroup.actions);

  var output = documentObject.createElement("pre");
  output.textContent = "Awaiting action...";
  stack.appendChild(output);
  panel.appendChild(stack);
  documentObject.body.appendChild(panel);

  bindActions(globalObject, contract, {
    apiOriginInput: buttonGroup.apiOriginInput,
    loadButton: buttonGroup.loadButton,
    firestoreButton: buttonGroup.firestoreButton,
    installButton: buttonGroup.installButton,
    commentFields: buttonGroup.commentFields,
    output: output
  });
}

async function bootApplicationTester(globalObject, contract) {
  try {
    var support = getSupport(globalObject);
    var normalizedContract = support.normalizeApplicationTesterContract(contract, globalObject);
    await support.ensureRuntimeAugment(
      globalObject,
      normalizedContract,
      support.readApiOriginFromQuery(globalObject, normalizedContract)
    );
    renderPanel(globalObject, normalizedContract);
  } catch (error) {
    if (globalObject.console && globalObject.console.error) {
      globalObject.console.error(error);
    }
  }
}

(function (globalObject) {
  var support = globalObject.__CRUD_PAGE_APPLICATION_TESTER_SUPPORT__;
  var contract = globalObject.__CRUD_PAGE_APPLICATION_TESTER__;
  if (!support || !support.isTesterEnabled(contract, globalObject)) {
    return;
  }
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        bootApplicationTester(globalObject, contract);
      },
      { once: true }
    );
    return;
  }
  bootApplicationTester(globalObject, contract);
})(window);
