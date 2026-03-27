import { afterEach, test, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppShellLayout } from "../../app/parts/04-app-shell-layout.jsx";
import {
  buildProductNavigationItems,
  resolveProductRouteGuide
} from "../../app/product-shell/product-shell-catalog.js";

vi.mock("../../app/product-shell/useGlobalDeploymentCommandCenter.js", () => ({
  useGlobalDeploymentCommandCenter: () => ({
    state: { loading: false, errorMessage: null },
    bundleOptions: [],
    bundleSyncState: { canSyncAny: false, entries: [], byBundleId: new Map() },
    runState: { open: false, processing: false, bundleResults: [], completedCount: 0, totalCount: 0, progressPercent: 0, errorMessage: null, guidance: "", successMessage: null, mode: "", activeBundleTitle: "" },
    reload: vi.fn(),
    closeRunState: vi.fn(),
    openRunState: vi.fn(),
    runSyncAll: vi.fn(),
    runSyncBundle: vi.fn()
  })
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function createNorthStarModules() {
  return [
    { id: "test-modules-remote-ops", label: "Remote Ops", icon: "cloud_sync", state: "enabled" },
    { id: "test-modules-media-manager", label: "Media Manager", icon: "perm_media", state: "enabled" },
    { id: "test-modules-taxonomy", label: "Taxonomy", icon: "account_tree", state: "enabled" },
    { id: "test-modules-content", label: "Blog Content", icon: "article", state: "enabled" },
    { id: "test-modules-editorial", label: "Editorial", icon: "group", state: "enabled" },
    { id: "test-modules-engagement", label: "Engagement", icon: "forum", state: "enabled" },
    { id: "test-modules-layouts", label: "Layouts", icon: "dashboard_customize", state: "enabled" },
    { id: "test-modules-pages", label: "Pages", icon: "web", state: "enabled" }
  ];
}

test("app shell layout groups north-star workflow stages and exposes next-step guidance", () => {
  const moduleState = {
    loading: false,
    errorMessage: null,
    items: buildProductNavigationItems(createNorthStarModules())
  };
  const handleSelectModule = vi.fn();

  render(
    <AppShellLayout
      moduleState={moduleState}
      route={{ moduleId: "test-modules-content" }}
      activeRouteGuide={resolveProductRouteGuide(moduleState.items, "test-modules-content")}
      handleSelectModule={handleSelectModule}
      routeUrl="/app/posts"
      connectivityMode="connected"
      runConnectivityCheck={() => {}}
      handleSignOut={() => {}}
      viewActions={[]}
      handleRunViewAction={() => {}}
      requiredDomains={new Set()}
      remotesDeployDomain={{
        deployState: { deploy: {}, latestJob: null, starting: false },
        remotesState: { items: [] },
        selectedRemoteId: "",
        setSelectedRemoteId: () => {},
        handleDeployNow: () => {},
        moduleRuntimeState: { items: [] },
        handleRunModuleAction: () => {}
      }}
      activeViewRegistration={{}}
      runtimeSettingsOpen={false}
      handleOpenRuntimeSettings={() => {}}
      handleCloseRuntimeSettings={() => {}}
      handleOpenRemotes={() => {}}
      developerModeEnabled={false}
      activeModuleView={<div>Posts Surface</div>}
    />
  );

  expect(screen.getByText("Workflow")).toBeInTheDocument();
  expect(screen.getByText("Setup")).toBeInTheDocument();
  expect(screen.getByText("Content")).toBeInTheDocument();
  expect(screen.getByText("Presentation")).toBeInTheDocument();
  expect(screen.getByText("Release")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Sync/i })).toBeInTheDocument();
  expect(
    screen.getByText(
      /Posts: Create and revise posts with their media, taxonomy, and author references in one authoring flow\./i
    )
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Next: Layouts" }));

  expect(handleSelectModule).toHaveBeenCalledWith("test-modules-layouts");
});

test("layouts route keeps the workflow sidebar when immersive mode is not explicitly requested", () => {
  const moduleState = {
    loading: false,
    errorMessage: null,
    items: buildProductNavigationItems(createNorthStarModules())
  };

  render(
    <AppShellLayout
      moduleState={moduleState}
      route={{ moduleId: "test-modules-layouts" }}
      activeRouteGuide={resolveProductRouteGuide(moduleState.items, "test-modules-layouts")}
      handleSelectModule={() => {}}
      routeUrl="/app/layouts?layoutId=pagelayo-003"
      connectivityMode="connected"
      runConnectivityCheck={() => {}}
      handleSignOut={() => {}}
      viewActions={[]}
      handleRunViewAction={() => {}}
      requiredDomains={new Set()}
      remotesDeployDomain={{
        deployState: { deploy: {}, latestJob: null, starting: false },
        remotesState: { items: [] },
        selectedRemoteId: "",
        setSelectedRemoteId: () => {},
        handleDeployNow: () => {},
        moduleRuntimeState: { items: [] },
        handleRunModuleAction: () => {}
      }}
      activeViewRegistration={{}}
      runtimeSettingsOpen={false}
      handleOpenRuntimeSettings={() => {}}
      handleCloseRuntimeSettings={() => {}}
      handleOpenRemotes={() => {}}
      developerModeEnabled={false}
      activeModuleView={<div>Layouts Surface</div>}
    />
  );

  expect(screen.getByText("Workflow")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Layouts" })).toBeInTheDocument();
  expect(screen.getByText("Layouts Surface")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Sync/i })).toBeInTheDocument();
});
