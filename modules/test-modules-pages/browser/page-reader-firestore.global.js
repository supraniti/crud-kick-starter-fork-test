function hasFirebaseBrowserConfig(contract) {
  return Boolean(
    contract &&
      contract.firebase &&
      contract.firebase.apiKey &&
      contract.firebase.appId &&
      contract.firebase.projectId
  );
}

function normalizeFirebaseConfig(contract) {
  if (!hasFirebaseBrowserConfig(contract)) {
    return null;
  }
  return {
    apiKey: contract.firebase.apiKey,
    appId: contract.firebase.appId,
    projectId: contract.firebase.projectId,
    authDomain: contract.firebase.authDomain,
    storageBucket: contract.firebase.storageBucket,
    messagingSenderId: contract.firebase.messagingSenderId,
    measurementId: contract.firebase.measurementId
  };
}

async function loadFirebaseModules(targetGlobal) {
  if (targetGlobal.__CRUD_PAGE_APPLICATION_TESTER_FIREBASE_MODULES__) {
    return targetGlobal.__CRUD_PAGE_APPLICATION_TESTER_FIREBASE_MODULES__;
  }

  targetGlobal.__CRUD_PAGE_APPLICATION_TESTER_FIREBASE_MODULES__ = Promise.all([
    import("https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore-lite.js")
  ]).then(function (modules) {
    return {
      app: modules[0],
      firestore: modules[1]
    };
  });

  return targetGlobal.__CRUD_PAGE_APPLICATION_TESTER_FIREBASE_MODULES__;
}

async function resolveBrowserFirestoreContext(targetGlobal, contract) {
  var firebaseConfig = normalizeFirebaseConfig(contract);
  if (!firebaseConfig) {
    throw new Error("Firebase web app config is required for direct browser Firestore mode.");
  }

  var modules = await loadFirebaseModules(targetGlobal);
  var appName = "__crud-page-application-tester__" + firebaseConfig.projectId + "__" + firebaseConfig.appId;
  var appInstance =
    modules.app.getApps().find(function (entry) {
      return entry && entry.name === appName;
    }) || modules.app.initializeApp(firebaseConfig, appName);

  return {
    db: modules.firestore.getFirestore(appInstance),
    firestore: modules.firestore
  };
}

async function listBrowserFirestoreComments(targetGlobal, contract) {
  var context = await resolveBrowserFirestoreContext(targetGlobal, contract);
  var collectionReference = context.firestore.collection(
    context.db,
    contract.commentsCollectionPath || "publicComments"
  );
  var commentsQuery = context.firestore.query(
    collectionReference,
    context.firestore.where("postId", "==", contract.primaryRecord && contract.primaryRecord.id ? contract.primaryRecord.id : null)
  );
  var snapshot = await context.firestore.getDocs(commentsQuery);
  var allowedStatuses = ["approved"];
  var items = snapshot.docs
    .map(function (entry) {
      return {
        id: entry.id,
        ...entry.data()
      };
    })
    .filter(function (entry) {
      return allowedStatuses.includes(String(entry.status || "").trim().toLowerCase());
    })
    .sort(function (left, right) {
      return String(left.createdOn || left.createdAt || "").localeCompare(
        String(right.createdOn || right.createdAt || "")
      );
    });
  return {
    items: items,
    total: items.length
  };
}

function buildBrowserFirestoreRuntimeAugment(contract, targetGlobal) {
  var queries = [];
  if (contract.firestoreQuery && contract.firestore) {
    queries.push({
      resource: contract.firestoreQuery.resource,
      query: contract.firestoreQuery.query,
      policy: "remote-only",
      executeRemote: async function () {
        var context = await resolveBrowserFirestoreContext(targetGlobal, contract);
        var documentReference = context.firestore.doc(
          context.db,
          contract.firestore.collectionPath,
          contract.firestore.documentId
        );
        var snapshot = await context.firestore.getDoc(documentReference);
        if (!snapshot.exists()) {
          return null;
        }
        return {
          id: snapshot.id,
          ...snapshot.data()
        };
      }
    });
  }

  if (contract.actions && contract.actions.submitComment) {
    queries.push({
      resource: "comments",
      query: "byPost",
      policy: "network-first",
      dataset: "post-comments",
      executeRemote: async function () {
        return listBrowserFirestoreComments(targetGlobal, contract);
      }
    });
  }

  var actions = [];
  if (contract.actions && contract.actions.submitComment) {
    actions.push({
      action: "comments.submit",
      policy: "remote-with-local-update",
      markDatasetsDirty: ["post-comments"],
      executeRemote: async function (input) {
        var payload = input && input.request && input.request.payload ? input.request.payload : {};
        var context = await resolveBrowserFirestoreContext(targetGlobal, contract);
        var commentRecord = {
          postId: contract.primaryRecord && contract.primaryRecord.id ? contract.primaryRecord.id : null,
          pagePath: contract.pagePath || null,
          parentCommentId: payload.parentCommentId || null,
          authorDisplayName: payload.authorDisplayName || null,
          authorEmail: payload.authorEmail || null,
          body: payload.body || null,
          status: "pending",
          source: "browser-firestore",
          createdAt: new Date().toISOString()
        };
        var collectionReference = context.firestore.collection(
          context.db,
          contract.commentsCollectionPath || "publicComments"
        );
        var createdReference = await context.firestore.addDoc(collectionReference, commentRecord);
        return {
          id: createdReference.id,
          ...commentRecord
        };
      }
    });
  }

  return {
    queries: queries,
    actions: actions,
    datasets: [
      {
        dataset: "post-comments",
        recordMode: "array",
        fetchInstall: async function () {
          var result = await listBrowserFirestoreComments(targetGlobal, contract);
          return {
            items: result.items,
            version: new Date().toISOString(),
            syncToken: contract.primaryRecord && contract.primaryRecord.id ? contract.primaryRecord.id : null
          };
        },
        fetchSync: async function () {
          var result = await listBrowserFirestoreComments(targetGlobal, contract);
          return {
            items: result.items,
            version: new Date().toISOString(),
            syncToken: contract.primaryRecord && contract.primaryRecord.id ? contract.primaryRecord.id : null
          };
        }
      }
    ]
  };
}

window.__CRUD_PAGE_APPLICATION_TESTER_FIRESTORE__ = {
  hasFirebaseBrowserConfig: hasFirebaseBrowserConfig,
  buildBrowserFirestoreRuntimeAugment: buildBrowserFirestoreRuntimeAugment
};
