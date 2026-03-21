const DESK_MAP = Object.freeze([
  {
    id: "system-settings",
    label: "System Settings",
    route: "/app/system-settings",
    stage: "Setup",
    purpose: "Advanced defaults and shared product bindings after the main remote/domain setup is already in place.",
    productSurface: "frontend/src/app/product-shell/ProductSystemSettingsView.jsx",
    moduleOwner: "Synthetic product route backed by module settings and product-shell workspace state.",
    changeHere: [
      "default bindings and advanced product-level switches",
      "setup copy and guardrails that should not live inside content desks"
    ],
    proofs: [
      "frontend/src/tests/app-integration/product-system-settings.integration.test.jsx"
    ]
  },
  {
    id: "remotes",
    label: "Remotes",
    route: "/app/remotes",
    stage: "Setup",
    purpose: "Connect the provider, validate access, inspect readiness, and prepare managed remote services.",
    productSurface: "frontend/src/app/product-shell/ProductRemotesView.jsx",
    moduleOwner: "modules/test-modules-remote-ops",
    changeHere: [
      "connection setup, validation, billing, and managed service readiness",
      "remote target forms and compatibility/provisioning flows"
    ],
    proofs: [
      "frontend/src/tests/app-integration/product-remotes.integration.test.jsx",
      "server/test/module-conformance/remote-ops.module-conformance.test.js"
    ]
  },
  {
    id: "domains",
    label: "Domains",
    route: "/app/domains",
    stage: "Setup",
    purpose: "Bind release output to either a real hostname or a temporary public delivery mode.",
    productSurface: "frontend/src/app/product-shell/ProductDomainsView.jsx",
    moduleOwner: "Synthetic product route backed by browser-delivery target state in modules/test-modules-remote-ops.",
    changeHere: [
      "browser-delivery setup flow and domain instructions",
      "delivery-mode copy, warnings, and public URL posture"
    ],
    proofs: [
      "frontend/src/tests/app-integration/product-domains.integration.test.jsx",
      "frontend/src/tests/app-integration/remote-ops.browser-delivery.integration.test.jsx"
    ]
  },
  {
    id: "media",
    label: "Media",
    route: "/app/media",
    stage: "Content",
    purpose: "Upload, curate, preview, and sync the media library without leaving the desk.",
    productSurface: "modules/test-modules-media-manager/frontend/MediaManagerView.jsx",
    moduleOwner: "modules/test-modules-media-manager",
    changeHere: [
      "media gallery/table experience, metadata editing, and sync posture",
      "shared media picking primitives reused by other desks"
    ],
    proofs: [
      "frontend/src/tests/app-integration/media-manager.integration.test.jsx",
      "server/test/module-conformance/media-manager.module-conformance.test.js"
    ]
  },
  {
    id: "taxonomies",
    label: "Taxonomies",
    route: "/app/taxonomies",
    stage: "Content",
    purpose: "Manage categories and tags as shared structure for posts, pages, and release flows.",
    productSurface: "modules/test-modules-taxonomy/frontend/BlogTaxonomyView.jsx",
    moduleOwner: "modules/test-modules-taxonomy",
    changeHere: [
      "taxonomy discovery, editing, remote projection posture, and linked usage visibility",
      "category/tag balance and future taxonomy-family expansion"
    ],
    proofs: [
      "frontend/src/tests/app-integration/products-taxonomies.integration.test.jsx",
      "server/test/module-conformance/blog-editorial-taxonomy.module-conformance.test.js"
    ]
  },
  {
    id: "authors",
    label: "Authors",
    route: "/app/authors",
    stage: "Content",
    purpose: "Maintain the author roster, linked posts, and author-facing media/profile details in one place.",
    productSurface: "frontend/src/app/product-shell/ProductEditorialView.jsx",
    moduleOwner: "modules/test-modules-editorial",
    changeHere: [
      "author listing, filtering, editing flows, and linked-post visibility",
      "author validation and reusable author media/profile widgets"
    ],
    proofs: [
      "frontend/src/tests/app-integration/product-editorial.integration.test.jsx",
      "server/test/module-conformance/blog-editorial-taxonomy.module-conformance.test.js"
    ]
  },
  {
    id: "posts",
    label: "Posts",
    route: "/app/posts",
    stage: "Content",
    purpose: "Create and revise posts with their author, taxonomy, media, and release posture visible together.",
    productSurface: "modules/test-modules-content/frontend/BlogContentView.jsx",
    moduleOwner: "modules/test-modules-content",
    changeHere: [
      "post authoring surface, status, related links, and release-readiness signals",
      "field validation and post-centric product flow"
    ],
    proofs: [
      "frontend/src/tests/app-integration/blog-content.integration.test.jsx",
      "server/test/module-conformance/blog-content.module-conformance.test.js"
    ]
  },
  {
    id: "comments",
    label: "Comments",
    route: "/app/comments",
    stage: "Content",
    purpose: "Moderate public comment intake and keep comment state aligned with published content.",
    productSurface: "frontend/src/app/product-shell/ProductModerationView.jsx",
    moduleOwner: "modules/test-modules-engagement",
    changeHere: [
      "moderation queue, approval/rejection flows, and public comment posture",
      "comment-origin visibility and write-path guardrails"
    ],
    proofs: [
      "frontend/src/tests/app-integration/product-moderation.integration.test.jsx",
      "frontend/src/tests/app-integration/blog-engagement.integration.test.jsx",
      "server/test/module-conformance/blog-engagement.module-conformance.test.js"
    ]
  },
  {
    id: "layouts",
    label: "Layouts",
    route: "/app/layouts",
    stage: "Presentation",
    purpose: "Design reusable page structure through the canvas-first builder.",
    productSurface: "modules/test-modules-layouts/frontend/LayoutsView.jsx",
    moduleOwner: "modules/test-modules-layouts",
    changeHere: [
      "layout canvas, structural presets, contextual editing, and saved layout records",
      "shared layout semantics used by pages and preview flows"
    ],
    proofs: [
      "frontend/src/tests/app-integration/layouts.integration.test.jsx",
      "server/test/module-conformance/layouts.module-conformance.test.js"
    ]
  },
  {
    id: "pages",
    label: "Pages",
    route: "/app/pages",
    stage: "Presentation",
    purpose: "Turn content and layouts into deployable page definitions and per-record templates.",
    productSurface: "modules/test-modules-pages/frontend/BlogDistributionView.jsx",
    moduleOwner: "modules/test-modules-pages",
    changeHere: [
      "page authoring, runtime contract preview, per-record generation, and public link posture",
      "deployment bundle composition and page-specific release behavior"
    ],
    proofs: [
      "frontend/src/tests/app-integration/blog-distribution.integration.test.jsx",
      "frontend/src/tests/app-integration/blog-distribution.per-record.integration.test.jsx",
      "server/test/module-conformance/blog-distribution.module-conformance.test.js"
    ]
  },
  {
    id: "deployments",
    label: "Deployments",
    route: "/app/deployments",
    stage: "Release",
    purpose: "Run release bundles, inspect readiness, and browse the resulting local and remote outputs.",
    productSurface: "frontend/src/app/product-shell/ProductDeploymentsView.jsx",
    moduleOwner: "Synthetic product route backed primarily by modules/test-modules-pages and modules/test-modules-remote-ops.",
    changeHere: [
      "release pipeline orchestration, readiness messaging, and browseable output links",
      "release observability and cross-desk deployed/synced state"
    ],
    proofs: [
      "frontend/src/tests/app-integration/product-deployments.integration.test.jsx",
      "frontend/src/tests/app-integration/product-deployments.key-recovery.integration.test.jsx",
      "server/test/module-conformance/blog-distribution.module-conformance.test.js"
    ]
  }
]);

function renderMarkdown() {
  const lines = [
    "# Developer Desk Map",
    "",
    "This map exists so the next product-facing change starts from the right files and the right proofs.",
    ""
  ];

  for (const desk of DESK_MAP) {
    lines.push(`## ${desk.label}`);
    lines.push(`- Route: \`${desk.route}\``);
    lines.push(`- Stage: ${desk.stage}`);
    lines.push(`- Purpose: ${desk.purpose}`);
    lines.push(`- Product surface: \`${desk.productSurface}\``);
    lines.push(`- Module owner: ${desk.moduleOwner}`);
    lines.push("- Change here:");
    for (const item of desk.changeHere) {
      lines.push(`  - ${item}`);
    }
    lines.push("- Proofs:");
    for (const proof of desk.proofs) {
      lines.push(`  - \`${proof}\``);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const command = process.argv[2] ?? "markdown";

if (command === "json") {
  process.stdout.write(`${JSON.stringify(DESK_MAP, null, 2)}\n`);
  process.exit(0);
}

process.stdout.write(renderMarkdown());
