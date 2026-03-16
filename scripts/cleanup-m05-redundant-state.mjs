const DEFAULT_BASE_URL = "http://127.0.0.1:3001";

const PRESERVED_IDS = {
  "remote-connection-profiles": new Set(["remoteco-012"]),
  "remote-target-profiles": new Set([
    "remoteta-003",
    "remoteta-016",
    "remoteta-017",
    "remoteta-018",
    "remoteta-019",
    "remoteta-020"
  ]),
  "blog-pages": new Set(["blogpage-013", "blogpage-014"]),
  "media-items": new Set([
    "mdi-005",
    "mdi-006",
    "mdi-007",
    "mdi-008",
    "mdi-009",
    "mdi-010",
    "mdi-011",
    "mdi-012",
    "mdi-013",
    "mdi-014"
  ]),
  "page-deployment-bundles": new Set(["pagedepl-001", "pagedepl-002"]),
  "page-deployment-bundle-runs": new Set(["pagedepl-001", "pagedepl-002"])
};

const PRESERVED_PAGE_IDS = PRESERVED_IDS["blog-pages"];
const TARGET_DELETE_PRIORITY = {
  "browser-delivery": 0,
  "deployment-storage": 1,
  "media-storage": 2,
  "firestore-projection": 3
};

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    baseUrl:
      argv.find((value) => value.startsWith("--base-url="))?.slice("--base-url=".length) ??
      DEFAULT_BASE_URL
  };
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json"
    }
  });
  const payload = await response.json();
  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

async function fetchCollectionItems(baseUrl, collectionId) {
  const result = await requestJson(
    baseUrl,
    `/api/reference/collections/${collectionId}/items?limit=500`
  );
  if (!result.ok || result.payload?.ok !== true) {
    throw new Error(
      `Failed to read collection '${collectionId}' (${result.status})`
    );
  }
  return Array.isArray(result.payload.items) ? result.payload.items : [];
}

function getDeleteCandidates(collectionId, items) {
  if (collectionId === "page-deployment-artifacts") {
    return items
      .filter((item) => !PRESERVED_PAGE_IDS.has(item.pageId))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  const preserved = PRESERVED_IDS[collectionId];
  if (!preserved) {
    return [];
  }

  const candidates = items.filter((item) => !preserved.has(item.id));
  if (collectionId === "remote-target-profiles") {
    return candidates.sort((left, right) => {
      const leftPriority = TARGET_DELETE_PRIORITY[left.targetKind] ?? 99;
      const rightPriority = TARGET_DELETE_PRIORITY[right.targetKind] ?? 99;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return left.id.localeCompare(right.id);
    });
  }

  if (collectionId === "media-items") {
    return candidates.sort((left, right) => {
      const leftPriority = left.isDerived ? 0 : 1;
      const rightPriority = right.isDerived ? 0 : 1;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return left.id.localeCompare(right.id);
    });
  }

  return candidates.sort((left, right) => left.id.localeCompare(right.id));
}

async function deleteCollectionItem(baseUrl, collectionId, itemId) {
  if (collectionId === "media-items") {
    const result = await requestJson(
      baseUrl,
      `/api/reference/modules/test-modules-media-manager/media-items/${itemId}`,
      {
        method: "DELETE"
      }
    );

    if (!result.ok || result.payload?.ok !== true) {
      const errorMessage =
        result.payload?.error?.message ?? `Delete failed with status ${result.status}`;
      throw new Error(`media-items/${itemId}: ${errorMessage}`);
    }

    return result.payload;
  }

  const result = await requestJson(
    baseUrl,
    `/api/reference/collections/${collectionId}/items/${itemId}`,
    {
      method: "DELETE"
    }
  );

  if (!result.ok || result.payload?.ok !== true) {
    const errorMessage =
      result.payload?.error?.message ?? `Delete failed with status ${result.status}`;
    throw new Error(
      `${collectionId}/${itemId}: ${errorMessage}`
    );
  }

  return result.payload;
}

function printPlanEntry(collectionId, item) {
  const label =
    item.title ??
    item.profileName ??
    item.displayName ??
    item.resolvedPath ??
    item.id;
  console.log(`- ${collectionId}/${item.id} :: ${label}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const collections = [
    "page-deployment-artifacts",
    "blog-pages",
    "media-items",
    "remote-target-profiles",
    "remote-connection-profiles",
    "page-deployment-bundle-runs",
    "page-deployment-bundles"
  ];

  console.log(
    `M05 redundant-state cleanup (${args.apply ? "apply" : "dry-run"}) against ${args.baseUrl}`
  );

  const plan = [];

  for (const collectionId of collections) {
    const items = await fetchCollectionItems(args.baseUrl, collectionId);
    const candidates = getDeleteCandidates(collectionId, items);
    if (candidates.length === 0) {
      console.log(`Collection ${collectionId}: nothing to remove`);
      continue;
    }
    console.log(`Collection ${collectionId}: ${candidates.length} candidate(s)`);
    for (const candidate of candidates) {
      printPlanEntry(collectionId, candidate);
      plan.push({
        collectionId,
        itemId: candidate.id
      });
    }
  }

  if (!args.apply) {
    console.log(
      `Dry run complete. ${plan.length} delete operation(s) would be executed.`
    );
    return;
  }

  let deletedCount = 0;
  for (const entry of plan) {
    await deleteCollectionItem(args.baseUrl, entry.collectionId, entry.itemId);
    deletedCount += 1;
    console.log(`Deleted ${entry.collectionId}/${entry.itemId}`);
  }

  console.log(`Cleanup complete. Deleted ${deletedCount} record(s).`);
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
