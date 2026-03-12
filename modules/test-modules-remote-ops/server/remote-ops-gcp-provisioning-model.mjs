function buildPermissionGroup(id, label, permissions, guidance) {
  return {
    id,
    label,
    permissions,
    guidance
  };
}

function buildCostWarning(id, level, message) {
  return {
    id,
    level,
    message
  };
}

function buildProvisioningAction(id, label, phaseStatus, createSupported, notes = []) {
  return {
    id,
    label,
    phaseStatus,
    createSupported,
    notes
  };
}

function buildFirestoreProjectionBundle() {
  return {
    id: "firestore-projection",
    label: "Firestore Projection",
    targetKinds: ["firestore-projection"],
    requiredApis: ["firestore.googleapis.com"],
    provisionableResources: [
      buildProvisioningAction(
        "firestore-default-database",
        "Default Firestore database",
        "execution-started",
        true,
        [
          "Only one default Firestore database should exist for the project.",
          "Collection paths remain target-owned; the database itself is project-wide."
        ]
      )
    ],
    permissionGroups: [
      buildPermissionGroup(
        "firestore-inspect",
        "Inspect Firestore readiness",
        ["serviceusage.services.get", "resourcemanager.projects.get", "datastore.databases.get"],
        "Needed to confirm the API is enabled and the default database exists."
      ),
      buildPermissionGroup(
        "firestore-provision",
        "Create missing Firestore database",
        ["serviceusage.services.enable", "datastore.databases.create"],
        "Needed only when the project does not yet have the default Firestore database."
      ),
      buildPermissionGroup(
        "firestore-sync",
        "Sync projection documents",
        ["datastore.entities.create", "datastore.entities.update", "datastore.entities.delete"],
        "Needed for compare/execute against the configured projection collection path."
      )
    ],
    costWarnings: [
      buildCostWarning(
        "firestore-create-db",
        "warning",
        "Creating a Firestore database is a project-level decision and starts ongoing storage/read/write costs."
      ),
      buildCostWarning(
        "firestore-sync-writes",
        "info",
        "Large projection syncs may incur significant document write counts."
      )
    ]
  };
}

function buildStorageBundle({
  id,
  label,
  targetKind,
  inspectGroupId,
  provisionGroupId,
  syncGroupId,
  provisionLabel,
  provisionNotes,
  costWarnings
}) {
  return {
    id,
    label,
    targetKinds: [targetKind],
    requiredApis: ["storage.googleapis.com"],
    provisionableResources: [
      buildProvisioningAction(provisionGroupId.replace("-provision", ""), provisionLabel, "execution-started", true, provisionNotes)
    ],
    permissionGroups: [
      buildPermissionGroup(
        inspectGroupId,
        `Inspect ${label.toLowerCase()} readiness`,
        ["serviceusage.services.get", "storage.buckets.get", "storage.objects.list"],
        `Needed to validate the bucket and compare remote ${id === "deployment-storage" ? "objects" : "media objects"}.`
      ),
      buildPermissionGroup(
        provisionGroupId,
        `Create ${label.toLowerCase()} bucket`,
        ["serviceusage.services.enable", "storage.buckets.create"],
        `Needed only when the configured ${label.toLowerCase()} bucket does not exist.`
      ),
      buildPermissionGroup(
        syncGroupId,
        `Sync ${label.toLowerCase()} objects`,
        ["storage.objects.create", "storage.objects.get", "storage.objects.delete"],
        "Needed for upload/update/delete and bounded restore flows."
      )
    ],
    costWarnings
  };
}

function buildDeploymentStorageBundle() {
  return buildStorageBundle({
    id: "deployment-storage",
    label: "Deployment Storage",
    targetKind: "deployment-storage",
    inspectGroupId: "storage-inspect",
    provisionGroupId: "storage-provision",
    syncGroupId: "storage-sync",
    provisionLabel: "Deployment bucket",
    provisionNotes: [
      "The bucket should mirror the local deployment artifact tree.",
      "The app should only maintain objects under the configured prefix."
    ],
    costWarnings: [
      buildCostWarning(
        "storage-bucket",
        "warning",
        "Creating a new bucket introduces storage, network egress, and possible CDN-related costs."
      ),
      buildCostWarning(
        "storage-delete",
        "warning",
        "Remote delete policies should be operator-confirmed because object removal can immediately affect published delivery."
      )
    ]
  });
}

function buildMediaStorageBundle() {
  return buildStorageBundle({
    id: "media-storage",
    label: "Media Storage",
    targetKind: "media-storage",
    inspectGroupId: "media-inspect",
    provisionGroupId: "media-provision",
    syncGroupId: "media-sync",
    provisionLabel: "Media bucket",
    provisionNotes: [
      "The bucket should hold only the configured media prefix.",
      "Media lifecycle and deployment lifecycle must remain independently configurable."
    ],
    costWarnings: [
      buildCostWarning(
        "media-storage-growth",
        "warning",
        "Large media libraries can create sustained storage costs and bandwidth costs."
      )
    ]
  });
}

function buildBrowserDeliveryBundle() {
  return {
    id: "browser-delivery",
    label: "Browser Delivery",
    targetKinds: ["browser-delivery"],
    requiredApis: ["dns.googleapis.com", "certificatemanager.googleapis.com", "compute.googleapis.com"],
    provisionableResources: [
      buildProvisioningAction("dns-zone", "Cloud DNS managed zone", "planned", true, [
        "Requires a real domain strategy and operator confirmation."
      ]),
      buildProvisioningAction("managed-certificate", "Certificate Manager certificate", "planned", true, [
        "Domain ownership and DNS readiness must be satisfied first."
      ]),
      buildProvisioningAction("load-balancer-stack", "External load balancer and CDN delivery stack", "planned", true, [
        "This is part of the supported target model but not yet implemented in runtime procedures."
      ])
    ],
    permissionGroups: [
      buildPermissionGroup(
        "browser-delivery-inspect",
        "Inspect browser delivery readiness",
        [
          "serviceusage.services.get",
          "dns.managedZones.get",
          "certificatemanager.certs.get",
          "compute.backendBuckets.get",
          "compute.urlMaps.get"
        ],
        "Needed to inspect the existing delivery stack."
      ),
      buildPermissionGroup(
        "browser-delivery-provision",
        "Create browser delivery resources",
        [
          "serviceusage.services.enable",
          "dns.managedZones.create",
          "certificatemanager.certs.create",
          "compute.backendBuckets.create",
          "compute.urlMaps.create",
          "compute.targetHttpProxies.create",
          "compute.targetHttpsProxies.create",
          "compute.globalForwardingRules.create"
        ],
        "Needed to create the browser-delivery stack for supported domains."
      )
    ],
    costWarnings: [
      buildCostWarning(
        "browser-delivery-stack",
        "warning",
        "Creating DNS, certificate, load balancer, and CDN resources can introduce ongoing infrastructure charges."
      )
    ]
  };
}

function buildSafeguardRules() {
  return [
    {
      id: "cost-confirmation",
      label: "Cost Confirmation",
      description:
        "Any provisioning or wide sync action with potential recurring cost must require explicit operator confirmation."
    },
    {
      id: "singleton-hygiene",
      label: "Singleton Hygiene",
      description:
        "Project-wide singleton resources such as the default Firestore database must never be double-created."
    },
    {
      id: "minimum-footprint",
      label: "Minimum Footprint",
      description:
        "Provisioning and cleanup must only maintain resources required for the supported flows and configured targets."
    }
  ];
}

export function buildGcpProvisioningModel() {
  return {
    provider: "gcp",
    modelVersion: 1,
    operatingMode: "operator-controlled-procedures",
    authentication: {
      primaryMode: "service-account-key",
      storageRule: "credential-path-reference-only",
      rawCredentialStorageAllowed: false
    },
    compatibilityGoal:
      "Understand existing remote state, detect missing resources and permissions, create the missing GCP services/resources needed for supported flows, and keep only the minimum required remote footprint.",
    procedureStages: [
      "inventory",
      "compatibility-analysis",
      "permission-diagnostics",
      "cost-warnings",
      "provision-missing-resources",
      "sync-and-verify"
    ],
    compatibilityBundles: [
      buildFirestoreProjectionBundle(),
      buildDeploymentStorageBundle(),
      buildMediaStorageBundle(),
      buildBrowserDeliveryBundle()
    ],
    safeguardRules: buildSafeguardRules()
  };
}
