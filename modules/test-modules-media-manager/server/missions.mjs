import {
  MEDIA_COMPRESSION_MISSION_ID,
  MODULE_ID,
  OPERATION_PRESET_CATALOG
} from "./media-library/media-library-contract.mjs";
import {
  createDerivedMediaItem
} from "./media-library/media-library-runtime.mjs";
import { resolveMediaItemsRepository } from "./media-library/media-library-repository.mjs";
import {
  markDeployRequired
} from "../../../server/src/domains/reference/runtime/services/reference-state-utils-domain-service.js";

function validateCompressionPayload(payload) {
  const mediaItemId =
    typeof payload?.mediaItemId === "string" ? payload.mediaItemId.trim() : "";
  const preset =
    typeof payload?.preset === "string" ? payload.preset.trim() : "";

  if (mediaItemId.length === 0) {
    return {
      ok: false,
      error: {
        code: "MEDIA_OPERATION_MEDIA_ITEM_REQUIRED",
        message: "Payload mediaItemId is required"
      }
    };
  }

  if (!Object.prototype.hasOwnProperty.call(OPERATION_PRESET_CATALOG, preset)) {
    return {
      ok: false,
      error: {
        code: "MEDIA_OPERATION_PRESET_INVALID",
        message: "Payload preset must be a supported media preset"
      }
    };
  }

  return {
    ok: true,
    payload: {
      mediaItemId,
      preset
    }
  };
}

export function registerMissions(context = {}) {
  const repository = resolveMediaItemsRepository(context.resolveCollectionRepository);
  const markDeployMutation = async () => {
    if (context.remotesDeployRepository) {
      await context.remotesDeployRepository.transact(async (workingState) => {
        markDeployRequired(workingState);
        return {
          commit: true,
          value: null
        };
      });
      return;
    }

    markDeployRequired(context.state);
  };

  context.registry.register({
    missionId: MEDIA_COMPRESSION_MISSION_ID,
    moduleId: MODULE_ID,
    mission: {
      label: "Media Image Compression",
      description: "Creates derived media assets for supported image presets.",
      payload: {
        fields: [
          {
            id: "mediaItemId",
            label: "Media Item Id",
            type: "text",
            required: true
          },
          {
            id: "preset",
            label: "Preset",
            type: "enum",
            required: true,
            defaultValue: "web-optimized",
            options: Object.values(OPERATION_PRESET_CATALOG).map((preset) => ({
              value: preset.id,
              label: preset.label
            }))
          }
        ]
      },
      validatePayload: validateCompressionPayload,
      execute: async (payload) => {
        const result = await createDerivedMediaItem(
          repository,
          payload.mediaItemId,
          payload.preset
        );
        await markDeployMutation();
        return result;
      }
    }
  });
}
