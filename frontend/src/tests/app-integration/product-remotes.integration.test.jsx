import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductRemotesView } from "../../app/product-shell/ProductRemotesView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createConnectionItem,
  createJsonResponse,
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
  vi.unstubAllGlobals();
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
    expect(screen.getByRole("heading", { name: "Remote Readiness Desk" })).toBeInTheDocument();
    expect(screen.getByText("Active Remote")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Readiness Board", selected: true })).toBeInTheDocument();
    expect(screen.getByText("1. Connection")).toBeInTheDocument();
    expect(screen.getByText("2. Remote Access")).toBeInTheDocument();
    expect(screen.getByText("3. Published Data")).toBeInTheDocument();
    expect(screen.getByText("4. Media Library")).toBeInTheDocument();
    expect(screen.getByText("5. Public HTML")).toBeInTheDocument();
    expect(screen.getByText("6. Public Delivery")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Recent Activity" }));

  await waitFor(() => {
    expect(screen.getByRole("tab", { name: "Recent Activity", selected: true })).toBeInTheDocument();
    expect(screen.getByText("Validate Posts Projection")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Readiness Board" }));

  expect(screen.queryByRole("tab", { name: "Targets" })).not.toBeInTheDocument();
  expect(screen.getAllByText("Service account: merchant-guild@appspot.gserviceaccount.com").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Project: Merchant Guild").length).toBeGreaterThan(0);
  expect(screen.getByText("Prepared pieces: 6/6")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Analyze Readiness" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Operator Email")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Region")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Credential Label")).not.toBeInTheDocument();
  expect(screen.queryByText("Managed Product Targets")).not.toBeInTheDocument();
  expect(screen.queryByText("Compatibility Report")).not.toBeInTheDocument();
  expect(screen.queryByText("Provision Missing Resources")).not.toBeInTheDocument();
  expect(screen.queryByText(/Lower-level target editing still lives in the module runtime/i)).not.toBeInTheDocument();
}, 15000);

test("product remotes desk opens directly in connection details for key re-import guidance", async () => {
  const connectionItems = [
    createConnectionItem({
      id: "conn-002",
      profileName: "Primary GCP Dev",
      serviceAccountEmail: "merchant-guild@appspot.gserviceaccount.com",
      serviceAccountKeyId: "key-002",
      projectId: "merchant-guild",
      projectDisplayName: "Merchant Guild",
      connectionStatus: "validated",
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
      return { items: [] };
    }
    return { items: [] };
  });

  render(
    <ProductRemotesView
      route={{ connectionId: "conn-002", tab: "connection", focus: "key-import" }}
    />
  );

  await waitFor(() => {
    expect(screen.getByText(/This remote needs the service-account key re-imported here/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Connection", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose JSON Key File" })).toBeInTheDocument();
  });
}, 15000);

test("product remotes desk loads GCP billing linkage and visible budgets on the billing tab", async () => {
  const connectionItems = [
    createConnectionItem({
      id: "conn-002",
      profileName: "Primary GCP Dev",
      serviceAccountEmail: "merchant-guild@appspot.gserviceaccount.com",
      projectId: "merchant-guild",
      projectNumber: "679134333951",
      projectDisplayName: "Merchant Guild",
      connectionStatus: "validated",
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
      return { items: [] };
    }
    return { items: [] };
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      if (String(url).includes("/connections/conn-002/billing-overview")) {
        return createJsonResponse(200, {
          ok: true,
          message: "Loaded GCP billing overview.",
          report: {
            provider: "gcp",
            billingInfo: {
              state: "enabled",
              billingEnabled: true,
              billingAccountId: "ABCDEF-123456-7890AB",
              billingAccountDisplayName: "Merchant Guild Billing",
              billingAccountOpen: true,
              summary: "Billing is enabled and linked to 'Merchant Guild Billing'."
            },
            permissions: {
              project: [
                { permission: "billing.resourceAssociations.get", label: "Project billing linkage", granted: true },
                { permission: "billing.resourceCosts.get", label: "Project cost trend visibility", granted: false, guidance: "Grant cost visibility." },
                { permission: "billing.resourcebudgets.read", label: "Project budget visibility", granted: true }
              ],
              summaries: {
                canReadProjectCosts: false,
                canReadProjectBudgets: true
              }
            },
            budgets: {
              state: "loaded",
              visibleCount: 1,
              projectScopedCount: 1,
              accountScopedCount: 0,
              forecastRuleCount: 1,
              summary: "1 visible budget, 1 forecast rule.",
              items: [
                {
                  name: "billingAccounts/ABCDEF-123456-7890AB/budgets/primary",
                  displayName: "Primary Monthly Budget",
                  amount: {
                    label: "$150.00",
                    mode: "specified"
                  },
                  period: "MONTH",
                  scope: "project",
                  projects: ["projects/merchant-guild"],
                  hasForecastRule: true,
                  thresholds: [
                    { spendBasis: "CURRENT_SPEND", thresholdPercent: 0.5 },
                    { spendBasis: "FORECASTED_SPEND", thresholdPercent: 1 }
                  ]
                }
              ]
            },
            guidance: [
              {
                level: "info",
                message: "Project cost trend visibility is not granted. Budget visibility can still work without cost trend permissions."
              }
            ],
            consoleLinks: {
              projectBilling: "https://console.cloud.google.com/billing/ABCDEF-123456-7890AB?project=merchant-guild",
              projectBudgets: "https://console.cloud.google.com/billing/ABCDEF-123456-7890AB/budgets?project=merchant-guild"
            }
          }
        });
      }
      return createJsonResponse(404, {
        ok: false,
        error: {
          message: "not found"
        }
      });
    })
  );

  render(<ProductRemotesView route={{ connectionId: "conn-002" }} />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Remote Readiness Desk" })).toBeInTheDocument();
    expect(screen.getAllByText("Service account: merchant-guild@appspot.gserviceaccount.com").length).toBeGreaterThan(0);
    expect(screen.getByText("Prepared pieces: 6/6")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Billing & Usage" }));
  fireEvent.click(screen.getByRole("button", { name: "Load Billing" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Billing & Usage" })).toBeInTheDocument();
    expect(screen.getAllByText(/Merchant Guild Billing/).length).toBeGreaterThan(0);
    expect(screen.getByText("Primary Monthly Budget")).toBeInTheDocument();
    expect(screen.getByText("Forecast 100%")).toBeInTheDocument();
    expect(screen.getByText("Project cost trend visibility: missing")).toBeInTheDocument();
  });
}, 15000);
