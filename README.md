# Goal Tracker

Personal goal-tracking PWA: goals with weekly/monthly/yearly targets, daily entries,
time-boxed challenges, period reviews, dashboards, check-ins, points, and
accountability sharing.

**Stack:** Next.js (App Router) + TypeScript + Tailwind v4, Firebase (Auth + Firestore
with offline persistence), ECharts. Deployed on Vercel.

The previous vanilla-JS app lives in `legacy/` as the behavioral reference during the
rewrite and will be removed at cutover.

## Development

```bash
npm run dev     # dev server on :3000
npm run build   # production build (includes typecheck)
npm run lint    # eslint
```

Data is per-user in Firestore under `users/{uid}` subcollections; auth is Firebase
email/password. The web API key in `src/lib/firebase/client.ts` is public by design —
access control is enforced by Firestore security rules (`firestore.rules`).
