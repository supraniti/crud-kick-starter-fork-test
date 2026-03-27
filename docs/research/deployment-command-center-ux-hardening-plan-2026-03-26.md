# Deployment Command Center UX Hardening Plan

## Problem

The command center already exposed release truth, but it still behaved like a foreground wizard:

- it blocked the rest of the app while sync was running
- hiding or reloading the app made the sync feel interruptible
- the FAB still looked like a rerun button even when a bundle was already current

That is the wrong interaction model for deployment. Deployment here is a long-running background mission.

## Goal

Keep the command center simple, but make it behave like a trustworthy background release operator:

- start once
- continue while the user keeps working
- survive route changes and full reloads
- stay reopenable
- stop advertising no-op sync actions as if they are normal work

## Execution

### 1. Replace the blocking modal

- remove modal dialog behavior
- move progress into a floating panel
- keep the rest of the app interactive during sync

### 2. Persist active run tracking

- persist the active bundle queue in browser storage
- persist the currently running mission job id
- on app reload, resume polling the same mission job instead of losing the sync lifecycle

### 3. Add hide/reopen semantics

- let the operator hide the panel without cancelling work
- keep a small reopen affordance above the FAB while sync is active
- after success or failure, keep a reopen affordance until the user dismisses the result

### 4. Gate no-op sync actions

- compute per-bundle sync posture from:
  - the owned page deployment state
  - the bound remote target compare state
  - the required translations projection target state
- disable bundle actions when a bundle is already current
- disable `Sync All` when every known bundle is already current

### 5. Preserve recovery guidance

- keep success/error result rows
- keep next-step guidance on failure
- keep `Open Deployments` available for deeper inspection

## Acceptance Criteria

- starting sync does not block navigation or authoring elsewhere in the app
- hiding the sync panel does not stop the sync
- reloading the app during sync restores tracking and continues polling
- finished sync stays reviewable until dismissed
- `Sync All` is disabled when all bundles are current
- already-current bundles do not appear as normal sync actions

