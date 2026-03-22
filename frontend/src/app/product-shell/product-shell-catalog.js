const NORTH_STAR_MODULE_SET = new Set([
  "test-modules-editorial",
  "test-modules-taxonomy",
  "test-modules-content",
  "test-modules-engagement",
  "test-modules-pages",
  "test-modules-layouts",
  "test-modules-media-manager",
  "test-modules-remote-ops"
]);

const PRODUCT_NAVIGATION_SPECS = Object.freeze([
  {
    id: "system-settings",
    kind: "synthetic",
    label: "System Settings",
    icon: "settings",
    stageId: "setup",
    stageLabel: "Setup",
    purpose: "Adjust advanced defaults after the main remote and domain flow is already in place.",
    nextRouteId: "test-modules-remote-ops",
    order: 100
  },
  {
    id: "test-modules-remote-ops",
    kind: "module",
    label: "Remotes",
    icon: "cloud_sync",
    stageId: "setup",
    stageLabel: "Setup",
    purpose: "Connect the provider, validate access, and prepare the managed remote services used by the CMS.",
    nextRouteId: "domains",
    order: 110
  },
  {
    id: "domains",
    kind: "synthetic",
    dependencyModuleId: "test-modules-remote-ops",
    label: "Domains",
    icon: "public",
    stageId: "setup",
    stageLabel: "Setup",
    purpose: "Choose public delivery mode and bind the current release to either a real hostname or temporary remote URLs.",
    nextRouteId: "test-modules-media-manager",
    order: 120
  },
  {
    id: "test-modules-media-manager",
    kind: "module",
    label: "Media",
    icon: "perm_media",
    stageId: "content",
    stageLabel: "Content",
    purpose: "Upload and curate media assets, then keep remote sync posture visible while authoring.",
    nextRouteId: "test-modules-taxonomy",
    order: 130
  },
  {
    id: "test-modules-taxonomy",
    kind: "module",
    label: "Taxonomies",
    icon: "account_tree",
    stageId: "content",
    stageLabel: "Content",
    purpose: "Manage categories and tags as shared content structure before pages and releases depend on them.",
    nextRouteId: "test-modules-editorial",
    order: 140
  },
  {
    id: "test-modules-content",
    kind: "module",
    label: "Posts",
    icon: "article",
    stageId: "content",
    stageLabel: "Content",
    purpose: "Create and revise posts with their media, taxonomy, and author references in one authoring flow.",
    nextRouteId: "test-modules-layouts",
    order: 150
  },
  {
    id: "test-modules-editorial",
    kind: "module",
    label: "Authors",
    icon: "group",
    stageId: "content",
    stageLabel: "Content",
    purpose: "Maintain the author roster and keep post readiness blockers visible from the editorial side.",
    nextRouteId: "test-modules-content",
    order: 160
  },
  {
    id: "test-modules-engagement",
    kind: "module",
    label: "Comments",
    icon: "forum",
    stageId: "content",
    stageLabel: "Content",
    purpose: "Moderate comment intake and keep public discussion aligned with the published content set.",
    nextRouteId: "deployments",
    order: 170
  },
  {
    id: "test-modules-layouts",
    kind: "module",
    label: "Layouts",
    icon: "dashboard_customize",
    stageId: "presentation",
    stageLabel: "Presentation",
    purpose: "Define reusable visual structure that pages can bind to posts, categories, and future content types.",
    nextRouteId: "test-modules-pages",
    order: 180
  },
  {
    id: "test-modules-pages",
    kind: "module",
    label: "Pages",
    icon: "web",
    stageId: "presentation",
    stageLabel: "Presentation",
    purpose: "Turn content into deployable HTML by defining standalone pages and per-record page templates.",
    nextRouteId: "deployments",
    order: 190
  },
  {
    id: "deployments",
    kind: "synthetic",
    dependencyModuleId: "test-modules-pages",
    label: "Deployments",
    icon: "rocket_launch",
    stageId: "release",
    stageLabel: "Release",
    purpose: "Choose the bundle, understand what will change, run one release, and open what went live.",
    order: 200
  }
]);

function hasNorthStarSurface(moduleItems = []) {
  const moduleIds = new Set((moduleItems ?? []).map((item) => item?.id).filter(Boolean));
  let matched = 0;
  for (const moduleId of NORTH_STAR_MODULE_SET) {
    if (moduleIds.has(moduleId)) {
      matched += 1;
    }
  }
  return matched >= 4;
}

function createSyntheticRouteAvailability(dependencyModule = null) {
  const state =
    typeof dependencyModule?.state === "string" && dependencyModule.state.length > 0
      ? dependencyModule.state
      : "enabled";
  const routeAvailable =
    dependencyModule?.routeAvailability &&
    typeof dependencyModule.routeAvailability === "object"
      ? dependencyModule.routeAvailability.routeAvailable !== false
      : state === "enabled";

  return {
    policy: "synthetic-product-route",
    visible: true,
    routeAvailable,
    state
  };
}

function toProductModuleItem(moduleItem, spec) {
  return {
    ...moduleItem,
    label: spec.label,
    icon: spec.icon,
    productStageId: spec.stageId ?? "",
    productStageLabel: spec.stageLabel ?? "",
    productPurpose: spec.purpose ?? "",
    nextRouteId: spec.nextRouteId ?? "",
    order: spec.order
  };
}

function toSyntheticProductItem(spec, dependencyModule) {
  const routeAvailability = createSyntheticRouteAvailability(dependencyModule);
  return {
    id: spec.id,
    label: spec.label,
    icon: spec.icon,
    state: routeAvailability.state,
    routeAvailability,
    productStageId: spec.stageId ?? "",
    productStageLabel: spec.stageLabel ?? "",
    productPurpose: spec.purpose ?? "",
    nextRouteId: spec.nextRouteId ?? "",
    order: spec.order
  };
}

function sortNavigationItems(items = []) {
  return [...items].sort(
    (left, right) =>
      Number(left?.order ?? Number.MAX_SAFE_INTEGER) - Number(right?.order ?? Number.MAX_SAFE_INTEGER) ||
      `${left?.label ?? ""}`.localeCompare(`${right?.label ?? ""}`)
  );
}

export function buildProductNavigationItems(moduleItems = []) {
  if (!hasNorthStarSurface(moduleItems)) {
    return moduleItems;
  }

  const moduleMap = new Map(moduleItems.map((item) => [item.id, item]));
  const items = [];

  for (const spec of PRODUCT_NAVIGATION_SPECS) {
    if (spec.kind === "module") {
      const moduleItem = moduleMap.get(spec.id);
      if (!moduleItem) {
        continue;
      }
      items.push(toProductModuleItem(moduleItem, spec));
      continue;
    }

    const dependencyModule = spec.dependencyModuleId
      ? moduleMap.get(spec.dependencyModuleId) ?? null
      : null;
    items.push(toSyntheticProductItem(spec, dependencyModule));
  }

  return sortNavigationItems(items).map(({ order, ...item }) => item);
}

export function resolveProductRouteGuide(moduleItems = [], moduleId = "") {
  const activeModuleId = typeof moduleId === "string" ? moduleId : "";
  if (!activeModuleId) {
    return null;
  }

  const items = buildProductNavigationItems(moduleItems);
  const activeItem = items.find((item) => item.id === activeModuleId) ?? null;
  if (!activeItem) {
    return null;
  }

  const nextRouteId =
    typeof activeItem.nextRouteId === "string" && activeItem.nextRouteId.length > 0
      ? activeItem.nextRouteId
      : "";
  const nextItem = nextRouteId ? items.find((item) => item.id === nextRouteId) ?? null : null;

  return {
    moduleId: activeItem.id,
    title: activeItem.label ?? activeItem.id,
    stageId: activeItem.productStageId ?? "",
    stageLabel: activeItem.productStageLabel ?? "",
    purpose: activeItem.productPurpose ?? "",
    nextRouteId,
    nextRouteLabel: nextItem?.label ?? ""
  };
}
