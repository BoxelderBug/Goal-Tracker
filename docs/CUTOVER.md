# Cutover runbook (legacy → Next.js rewrite)

Zero-downtime path. Steps 1–2 and 5 need **your** Firebase login (interactive,
browser) — they can't run in an automated environment. Step 3 (Vercel prod) can
be run from the Vercel CLI. Do them in order.

Project: `goal-tracker-d0a58` · Vercel team: `nolans-projects-3509a3b6`

## 0. One-time: authenticate the Firebase CLI (interactive)

```
npx -y firebase-tools login
```

## 1. Deploy the composite indexes (safe, additive)

```
npx firebase-tools deploy --only firestore:indexes
```

Wait for the indexes to finish **building** in the Firebase console before step 3
(range queries fail until they're ready).

## 2. Deploy TRANSITIONAL rules (both apps keep working)

`firestore.transitional.rules` enables the new app's subcollections **and** leaves
the legacy blob writable, so the still-live legacy app keeps saving.

```
npx firebase-tools deploy --only firestore:rules       # after pointing firebase.json at the transitional file, OR:
cp firestore.transitional.rules firestore.rules.deploy  # then deploy that path
```

Simplest: temporarily set `firebase.json` → `"rules": "firestore.transitional.rules"`,
run `npx firebase-tools deploy --only firestore:rules`, then revert firebase.json.

## 3. Promote the new app to Vercel production

```
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

The production alias (`goal-tracker-lime-eta.vercel.app`) now serves the new app.

## 4. Smoke-test with a real login

Log in as yourself on the production URL and verify: migration runs once, goals +
entries appear, a week/month view shows correct numbers, adding an entry syncs.
**Do not proceed to step 5 until this passes.** If anything is wrong, redeploy the
legacy app to prod to roll back (it's untouched).

## 5. Freeze the legacy blob (final rules)

Once the new app is confirmed working and you've stopped using the legacy app:

```
npx firebase-tools deploy --only firestore:rules        # firebase.json → firestore.rules (the final, blob-frozen version)
```

## 6. Retire legacy

- Repoint GitHub Pages (main) to a redirect to the Vercel URL, or disable the Pages workflow.
- `git rm -r legacy/` and commit.
- (Optional) delete the stale `goal-tracker` project on the other Vercel account so commit checks stop flickering red.

## Rollback

Nothing here deletes data. To roll back before step 5: redeploy the legacy app to
Vercel prod and deploy `firestore.transitional.rules` (blob writable). The legacy
blob `goalTrackerData/{uid}` is never modified by any step.
