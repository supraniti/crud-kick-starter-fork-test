import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ProductDomainsView } from "../../app/product-shell/ProductDomainsView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createConnectionItem,
  createTargetItem
} from "./remote-ops-test-helpers.js";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    fetchReferenceCollectionItems: vi.fn()
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("product domains desk shows public origin, temporary URLs, and linked service paths", async () => {
  const connectionItems = [
    createConnectionItem({
      projectId: "demo-project",
      connectionStatus: "validated",
      lastConnectedOn: "2026-03-11T10:00:00.000Z",
      lastValidatedOn: "2026-03-11T10:01:00.000Z"
    })
  ];
  const targetItems = [
    createTargetItem({
      id: "target-deployment-001",
      title: "HTML Deployment",
      productBindingKey: "deployment-storage",
      targetKind: "deployment-storage",
      adapterMode: "live-gcp",
      config: {
        ...createTargetItem().config,
        firestoreCollectionPath: null,
        bucketName: "content.example.com",
        prefix: "",
        localRootHint: "deployment"
      }
    }),
    createTargetItem({
      id: "target-media-001",
      title: "Media Library",
      productBindingKey: "media-storage",
      targetKind: "media-storage",
      adapterMode: "live-gcp",
      config: {
        ...createTargetItem().config,
        firestoreCollectionPath: null,
        bucketName: "demo-project-dev-media-1234567890",
        prefix: "library",
        localRootHint: "media"
      }
    }),
    createTargetItem({
      id: "target-browser-001",
      title: "Primary Domain",
      productBindingKey: "browser-delivery",
      targetKind: "browser-delivery",
      adapterMode: "live-gcp",
      config: {
        ...createTargetItem().config,
        firestoreCollectionPath: null,
        bucketName: null,
        accessMode: "custom-domain",
        stackMode: "https-load-balancer",
        dnsMode: "external",
        hostname: "content.example.com",
        deploymentTargetProfileId: "target-deployment-001",
        mediaTargetProfileId: "target-media-001"
      }
    })
  ];

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "remote-connection-profiles") {
      return { items: connectionItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-target-profiles") {
      return { items: targetItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-operation-runs") {
      return { items: [] };
    }
    return { items: [] };
  });

  render(<ProductDomainsView />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Browser Delivery Desk" })).toBeInTheDocument();
    expect(screen.getByText("Current Delivery View")).toBeInTheDocument();
    expect(screen.getByText("Public origin: https://content.example.com")).toBeInTheDocument();
    expect(screen.getByText("Example page URL: https://content.example.com/posts/example-post")).toBeInTheDocument();
    expect(screen.getByText("Public media base: https://content.example.com/library")).toBeInTheDocument();
    expect(screen.getByText("Temporary media base: https://storage.googleapis.com/demo-project-dev-media-1234567890/library")).toBeInTheDocument();
    expect(screen.getByText("HTML Service")).toBeInTheDocument();
    expect(screen.getByText("Media Service")).toBeInTheDocument();
  });
}, 15000);
