"use client";

/*
 * Subscription hook: synchronous setState inside the effect is intentional —
 * it resets state when the query changes before the first snapshot arrives.
 * This is exactly the external-system-subscription case the rule's own docs
 * endorse, so the reset-on-resubscribe warning is disabled.
 */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { onSnapshot, type Query } from "firebase/firestore";

export interface QueryState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribe to a Firestore query. Pass `null` to stay idle (e.g. before uid is
 * known). The query is keyed by `deps` so it only re-subscribes when inputs
 * actually change — never pass a freshly built Query every render without deps.
 */
export function useCollection<T>(
  build: () => Query<T> | null,
  deps: React.DependencyList,
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ data: [], loading: true, error: null });

  useEffect(() => {
    const query = build();
    if (!query) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    const unsubscribe = onSnapshot(
      query,
      (snap) => setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null }),
      (error) => setState({ data: [], loading: false, error }),
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
