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
    order: 100
  },
  {
    id: "test-modules-remote-ops",
    kind: "module",
    label: "Remotes",
    icon: "cloud_sync",
    order: 110
  },
  {
    id: "domains",
    kind: "synthetic",
    dependencyModuleId: "test-modules-remote-ops",
    label: "Domains",
    icon: "public",
    order: 120
  },
  {
    id: "test-modules-media-manager",
    kind: "module",
    label: "Media",
    icon: "perm_media",
    order: 130
  },
  {
    id: "test-modules-taxonomy",
    kind: "module",
    label: "Taxonomies",
    icon: "account_tree",
    order: 140
  },
  {
    id: "test-modules-content",
    kind: "module",
    label: "Posts",
    icon: "article",
    order: 150
  },
  {
    id: "test-modules-editorial",
    kind: "module",
    label: "Authors",
    icon: "group",
    order: 160
  },
  {
    id: "test-modules-engagement",
    kind: "module",
    label: "Comments",
    icon: "forum",
    order: 170
  },
  {
    id: "test-modules-layouts",
    kind: "module",
    label: "Layouts",
    icon: "dashboard_customize",
    order: 180
  },
  {
    id: "test-modules-pages",
    kind: "module",
    label: "Pages",
    icon: "web",
    order: 190
  },
  {
    id: "deployments",
    kind: "synthetic",
    dependencyModuleId: "test-modules-pages",
    label: "Deployments",
    icon: "rocket_launch",
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
