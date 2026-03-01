# Optimistic Update Without Rollback

## What it looks like
- User toggles a setting (e.g., mute), UI shows the new state
- API call fails (network error, server down)
- UI stays in the "toggled" state but backend didn't actually update
- State diverges until the next page load / mount re-sync

## Why it happens
Optimistic updates call the local state setter before the async API call. If the API call fails without a try/catch, the local state is never reverted.

```typescript
// BAD: no rollback on failure
const update = async () => {
  setFoo(newValue);  // optimistic
  await api.updateSettings({ foo: newValue });  // can throw
};

// GOOD: rollback on failure
const update = async () => {
  const prev = foo;
  setFoo(newValue);
  try {
    await api.updateSettings({ foo: newValue });
  } catch (err) {
    console.error('[prefix] Failed to update foo, reverting:', err);
    setFoo(prev);
  }
};
```

## How to detect it automatically
- Search for patterns where a state setter is called before `await api.updateSettings()`
- Look for `set*` calls not wrapped in try/catch
- Pattern: `setX(value)` followed by `await api.*` without surrounding try/catch

## How to fix
Wrap the API call in try/catch and revert the optimistic update in the catch block.

## Files affected
- `apps/desktop/src/hooks/useSettings.ts` — all `update*` functions

## Tests
- Manual: toggle mute with API server stopped, verify UI reverts
