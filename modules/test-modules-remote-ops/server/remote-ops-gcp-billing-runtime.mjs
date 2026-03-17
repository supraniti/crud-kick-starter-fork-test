import { collectGoogleJsonPages, LiveApiError, requestGoogleJson } from "./remote-ops-live-google-runtime.mjs";
import { getServiceAccountAccessToken } from "./remote-ops-service-account-auth-runtime.mjs";
import { normalizeOptionalText } from "./remote-ops-shared-runtime.mjs";

const BILLING_INFO_PERMISSION = "billing.resourceAssociations.get";
const BILLING_COSTS_PERMISSION = "billing.resourceCosts.get";
const BILLING_BUDGETS_PERMISSION = "billing.resourcebudgets.read";

function createEmptyOverview(connectionProfile) {
  return {
    provider: "gcp",
    loadedOn: new Date().toISOString(),
    connectionId: connectionProfile.id,
    project: {
      projectId: normalizeOptionalText(connectionProfile.projectId),
      projectNumber: normalizeOptionalText(connectionProfile.projectNumber),
      displayName: normalizeOptionalText(connectionProfile.projectDisplayName)
    },
    billingInfo: {
      state: "unknown",
      billingEnabled: false,
      billingAccountName: null,
      billingAccountId: null,
      billingAccountDisplayName: null,
      billingAccountOpen: null,
      summary: "Billing has not been inspected yet."
    },
    permissions: {
      project: [],
      summaries: {
        canReadProjectCosts: false,
        canReadProjectBudgets: false
      }
    },
    budgets: {
      state: "unknown",
      visibleCount: 0,
      projectScopedCount: 0,
      accountScopedCount: 0,
      forecastRuleCount: 0,
      items: [],
      summary: "Budgets have not been inspected yet."
    },
    guidance: [],
    consoleLinks: {
      projectBilling: null,
      projectBudgets: null
    }
  };
}

function mapPermissionState(permission, granted, label, guidance) {
  return {
    permission,
    granted,
    label,
    guidance
  };
}

function extractBillingAccountId(billingAccountName) {
  const normalized = normalizeOptionalText(billingAccountName);
  if (!normalized) {
    return null;
  }
  const match = normalized.match(/^billingAccounts\/(.+)$/);
  return match?.[1] ?? null;
}

function formatMoney(value = {}) {
  const currencyCode = normalizeOptionalText(value?.currencyCode) ?? "USD";
  const units = Number.parseInt(value?.units ?? "0", 10) || 0;
  const nanos = Number(value?.nanos ?? 0) || 0;
  const amount = units + nanos / 1_000_000_000;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(amount);
}

function describeBudgetAmount(budget = {}) {
  if (budget?.amount?.specifiedAmount) {
    return {
      label: formatMoney(budget.amount.specifiedAmount),
      mode: "specified"
    };
  }
  if (budget?.amount?.lastPeriodAmount) {
    return {
      label: "Last period spend",
      mode: "last-period"
    };
  }
  return {
    label: "Not specified",
    mode: "unknown"
  };
}

function describeBudgetPeriod(budget = {}) {
  const filter = budget?.budgetFilter ?? {};
  if (filter.customPeriod?.startDate || filter.customPeriod?.endDate) {
    const start = filter.customPeriod?.startDate
      ? `${filter.customPeriod.startDate.year}-${String(filter.customPeriod.startDate.month).padStart(2, "0")}-${String(filter.customPeriod.startDate.day).padStart(2, "0")}`
      : "open";
    const end = filter.customPeriod?.endDate
      ? `${filter.customPeriod.endDate.year}-${String(filter.customPeriod.endDate.month).padStart(2, "0")}-${String(filter.customPeriod.endDate.day).padStart(2, "0")}`
      : "open";
    return `${start} to ${end}`;
  }
  if (normalizeOptionalText(filter.calendarPeriod)) {
    return filter.calendarPeriod;
  }
  return "Monthly";
}

function normalizeProjectScopeEntry(entry) {
  const normalized = normalizeOptionalText(entry);
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith("projects/")) {
    return normalized;
  }
  return `projects/${normalized}`;
}

function doesBudgetMatchProject(project, budget = {}) {
  const scopedProjects = Array.isArray(budget?.budgetFilter?.projects)
    ? budget.budgetFilter.projects.map(normalizeProjectScopeEntry).filter(Boolean)
    : [];
  if (scopedProjects.length === 0) {
    return true;
  }
  const projectId = normalizeOptionalText(project?.projectId);
  const projectNumber = normalizeOptionalText(project?.projectNumber);
  return scopedProjects.some(
    (entry) => entry === `projects/${projectId}` || entry === `projects/${projectNumber}`
  );
}

function mapThresholdRules(rules = []) {
  return (Array.isArray(rules) ? rules : []).map((rule) => ({
    spendBasis: normalizeOptionalText(rule?.spendBasis) ?? "CURRENT_SPEND",
    thresholdPercent: Number(rule?.thresholdPercent ?? 0)
  }));
}

function createBudgetItem(project, budget = {}) {
  const thresholds = mapThresholdRules(budget.thresholdRules);
  const scopedProjects = Array.isArray(budget?.budgetFilter?.projects)
    ? budget.budgetFilter.projects.map(normalizeProjectScopeEntry).filter(Boolean)
    : [];
  return {
    name: normalizeOptionalText(budget.name),
    displayName: normalizeOptionalText(budget.displayName) ?? "Unnamed budget",
    amount: describeBudgetAmount(budget),
    period: describeBudgetPeriod(budget),
    scope: scopedProjects.length === 0 ? "billing-account" : "project",
    projects: scopedProjects,
    hasForecastRule: thresholds.some((rule) => rule.spendBasis === "FORECASTED_SPEND"),
    thresholds
  };
}

function createConsoleLinks(project, billingAccountId) {
  const projectId = normalizeOptionalText(project?.projectId);
  if (!projectId) {
    return {
      projectBilling: null,
      projectBudgets: null
    };
  }
  return {
    projectBilling: billingAccountId
      ? `https://console.cloud.google.com/billing/${encodeURIComponent(billingAccountId)}?project=${encodeURIComponent(projectId)}`
      : `https://console.cloud.google.com/billing?project=${encodeURIComponent(projectId)}`,
    projectBudgets: billingAccountId
      ? `https://console.cloud.google.com/billing/${encodeURIComponent(billingAccountId)}/budgets?project=${encodeURIComponent(projectId)}`
      : `https://console.cloud.google.com/billing?project=${encodeURIComponent(projectId)}`
  };
}

function appendGuidance(overview, level, message) {
  overview.guidance.push({
    level,
    message
  });
}

function isPermissionDenied(error) {
  return error instanceof LiveApiError && error.statusCode === 403;
}

function describeBillingInfoState(overview) {
  if (overview.billingInfo.state === "enabled") {
    overview.billingInfo.summary = overview.billingInfo.billingAccountDisplayName
      ? `Billing is enabled and linked to '${overview.billingInfo.billingAccountDisplayName}'.`
      : "Billing is enabled for this project.";
    return;
  }
  if (overview.billingInfo.state === "disabled") {
    overview.billingInfo.summary = "Billing is not enabled for this project.";
    return;
  }
  if (overview.billingInfo.state === "permission-denied") {
    overview.billingInfo.summary =
      "The service account cannot inspect project billing linkage yet.";
    return;
  }
  overview.billingInfo.summary = "Billing linkage could not be fully inspected.";
}

function finalizeBudgetSummary(overview) {
  if (overview.budgets.state === "loaded") {
    if (overview.budgets.visibleCount === 0) {
      overview.budgets.summary =
        "No visible budgets are configured for this project or linked billing account.";
      return;
    }
    overview.budgets.summary = `${overview.budgets.visibleCount} visible budget${overview.budgets.visibleCount === 1 ? "" : "s"}, ${overview.budgets.forecastRuleCount} forecast rule${overview.budgets.forecastRuleCount === 1 ? "" : "s"}.`;
    return;
  }
  if (overview.budgets.state === "permission-denied") {
    overview.budgets.summary =
      "The service account cannot read Cloud Billing budgets for this project yet.";
    return;
  }
  if (overview.budgets.state === "not-linked") {
    overview.budgets.summary = "Budgets are unavailable until billing is linked.";
    return;
  }
  overview.budgets.summary = "Budgets could not be loaded.";
}

async function loadProjectPermissions(projectId, accessToken) {
  const payload = await requestGoogleJson(
    `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}:testIamPermissions`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        permissions: [BILLING_INFO_PERMISSION, BILLING_COSTS_PERMISSION, BILLING_BUDGETS_PERMISSION]
      })
    }
  );
  return new Set(Array.isArray(payload?.permissions) ? payload.permissions : []);
}

async function loadProjectBillingInfo(projectId, accessToken) {
  return requestGoogleJson(
    `https://cloudbilling.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/billingInfo`,
    accessToken
  );
}

async function loadBillingAccount(billingAccountName, accessToken) {
  return requestGoogleJson(
    `https://cloudbilling.googleapis.com/v1/${billingAccountName}`,
    accessToken
  );
}

async function loadBillingBudgets(billingAccountName, accessToken) {
  return collectGoogleJsonPages({
    accessToken,
    buildUrl(pageToken) {
      const params = new URLSearchParams();
      if (pageToken) {
        params.set("pageToken", pageToken);
      }
      return `https://billingbudgets.googleapis.com/v1/${billingAccountName}/budgets${params.size > 0 ? `?${params.toString()}` : ""}`;
    },
    extractItems(payload) {
      return Array.isArray(payload?.budgets) ? payload.budgets : [];
    }
  });
}

function markMissingProject(overview) {
  overview.billingInfo.state = "missing-project";
  overview.budgets.state = "missing-project";
  appendGuidance(overview, "info", "Choose and validate a project before loading billing details.");
  describeBillingInfoState(overview);
  finalizeBudgetSummary(overview);
  return overview;
}

async function inspectProjectPermissions(overview, projectId, accessToken) {
  let projectPermissions = new Set();
  try {
    projectPermissions = await loadProjectPermissions(projectId, accessToken);
  } catch {
    projectPermissions = new Set();
  }

  overview.permissions.project = [
    mapPermissionState(
      BILLING_INFO_PERMISSION,
      projectPermissions.has(BILLING_INFO_PERMISSION),
      "Project billing linkage",
      "Grant a project role that includes billing linkage visibility."
    ),
    mapPermissionState(
      BILLING_COSTS_PERMISSION,
      projectPermissions.has(BILLING_COSTS_PERMISSION),
      "Project cost trend visibility",
      "Grant a project role that includes cost visibility if you want cost trend/report access."
    ),
    mapPermissionState(
      BILLING_BUDGETS_PERMISSION,
      projectPermissions.has(BILLING_BUDGETS_PERMISSION),
      "Project budget visibility",
      "Grant a project role that includes budget visibility if you want budgets and forecast rules in-app."
    )
  ];
  overview.permissions.summaries = {
    canReadProjectCosts: projectPermissions.has(BILLING_COSTS_PERMISSION),
    canReadProjectBudgets: projectPermissions.has(BILLING_BUDGETS_PERMISSION)
  };
}

function captureBillingLinkage(overview, projectBillingInfo) {
  overview.billingInfo.state = projectBillingInfo?.billingEnabled ? "enabled" : "disabled";
  overview.billingInfo.billingEnabled = Boolean(projectBillingInfo?.billingEnabled);
  overview.billingInfo.billingAccountName = normalizeOptionalText(projectBillingInfo?.billingAccountName);
  overview.billingInfo.billingAccountId = extractBillingAccountId(projectBillingInfo?.billingAccountName);
}

function handleBillingLinkageFailure(overview, error) {
  overview.billingInfo.state = isPermissionDenied(error) ? "permission-denied" : "error";
  appendGuidance(
    overview,
    overview.billingInfo.state === "permission-denied" ? "warning" : "info",
    overview.billingInfo.state === "permission-denied"
      ? "Grant project access that can inspect billing linkage before expecting billing state in-app."
      : error?.message ?? "Failed to inspect project billing linkage."
  );
  describeBillingInfoState(overview);
  overview.consoleLinks = createConsoleLinks(overview.project, null);
  finalizeBudgetSummary(overview);
  return overview;
}

async function inspectBillingLinkage(overview, projectId, accessToken) {
  try {
    const projectBillingInfo = await loadProjectBillingInfo(projectId, accessToken);
    captureBillingLinkage(overview, projectBillingInfo);
    return true;
  } catch (error) {
    handleBillingLinkageFailure(overview, error);
    return false;
  }
}

async function inspectBillingAccountDetails(overview, billingAccountName, accessToken) {
  if (!billingAccountName) {
    return;
  }
  try {
    const billingAccount = await loadBillingAccount(billingAccountName, accessToken);
    overview.billingInfo.billingAccountDisplayName =
      normalizeOptionalText(billingAccount?.displayName) ?? overview.billingInfo.billingAccountId;
    overview.billingInfo.billingAccountOpen = Boolean(billingAccount?.open);
  } catch (error) {
    if (!isPermissionDenied(error)) {
      return;
    }
    appendGuidance(
      overview,
      "warning",
      "Grant Billing Account Viewer or Billing Account Costs Manager on the linked billing account to inspect account-level billing details."
    );
  }
}

function captureBudgetItems(overview, budgets) {
  const relevantBudgets = budgets.filter((budget) => doesBudgetMatchProject(overview.project, budget));
  const items = relevantBudgets.map((budget) => createBudgetItem(overview.project, budget));
  overview.budgets.state = "loaded";
  overview.budgets.visibleCount = items.length;
  overview.budgets.projectScopedCount = items.filter((item) => item.scope === "project").length;
  overview.budgets.accountScopedCount = items.filter((item) => item.scope === "billing-account").length;
  overview.budgets.forecastRuleCount = items.reduce(
    (count, item) =>
      count + item.thresholds.filter((rule) => rule.spendBasis === "FORECASTED_SPEND").length,
    0
  );
  overview.budgets.items = items;
}

function handleBudgetFailure(overview, error) {
  overview.budgets.state = isPermissionDenied(error) ? "permission-denied" : "error";
  appendGuidance(
    overview,
    overview.budgets.state === "permission-denied" ? "warning" : "info",
    overview.budgets.state === "permission-denied"
      ? "Grant Billing Account Viewer or Billing Account Costs Manager on the billing account, or a project role with budget visibility, to load budgets and forecast rules."
      : error?.message ?? "Failed to load billing budgets."
  );
}

async function inspectBillingBudgets(overview, billingAccountName, accessToken) {
  try {
    const budgets = await loadBillingBudgets(billingAccountName, accessToken);
    captureBudgetItems(overview, budgets);
  } catch (error) {
    handleBudgetFailure(overview, error);
  }
}

function finalizeBillingOverview(overview) {
  if (!overview.permissions.summaries.canReadProjectCosts) {
    appendGuidance(
      overview,
      "info",
      "Project cost trend visibility is not granted. Budget visibility can still work without cost trend permissions."
    );
  }
  finalizeBudgetSummary(overview);
  return overview;
}

export async function buildGcpBillingOverview(connectionProfile) {
  const overview = createEmptyOverview(connectionProfile);
  const projectId = normalizeOptionalText(connectionProfile.projectId);
  if (!projectId) {
    return markMissingProject(overview);
  }

  const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
  await inspectProjectPermissions(overview, projectId, accessToken);
  if (!(await inspectBillingLinkage(overview, projectId, accessToken))) {
    return overview;
  }

  const billingAccountName = overview.billingInfo.billingAccountName;
  const billingAccountId = overview.billingInfo.billingAccountId;
  overview.consoleLinks = createConsoleLinks(overview.project, billingAccountId);
  await inspectBillingAccountDetails(overview, billingAccountName, accessToken);
  describeBillingInfoState(overview);

  if (!overview.billingInfo.billingEnabled || !billingAccountName) {
    overview.budgets.state = "not-linked";
    finalizeBudgetSummary(overview);
    return overview;
  }

  await inspectBillingBudgets(overview, billingAccountName, accessToken);
  return finalizeBillingOverview(overview);
}
