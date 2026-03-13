export function createConnectionItem(overrides = {}) {
  return {
    id: "conn-001",
    profileName: "Primary GCP Dev",
    provider: "gcp",
    environmentLabel: "dev",
    authMode: "service-account-key",
    credentialPathHint: "C:/keys/demo-service-account.json",
    serviceAccountEmail: null,
    serviceAccountKeyId: null,
    projectId: "",
    projectNumber: "",
    projectDisplayName: "",
    operatorEmail: "operator@example.com",
    region: "me-west1",
    credentialLabel: null,
    connectionStatus: "draft",
    lastConnectedOn: null,
    lastValidatedOn: null,
    validationSummary: {
      state: "unknown",
      message: null,
      checkedItems: [],
      warnings: [],
      canProceed: false
    },
    ...overrides
  };
}

export function createTargetItem(overrides = {}) {
  return {
    id: "target-001",
    title: "Posts Projection",
    connectionProfileId: "conn-001",
    targetKind: "firestore-projection",
    adapterMode: "simulated-gcp",
    config: {
      projectionScope: "published-blog-posts",
      firestoreCollectionPath: "content/posts",
      bucketName: null,
      prefix: null,
      localRootHint: null,
      accessMode: "gcp-temporary",
      stackMode: "direct-storage",
      dnsMode: "external",
      hostname: null,
      dnsZone: null,
      certificateName: null,
      urlMapHint: null
    },
    policy: {
      allowDeletes: false,
      allowRestore: true,
      requireDryRunFirst: true
    },
    targetStatus: "validated",
    lastValidatedOn: "2026-03-11T10:05:00.000Z",
    lastComparedOn: "2026-03-11T10:06:00.000Z",
    validationSummary: {
      state: "validated",
      message: "Target validated",
      checkedItems: ["connection state", "target config", "simulated remote root"],
      warnings: [],
      canProceed: true
    },
    compareSummary: {
      state: "drift",
      message: "1 create, 0 update, 0 delete",
      createCount: 1,
      updateCount: 0,
      deleteCount: 0,
      localOnlyCount: 1,
      remoteOnlyCount: 0,
      sampleKeys: ["content/posts/launch-story.json"]
    },
    ...overrides
  };
}

export function createRunItem(overrides = {}) {
  return {
    id: "run-001",
    title: "Compare Posts Projection",
    connectionProfileId: "conn-001",
    targetProfileId: "target-001",
    procedureType: "compare",
    scopeKind: "firestore-projection",
    direction: "compare",
    dryRun: true,
    status: "warning",
    message: "1 create, 0 update, 0 delete",
    summary: {
      createCount: 1,
      updateCount: 0,
      deleteCount: 0,
      restoredCount: 0,
      sampleKeys: ["content/posts/launch-story.json"],
      warnings: []
    },
    startedOn: "2026-03-11T10:06:00.000Z",
    finishedOn: "2026-03-11T10:06:00.000Z",
    ...overrides
  };
}

export function createJsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}
