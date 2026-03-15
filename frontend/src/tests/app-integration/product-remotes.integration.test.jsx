import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ProductRemotesView } from "../../app/product-shell/ProductRemotesView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createConnectionItem,
  createRunItem,
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

function createManagedTargets(connectionId) {
  return [
    createTargetItem({
      id: "target-posts-001",
      connectionProfileId: connectionId,
      productBindingKey: "posts-projection",
      title: "Posts Projection"
    }),
    createTargetItem({
      id: "target-categories-001",
      connectionProfileId: connectionId,
      productBindingKey: "categories-projection",
      title: "Categories Projection",
      config: {
        ...createTargetItem().config,
        projectionScope: "public-blog-categories",
        firestoreCollectionPath: "publicCategories"
      }
    }),
    createTargetItem({
      id: "target-tags-001",
      connectionProfileId: connectionId,
      productBindingKey: "tags-projection",
      title: "Tags Projection",
      config: {
        ...createTargetItem().config,
        projectionScope: "public-blog-tags",
        firestoreCollectionPath: "publicTags"
      }
    }),
    createTargetItem({
      id: "target-deployment-001",
      connectionProfileId: connectionId,
      productBindingKey: "deployment-storage",
      title: "HTML Deployment",
      targetKind: "deployment-storage",
      config: {
        ...createTargetItem().config,
        projectionScope: null,
        firestoreCollectionPath: null,
        bucketName: "demo-site-html",
        prefix: "site"
      }
    }),
    createTargetItem({
      id: "target-media-001",
      connectionProfileId: connectionId,
      productBindingKey: "media-storage",
      title: "Media Library",
      targetKind: "media-storage",
      config: {
        ...createTargetItem().config,
        projectionScope: null,
        firestoreCollectionPath: null,
        bucketName: "demo-site-media",
        prefix: "library"
      }
    }),
    createTargetItem({
      id: "target-browser-001",
      connectionProfileId: connectionId,
      productBindingKey: "browser-delivery",
      title: "Primary Domain",
      targetKind: "browser-delivery",
      config: {
        ...createTargetItem().config,
        projectionScope: null,
        firestoreCollectionPath: null,
        bucketName: null,
        hostname: "content.example.com",
        accessMode: "custom-domain",
        stackMode: "https-load-balancer",
        dnsMode: "external"
      }
    })
  ];
}

test("product remotes desk stays on the managed connection workflow instead of the raw targets surface", async () => {
  const connectionItems = [
    createConnectionItem({
      id: "conn-001",
      profileName: "Backup Remote",
      projectId: "backup-project",
      connectionStatus: "draft"
    }),
    createConnectionItem({
      id: "conn-002",
      profileName: "Primary GCP Dev",
      serviceAccountEmail: "merchant-guild@appspot.gserviceaccount.com",
      serviceAccountKeyId: "key-002",
      projectId: "merchant-guild",
      projectDisplayName: "Merchant Guild",
      connectionStatus: "validated",
      lastConnectedOn: "2026-03-15T09:00:00.000Z",
      lastValidatedOn: "2026-03-15T09:05:00.000Z",
      validationSummary: {
        state: "validated",
        message: "Connection validated.",
        checkedItems: ["service account", "project access"],
        warnings: [],
        canProceed: true
      }
    })
  ];

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "remote-connection-profiles") {
      return { items: connectionItems.map((item) => ({ ...item })) };
    }
    if (collectionId === "remote-target-profiles") {
      return { items: createManagedTargets("conn-002") };
    }
    if (collectionId === "remote-operation-runs") {
      return {
        items: [
          createRunItem({
            id: "run-remote-001",
            connectionProfileId: "conn-002",
            targetProfileId: "target-posts-001",
            title: "Validate Posts Projection",
            procedureType: "validate",
            status: "success",
            message: "Target validated."
          })
        ]
      };
    }
    return { items: [] };
  });

  render(<ProductRemotesView route={{ connectionId: "conn-002" }} />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Remote Control Desk" })).toBeInTheDocument();
    expect(screen.getByText("Selected Remote")).toBeInTheDocument();
    expect(screen.getByText("Managed Service Setup")).toBeInTheDocument();
    expect(screen.getByText("1. Connection")).toBeInTheDocument();
    expect(screen.getByText("2. Project Access")).toBeInTheDocument();
    expect(screen.getByText("3. Firestore Projections")).toBeInTheDocument();
    expect(screen.getByText("4. Media Storage")).toBeInTheDocument();
    expect(screen.getByText("5. HTML Deployment")).toBeInTheDocument();
    expect(screen.getByText("6. Browser Delivery")).toBeInTheDocument();
    expect(screen.getByText("Recent Remote Runs")).toBeInTheDocument();
  });

  expect(screen.queryByRole("tab", { name: "Targets" })).not.toBeInTheDocument();
  expect(screen.getAllByText("Service account: merchant-guild@appspot.gserviceaccount.com").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Project: Merchant Guild").length).toBeGreaterThan(0);
  expect(screen.getByText("Managed services: 6/6")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Analyze Compatibility" })).toBeInTheDocument();
  expect(screen.getByText("Validate Posts Projection")).toBeInTheDocument();
  expect(screen.queryByLabelText("Operator Email")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Region")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Credential Label")).not.toBeInTheDocument();
  expect(screen.queryByText("Managed Product Targets")).not.toBeInTheDocument();
  expect(screen.queryByText("Compatibility Report")).not.toBeInTheDocument();
  expect(screen.queryByText("Provision Missing Resources")).not.toBeInTheDocument();
  expect(screen.queryByText(/Lower-level target editing still lives in the module runtime/i)).not.toBeInTheDocument();
}, 15000);
