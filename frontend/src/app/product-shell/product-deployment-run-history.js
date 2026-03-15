import {
  createDeploymentBundleReleaseStepPlan,
  createDeploymentBundleRunCreatePayload,
  createDeploymentBundleRunUpdatePayload,
  markDeploymentBundleRunStep
} from "../../../../modules/test-modules-pages/shared/deployment-bundle-release-shared.mjs";

export const DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID = "page-deployment-bundle-runs";

export function sortDeploymentBundleRuns(runs = []) {
  return [...runs].sort((left, right) =>
    `${right?.startedOn ?? ""}`.localeCompare(`${left?.startedOn ?? ""}`)
  );
}

export const createReleaseStepPlan = createDeploymentBundleReleaseStepPlan;

export const createBundleRunCreatePayload = createDeploymentBundleRunCreatePayload;

export const markRunStep = markDeploymentBundleRunStep;

export const createBundleRunUpdatePayload = createDeploymentBundleRunUpdatePayload;
