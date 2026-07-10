"use client";

/*
 * Subscription hook: synchronous setState inside the effect is intentional —
 * it resets state when the subscription target changes before the first
 * snapshot arrives. This is exactly the external-system-subscription case the
 * rule's own docs endorse, so the reset-on-resubscribe warning is disabled.
 */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { onSnapshot, type DocumentReference } from "firebase/firestore";

export interface DocState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useDoc<T>(
  build: () => DocumentReference<T> | null,
  deps: React.DependencyList,
): DocState<T> {
  const [state, setState] = useState<DocState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    const ref = build();
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    const unsubscribe = onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? snap.data() : null, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
