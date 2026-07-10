"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export interface AuthState {
  user: User | null;
  /** true until the first auth callback fires */
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      setState({ user, loading: false });
    });
  }, []);

  return state;
}
