import { Alert, Button, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import { useEffect } from "react";

function formatThreshold(rule = {}) {
  const percent = Number(rule?.thresholdPercent ?? 0) * 100;
  const basis = rule?.spendBasis === "FORECASTED_SPEND" ? "Forecast" : "Actual";
  return `${basis} ${percent.toFixed(percent % 1 === 0 ? 0 : 1)}%`;
}

function SummaryCard({ label, value, tone = "default" }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={0.35}>
          <Typography variant="overline" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h6" color={tone === "warning" ? "warning.main" : "text.primary"}>
            {value}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function PermissionChips({ permissions = [] }) {
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {permissions.map((permission) => (
        <Chip
          key={permission.permission}
          size="small"
          color={permission.granted ? "success" : "warning"}
          label={`${permission.label}: ${permission.granted ? "granted" : "missing"}`}
        />
      ))}
    </Stack>
  );
}

function BudgetCard({ budget }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="subtitle2">{budget.displayName}</Typography>
            <Chip
              size="small"
              variant="outlined"
              label={budget.scope === "project" ? "Project scoped" : "Billing-account scoped"}
            />
            {budget.hasForecastRule ? <Chip size="small" color="info" label="Forecast rules" /> : null}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Amount: {budget.amount.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Period: {budget.period}
          </Typography>
          {budget.projects?.length > 0 ? (
            <Typography variant="body2" color="text.secondary">
              Projects: {budget.projects.join(", ")}
            </Typography>
          ) : null}
          {budget.thresholds?.length > 0 ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {budget.thresholds.map((rule, index) => (
                <Chip key={`${budget.name ?? budget.displayName}-${index}`} size="small" variant="outlined" label={formatThreshold(rule)} />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No alert thresholds configured.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ProductRemoteBillingPanel({ workspace, selectedConnection, report, onLoadReport }) {
  useEffect(() => {
    if (!selectedConnection || selectedConnection.connectionStatus !== "validated") {
      return;
    }
    if (report || workspace.billingActionState.processing || workspace.billingActionState.errorMessage) {
      return;
    }
    void onLoadReport();
  }, [
    onLoadReport,
    report,
    selectedConnection,
    workspace.billingActionState.errorMessage,
    workspace.billingActionState.processing
  ]);

  if (!selectedConnection) {
    return (
      <Alert severity="info">
        Select a remote connection to inspect billing linkage, budget controls, and cost visibility.
      </Alert>
    );
  }

  if (selectedConnection.connectionStatus !== "validated") {
    return (
      <Alert severity="warning">
        Validate the selected remote before loading billing and usage details.
      </Alert>
    );
  }

  const billingInfo = report?.billingInfo ?? null;
  const budgets = report?.budgets ?? null;
  const permissions = report?.permissions?.project ?? [];
  const consoleLinks = report?.consoleLinks ?? {};

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ md: "center" }}
            >
              <Stack spacing={0.35}>
                <Typography variant="subtitle1">Billing & Usage</Typography>
                <Typography variant="body2" color="text.secondary">
                  View the selected project&apos;s billing linkage, visible GCP budgets, forecast rules, and whether the current
                  service account can access cost signals from Google Cloud.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  variant="outlined"
                  onClick={onLoadReport}
                  disabled={workspace.billingActionState.processing}
                >
                  {report ? "Refresh Billing" : "Load Billing"}
                </Button>
                {consoleLinks.projectBilling ? (
                  <Button component="a" href={consoleLinks.projectBilling} target="_blank" rel="noreferrer" variant="text">
                    Open Billing Console
                  </Button>
                ) : null}
                {consoleLinks.projectBudgets ? (
                  <Button component="a" href={consoleLinks.projectBudgets} target="_blank" rel="noreferrer" variant="text">
                    Open Budgets
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            {workspace.billingActionState.errorMessage ? (
              <Alert severity="error">{workspace.billingActionState.errorMessage}</Alert>
            ) : null}
            {workspace.billingActionState.successMessage ? (
              <Alert severity="success">{workspace.billingActionState.successMessage}</Alert>
            ) : null}

            <Alert severity="info">
              This surface uses the real GCP billing linkage and Cloud Billing Budgets API when permissions allow. Exact cost
              trend charts still live in the Google Cloud Billing console.
            </Alert>
          </Stack>
        </CardContent>
      </Card>

      {report ? (
        <>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" } }}
          >
            <SummaryCard label="Billing" value={billingInfo?.billingEnabled ? "Enabled" : billingInfo?.state ?? "Unknown"} />
            <SummaryCard label="Visible Budgets" value={String(budgets?.visibleCount ?? 0)} />
            <SummaryCard label="Forecast Rules" value={String(budgets?.forecastRuleCount ?? 0)} />
            <SummaryCard
              label="Cost Visibility"
              value={report.permissions?.summaries?.canReadProjectCosts ? "Granted" : "Missing"}
              tone={report.permissions?.summaries?.canReadProjectCosts ? "default" : "warning"}
            />
          </Stack>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Billing Linkage</Typography>
                <Typography variant="body2" color="text.secondary">
                  {billingInfo?.summary ?? "Billing linkage has not been loaded yet."}
                </Typography>
                {billingInfo?.billingAccountDisplayName ? (
                  <Typography variant="body2" color="text.secondary">
                    Billing account: {billingInfo.billingAccountDisplayName}
                    {billingInfo.billingAccountId ? ` (${billingInfo.billingAccountId})` : ""}
                  </Typography>
                ) : null}
                {typeof billingInfo?.billingAccountOpen === "boolean" ? (
                  <Typography variant="body2" color="text.secondary">
                    Billing account state: {billingInfo.billingAccountOpen ? "Open" : "Closed"}
                  </Typography>
                ) : null}
                <Divider flexItem />
                <Typography variant="subtitle2">Project Billing Permissions</Typography>
                <PermissionChips permissions={permissions} />
                {permissions.length > 0 ? (
                  <Stack spacing={0.35}>
                    {permissions
                      .filter((permission) => !permission.granted)
                      .map((permission) => (
                        <Typography key={permission.permission} variant="body2" color="text.secondary">
                          {permission.guidance}
                        </Typography>
                      ))}
                  </Stack>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Budgets & Forecast Rules</Typography>
                <Typography variant="body2" color="text.secondary">
                  {budgets?.summary ?? "Budgets have not been loaded yet."}
                </Typography>
                {Array.isArray(budgets?.items) && budgets.items.length > 0 ? (
                  <Stack spacing={1}>
                    {budgets.items.map((budget) => (
                      <BudgetCard key={budget.name ?? budget.displayName} budget={budget} />
                    ))}
                  </Stack>
                ) : (
                  <Alert severity={budgets?.state === "permission-denied" ? "warning" : "info"}>
                    {budgets?.summary ?? "No budgets are visible for this project yet."}
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          {Array.isArray(report.guidance) && report.guidance.length > 0 ? (
            <Stack spacing={1}>
              {report.guidance.map((entry, index) => (
                <Alert key={`${entry.level}-${index}`} severity={entry.level === "warning" ? "warning" : "info"}>
                  {entry.message}
                </Alert>
              ))}
            </Stack>
          ) : null}
        </>
      ) : (
        <Alert severity="info">Load billing to inspect the linked billing account, visible budgets, and forecast rules.</Alert>
      )}
    </Stack>
  );
}
