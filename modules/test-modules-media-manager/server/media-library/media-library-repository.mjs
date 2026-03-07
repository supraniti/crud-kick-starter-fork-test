import { MEDIA_ITEMS_COLLECTION_ID } from "./media-library-contract.mjs";

const MEDIA_ITEMS_SEQUENCE_KEY = "nextMediaItemNumber";

function cloneValue(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function ensureRepository(repository) {
  if (
    !repository ||
    typeof repository.readState !== "function" ||
    typeof repository.transact !== "function"
  ) {
    throw new Error("Media items repository is not available");
  }

  return repository;
}

function ensureMediaItemsState(state) {
  if (!Array.isArray(state[MEDIA_ITEMS_COLLECTION_ID])) {
    state[MEDIA_ITEMS_COLLECTION_ID] = [];
  }

  return state[MEDIA_ITEMS_COLLECTION_ID];
}

function parseMediaItemSequence(itemId) {
  const match = /^mdi-(\d+)$/.exec(typeof itemId === "string" ? itemId : "");
  if (!match) {
    return 0;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function resolveNextMediaItemSequence(state) {
  const items = ensureMediaItemsState(state);
  const nextFromState = Number.isInteger(state[MEDIA_ITEMS_SEQUENCE_KEY])
    ? state[MEDIA_ITEMS_SEQUENCE_KEY]
    : 1;
  const maxExisting = items.reduce(
    (maxValue, item) => Math.max(maxValue, parseMediaItemSequence(item?.id)),
    0
  );
  return Math.max(nextFromState, maxExisting + 1);
}

export function resolveMediaItemsRepository(resolveCollectionRepository) {
  return ensureRepository(resolveCollectionRepository(MEDIA_ITEMS_COLLECTION_ID));
}

export async function listMediaItems(repository) {
  const resolvedRepository = ensureRepository(repository);
  const state = await resolvedRepository.readState();
  return cloneValue(Array.isArray(state?.[MEDIA_ITEMS_COLLECTION_ID]) ? state[MEDIA_ITEMS_COLLECTION_ID] : []);
}

export async function readMediaItem(repository, mediaItemId) {
  const items = await listMediaItems(repository);
  return items.find((item) => item.id === mediaItemId) ?? null;
}

export async function reserveNextMediaItemId(repository) {
  const resolvedRepository = ensureRepository(repository);
  return resolvedRepository.transact(async (workingState) => {
    const nextSequence = resolveNextMediaItemSequence(workingState);
    workingState[MEDIA_ITEMS_SEQUENCE_KEY] = nextSequence + 1;
    return {
      commit: true,
      value: `mdi-${String(nextSequence).padStart(3, "0")}`
    };
  });
}

export async function insertMediaItem(repository, item) {
  const resolvedRepository = ensureRepository(repository);
  return resolvedRepository.transact(async (workingState) => {
    const items = ensureMediaItemsState(workingState);
    items.push(cloneValue(item));
    return {
      commit: true,
      value: cloneValue(item)
    };
  });
}

export async function updateMediaItem(repository, mediaItemId, mutateItem) {
  const resolvedRepository = ensureRepository(repository);
  return resolvedRepository.transact(async (workingState) => {
    const items = ensureMediaItemsState(workingState);
    const item = items.find((entry) => entry.id === mediaItemId) ?? null;
    if (!item) {
      return {
        commit: false,
        value: null
      };
    }

    await mutateItem(item);
    return {
      commit: true,
      value: cloneValue(item)
    };
  });
}

export async function removeMediaItem(repository, mediaItemId) {
  const resolvedRepository = ensureRepository(repository);
  return resolvedRepository.transact(async (workingState) => {
    const items = ensureMediaItemsState(workingState);
    const index = items.findIndex((entry) => entry.id === mediaItemId);
    if (index < 0) {
      return {
        commit: false,
        value: null
      };
    }

    const [removed] = items.splice(index, 1);
    return {
      commit: true,
      value: cloneValue(removed)
    };
  });
}
