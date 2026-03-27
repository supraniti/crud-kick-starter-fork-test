export const DEPLOYMENT_SYNC_COMPLETED_EVENT = "crud:deployment-sync-completed";

export function announceDeploymentSyncCompleted(detail = {}) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(DEPLOYMENT_SYNC_COMPLETED_EVENT, {
      detail
    })
  );
}
