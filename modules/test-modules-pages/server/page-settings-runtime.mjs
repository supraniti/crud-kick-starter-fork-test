import { resolveGeneratedModuleSettingsValues } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime/module-settings-runtime-helpers.mjs";
import {
  DEFAULT_APP_MOUNT_TAG_NAME,
  MODULE_ID,
  normalizeAppMountTagName,
  normalizeTrimmedText
} from "./distribution-shared-runtime.mjs";
import { resolveBrowserDeliverySettingsState } from "./browser-delivery-reference-runtime.mjs";

export async function readPagesModuleSettings({
  resolveSettingsRepository,
  settingsDefinition,
  collectionHandlerRegistry = null
}) {
  const settingsRepository =
    typeof resolveSettingsRepository === "function"
      ? resolveSettingsRepository(MODULE_ID)
      : null;
  let rawModuleSettings = null;
  if (settingsRepository && typeof settingsRepository.readState === "function") {
    try {
      const settingsState = await settingsRepository.readState();
      rawModuleSettings =
        settingsState && typeof settingsState === "object" ? settingsState[MODULE_ID] ?? null : null;
    } catch {
      rawModuleSettings = null;
    }
  }

  const values = await resolveGeneratedModuleSettingsValues({
    moduleId: MODULE_ID,
    settingsDefinition,
    resolveSettingsRepository
  });
  const remoteBrowserDeliveryTargetProfileId =
    normalizeTrimmedText(
      values?.remoteBrowserDeliveryTargetProfileId ??
        rawModuleSettings?.remoteBrowserDeliveryTargetProfileId
    ) ?? null;
  const browserDeliveryState = await resolveBrowserDeliverySettingsState({
    collectionHandlerRegistry,
    browserDeliveryTargetProfileId: remoteBrowserDeliveryTargetProfileId
  });

  return {
    appMountTagName: normalizeAppMountTagName(
      values?.appMountTagName ?? rawModuleSettings?.appMountTagName,
      DEFAULT_APP_MOUNT_TAG_NAME
    ),
    remoteBrowserDeliveryTargetProfileId,
    browserDeliveryState
  };
}
