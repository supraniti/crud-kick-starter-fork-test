import {
  createReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../../frontend/src/api/reference.js";

export const MODULE_ID = "test-modules-remote-ops";
export const CONNECTIONS_COLLECTION_ID = "remote-connection-profiles";
export const TARGETS_COLLECTION_ID = "remote-target-profiles";
export const RUNS_COLLECTION_ID = "remote-operation-runs";

function toArray(items) {
  return Array.isArray(items) ? items : [];
}

const SUPPORT_COLLECTION_PAGE_SIZE = 200;
const SUPPORT_COLLECTION_MAX_PAGES = 20;

async function requestModuleAction(path, options = {}) {
  const method = options.method ?? "POST";
  const body = options.body;
  const response = await fetch(path, {
    method,
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Remote operation failed");
  }
  return payload;
}

export function createEmptyConnectionDraft() {
  return {
    profileName: "",
    provider: "gcp",
    environmentLabel: "dev",
    authMode: "service-account-key",
    credentialPathHint: "",
    serviceAccountEmail: "",
    serviceAccountKeyId: "",
    projectId: "",
    projectNumber: "",
    projectDisplayName: "",
    operatorEmail: "",
    region: "europe-west1",
    credentialLabel: "",
    connectionStatus: "draft",
    lastConnectedOn: null,
    lastValidatedOn: null,
    validationSummary: {
      state: "unknown",
      message: null,
      checkedItems: [],
      warnings: [],
      canProceed: false
    }
  };
}

export function createPendingConnectionValidationSummary(message = null) {
  return {
    state: "unknown",
    message,
    checkedItems: [],
    warnings: [],
    canProceed: false
  };
}

export function createEmptyTargetDraft() {
  return {
    title: "",
    productBindingKey: "",
    connectionProfileId: "",
    targetKind: "firestore-projection",
    adapterMode: "simulated-gcp",
    config: {
      projectionScope: "published-blog-posts",
      firestoreCollectionPath: "publishedPosts",
      bucketName: "",
      prefix: "",
      localRootHint: "",
      accessMode: "gcp-temporary",
      stackMode: "direct-storage",
      dnsMode: "external",
      hostname: "",
      dnsZone: "",
      certificateName: "",
      urlMapHint: "",
      deploymentTargetProfileId: "",
      mediaTargetProfileId: ""
    },
    policy: {
      allowDeletes: false,
      allowRestore: true,
      requireDryRunFirst: true
    },
    targetStatus: "draft",
    lastValidatedOn: null,
    lastComparedOn: null,
    validationSummary: {
      state: "unknown",
      message: null,
      checkedItems: [],
      warnings: [],
      canProceed: false
    },
    compareSummary: {
      state: "unknown",
      message: null,
      createCount: 0,
      updateCount: 0,
      deleteCount: 0,
      localOnlyCount: 0,
      remoteOnlyCount: 0,
      sampleKeys: []
    }
  };
}

export function createWorkspaceActionState() {
  return {
    saving: false,
    processing: false,
    errorMessage: null,
    successMessage: null
  };
}

export function createTargetConfigForKind(targetKind) {
  if (targetKind === "firestore-projection") {
    return {
      ...createEmptyTargetDraft().config,
      projectionScope: "published-blog-posts",
      firestoreCollectionPath: "publishedPosts"
    };
  }
  if (targetKind === "deployment-storage") {
    return {
      ...createEmptyTargetDraft().config,
      bucketName: "",
      localRootHint: "deployment",
      prefix: "site"
    };
  }
  if (targetKind === "media-storage") {
    return {
      ...createEmptyTargetDraft().config,
      bucketName: "",
      localRootHint: "media",
      prefix: "library"
    };
  }
  return {
    ...createEmptyTargetDraft().config,
    accessMode: "gcp-temporary",
    stackMode: "direct-storage",
    dnsMode: "external",
    hostname: "",
    dnsZone: "",
    certificateName: "",
    urlMapHint: "",
    deploymentTargetProfileId: "",
    mediaTargetProfileId: "",
    localRootHint: "deployment"
  };
}

async function fetchAllReferenceCollectionItems(collectionId, limit = SUPPORT_COLLECTION_PAGE_SIZE) {
  const items = [];
  let offset = 0;

  for (let pageIndex = 0; pageIndex < SUPPORT_COLLECTION_MAX_PAGES; pageIndex += 1) {
    const payload = await fetchReferenceCollectionItems({
      collectionId,
      limit,
      offset
    });
    const pageItems = toArray(payload?.items);
    items.push(...pageItems);

    const total = Number(payload?.meta?.total);
    if (pageItems.length === 0) {
      break;
    }
    offset += pageItems.length;
    if (Number.isFinite(total) && offset >= total) {
      break;
    }
    if (pageItems.length < limit) {
      break;
    }
  }

  return items;
}

export async function loadRemoteOpsSupportData() {
  const [connectionsPayload, targetsPayload, runs] = await Promise.all([
    fetchReferenceCollectionItems({ collectionId: CONNECTIONS_COLLECTION_ID, limit: SUPPORT_COLLECTION_PAGE_SIZE }),
    fetchReferenceCollectionItems({ collectionId: TARGETS_COLLECTION_ID, limit: SUPPORT_COLLECTION_PAGE_SIZE }),
    fetchAllReferenceCollectionItems(RUNS_COLLECTION_ID)
  ]);

  return {
    connections: toArray(connectionsPayload?.items),
    targets: toArray(targetsPayload?.items),
    runs
  };
}

export async function persistConnectionProfile({ connectionId, draft }) {
  const payload = {
    profileName: draft.profileName,
    provider: "gcp",
    credentialPathHint: draft.credentialPathHint || null,
    serviceAccountEmail: draft.serviceAccountEmail || null,
    serviceAccountKeyId: draft.serviceAccountKeyId || null,
    environmentLabel: draft.environmentLabel || null,
    authMode: draft.authMode,
    projectId: draft.projectId || null,
    projectNumber: draft.projectNumber || null,
    projectDisplayName: draft.projectDisplayName || null,
    operatorEmail: draft.operatorEmail || null,
    region: draft.region || null,
    credentialLabel: draft.credentialLabel || null,
    connectionStatus: draft.connectionStatus,
    lastConnectedOn: draft.lastConnectedOn || null,
    lastValidatedOn: draft.lastValidatedOn || null,
    validationSummary: draft.validationSummary
  };
  return connectionId
    ? updateReferenceCollectionItem({
        collectionId: CONNECTIONS_COLLECTION_ID,
        itemId: connectionId,
        item: payload
      })
    : createReferenceCollectionItem({
        collectionId: CONNECTIONS_COLLECTION_ID,
        item: payload
      });
}

export async function persistTargetProfile({ targetId, draft }) {
  const payload = {
    title: draft.title,
    productBindingKey: draft.productBindingKey || null,
    connectionProfileId: draft.connectionProfileId,
    targetKind: draft.targetKind,
    adapterMode: draft.adapterMode,
    config: draft.config,
    policy: draft.policy,
    targetStatus: draft.targetStatus,
    lastValidatedOn: draft.lastValidatedOn || null,
    lastComparedOn: draft.lastComparedOn || null,
    validationSummary: draft.validationSummary,
    compareSummary: draft.compareSummary
  };
  return targetId
    ? updateReferenceCollectionItem({
        collectionId: TARGETS_COLLECTION_ID,
        itemId: targetId,
        item: payload
      })
    : createReferenceCollectionItem({
        collectionId: TARGETS_COLLECTION_ID,
        item: payload
      });
}

export async function connectConnection(connectionId, credentialPath) {
  return requestModuleAction(`/api/reference/modules/${MODULE_ID}/connections/${connectionId}/connect`, {
    body: {
      credentialPath
    }
  });
}

export async function importConnectionCredentialFile(connectionId, fileName, fileContent) {
  return requestModuleAction(
    `/api/reference/modules/${MODULE_ID}/connections/${connectionId}/import-key-file`,
    {
      body: {
        fileName,
        fileContent
      }
    }
  );
}

export async function simulateConnectionConnect(connectionId) {
  return requestModuleAction(`/api/reference/modules/${MODULE_ID}/connections/${connectionId}/simulate-connect`);
}

export async function validateConnection(connectionId) {
  return requestModuleAction(`/api/reference/modules/${MODULE_ID}/connections/${connectionId}/validate`);
}

export async function loadConnectionBillingOverview(connectionId) {
  return requestModuleAction(
    `/api/reference/modules/${MODULE_ID}/connections/${connectionId}/billing-overview`,
    {
      method: "GET"
    }
  );
}

export async function analyzeConnectionCompatibility(connectionId) {
  return requestModuleAction(
    `/api/reference/modules/${MODULE_ID}/connections/${connectionId}/analyze-compatibility`
  );
}

export async function provisionConnectionCompatibility(connectionId, confirmedSafeguardIds, actionIds = null) {
  return requestModuleAction(
    `/api/reference/modules/${MODULE_ID}/connections/${connectionId}/provision-missing`,
    {
      body: {
        confirmedSafeguardIds,
        actionIds
      }
    }
  );
}

export async function validateTarget(targetId) {
  return requestModuleAction(`/api/reference/modules/${MODULE_ID}/targets/${targetId}/validate`);
}

export async function compareTarget(targetId) {
  return requestModuleAction(`/api/reference/modules/${MODULE_ID}/targets/${targetId}/compare`);
}

export async function executeTarget(targetId) {
  return requestModuleAction(`/api/reference/modules/${MODULE_ID}/targets/${targetId}/execute`);
}

export async function restoreTarget(targetId) {
  return requestModuleAction(`/api/reference/modules/${MODULE_ID}/targets/${targetId}/restore`);
}

export async function seedTargetRemoteExtra(targetId) {
  return requestModuleAction(`/api/reference/modules/${MODULE_ID}/targets/${targetId}/seed-remote-extra`);
}
