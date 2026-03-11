import { useCallback, useEffect, useMemo, useState } from "react";
import { matchesRedirectFilters } from "./distribution-readiness.js";
import { createActionState, createEmptyRedirectDraft, normalizeRedirectDraft } from "./page-workspace-support.js";
import { disableRedirectMutation, persistRedirectMutation } from "./blog-distribution-workspace-support.js";

const DEFAULT_REDIRECT_FILTERS = Object.freeze({
  search: "",
  status: "",
  httpCode: "",
  targetPageId: ""
});

export function useRedirectWorkspace({ redirects, reloadSupportData }) {
  const [redirectFilters, setRedirectFilters] = useState(DEFAULT_REDIRECT_FILTERS);
  const [selectedRedirectId, setSelectedRedirectId] = useState(null);
  const [isCreatingNewRedirect, setIsCreatingNewRedirect] = useState(false);
  const [redirectDraft, setRedirectDraft] = useState(createEmptyRedirectDraft);
  const [redirectActionState, setRedirectActionState] = useState(createActionState);

  useEffect(() => {
    if (isCreatingNewRedirect) {
      return;
    }
    if (redirects.length === 0) {
      setSelectedRedirectId(null);
      setRedirectDraft(createEmptyRedirectDraft());
      return;
    }
    if (!selectedRedirectId || !redirects.some((rule) => rule.id === selectedRedirectId)) {
      setSelectedRedirectId(redirects[0].id);
      setRedirectDraft(normalizeRedirectDraft(redirects[0]));
    }
  }, [isCreatingNewRedirect, redirects, selectedRedirectId]);

  const filteredRedirects = useMemo(
    () => redirects.filter((rule) => matchesRedirectFilters(rule, redirectFilters)),
    [redirectFilters, redirects]
  );
  const effectiveSelectedRedirectId = isCreatingNewRedirect ? null : selectedRedirectId;

  const setDraftWithReset = useCallback((updater) => {
    setRedirectDraft(updater);
    setRedirectActionState(createActionState());
  }, []);

  const persistRedirect = useCallback(async () => {
    setRedirectActionState({ saving: true, errorMessage: null, successMessage: null });
    try {
      const targetRedirectId = isCreatingNewRedirect ? null : selectedRedirectId;
      const result = await persistRedirectMutation({
        redirectId: targetRedirectId,
        redirectDraft
      });
      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to save redirect");
      }
      await reloadSupportData();
      if (result.item?.id) {
        setIsCreatingNewRedirect(false);
        setSelectedRedirectId(result.item.id);
        setRedirectDraft(normalizeRedirectDraft(result.item));
      }
      setRedirectActionState({
        saving: false,
        errorMessage: null,
        successMessage: targetRedirectId ? "Redirect updated" : "Redirect created"
      });
    } catch (error) {
      setRedirectActionState({
        saving: false,
        errorMessage: error?.message ?? "Failed to save redirect",
        successMessage: null
      });
    }
  }, [isCreatingNewRedirect, redirectDraft, reloadSupportData, selectedRedirectId]);

  const disableSelectedRedirect = useCallback(async () => {
    if (!effectiveSelectedRedirectId) {
      return;
    }
    setRedirectActionState({ saving: true, errorMessage: null, successMessage: null });
    try {
      const result = await disableRedirectMutation({
        redirectId: effectiveSelectedRedirectId,
        redirectDraft
      });
      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to disable redirect");
      }
      await reloadSupportData();
      setRedirectDraft((previous) => ({ ...previous, status: "disabled" }));
      setRedirectActionState({
        saving: false,
        errorMessage: null,
        successMessage: "Redirect disabled"
      });
    } catch (error) {
      setRedirectActionState({
        saving: false,
        errorMessage: error?.message ?? "Failed to disable redirect",
        successMessage: null
      });
    }
  }, [effectiveSelectedRedirectId, redirectDraft, reloadSupportData]);

  return {
    filteredRedirects,
    redirectFilters,
    selectedRedirectId: effectiveSelectedRedirectId,
    redirectDraft,
    redirectActionState,
    setRedirectFilters,
    selectRedirect: (redirectId) => {
      const rule = redirects.find((entry) => entry.id === redirectId) ?? null;
      setIsCreatingNewRedirect(false);
      setSelectedRedirectId(redirectId);
      setRedirectDraft(rule ? normalizeRedirectDraft(rule) : createEmptyRedirectDraft());
      setRedirectActionState(createActionState());
    },
    startNewRedirect: () => {
      setIsCreatingNewRedirect(true);
      setSelectedRedirectId(null);
      setRedirectDraft(createEmptyRedirectDraft());
      setRedirectActionState(createActionState());
    },
    changeRedirectField: (fieldId, value) => {
      setDraftWithReset((previous) => ({
        ...previous,
        [fieldId]: value
      }));
    },
    persistRedirect,
    disableSelectedRedirect
  };
}
