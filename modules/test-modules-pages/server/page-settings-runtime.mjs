import { resolveGeneratedModuleSettingsValues } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime/module-settings-runtime-helpers.mjs";
import {
  DEFAULT_APP_MOUNT_TAG_NAME,
  MODULE_ID,
  normalizeAppMountTagName,
  normalizeOptionalText,
  normalizeTrimmedText
} from "./distribution-shared-runtime.mjs";
import { resolveBrowserDeliverySettingsState } from "./browser-delivery-reference-runtime.mjs";

async function readRawPagesModuleSettings(resolveSettingsRepository) {
  const settingsRepository =
    typeof resolveSettingsRepository === "function"
      ? resolveSettingsRepository(MODULE_ID)
      : null;
  if (!settingsRepository || typeof settingsRepository.readState !== "function") {
    return null;
  }

  try {
    const settingsState = await settingsRepository.readState();
    return settingsState && typeof settingsState === "object" ? settingsState[MODULE_ID] ?? null : null;
  } catch {
    return null;
  }
}

function resolveEffectiveTargetProfileId(pageValue, generatedValue, rawValue) {
  return (
    normalizeOptionalText(pageValue) ??
    normalizeOptionalText(generatedValue) ??
    normalizeOptionalText(rawValue) ??
    null
  );
}

export async function readPagesModuleSettings({
  resolveSettingsRepository,
  settingsDefinition,
  collectionHandlerRegistry = null,
  page = null
}) {
  const rawModuleSettings = await readRawPagesModuleSettings(resolveSettingsRepository);
  const values = await resolveGeneratedModuleSettingsValues({
    moduleId: MODULE_ID,
    settingsDefinition,
    resolveSettingsRepository
  });
  const remoteDeploymentTargetProfileId =
    resolveEffectiveTargetProfileId(
      page?.remoteDeploymentTargetProfileId,
      values?.remoteDeploymentTargetProfileId,
      rawModuleSettings?.remoteDeploymentTargetProfileId
    );
  const remoteBrowserDeliveryTargetProfileId =
    resolveEffectiveTargetProfileId(
      page?.remoteBrowserDeliveryTargetProfileId,
      values?.remoteBrowserDeliveryTargetProfileId,
      rawModuleSettings?.remoteBrowserDeliveryTargetProfileId
    );
  const browserDeliveryState = await resolveBrowserDeliverySettingsState({
    collectionHandlerRegistry,
    browserDeliveryTargetProfileId: remoteBrowserDeliveryTargetProfileId
  });

  return {
    appMountTagName: normalizeAppMountTagName(
      values?.appMountTagName ?? rawModuleSettings?.appMountTagName,
      DEFAULT_APP_MOUNT_TAG_NAME
    ),
    remoteDeploymentTargetProfileId,
    remoteBrowserDeliveryTargetProfileId,
    browserDeliveryState
  };
}
