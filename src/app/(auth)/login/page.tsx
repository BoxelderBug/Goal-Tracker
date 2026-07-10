"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim().toLowerCase(), password);
      router.replace("/");
    } catch {
      setError("Sign in failed. Check your email and password.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg">Sign in</h2>
      <Field label="Email">
        <Input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password">
        <Input
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
        />
        Show password
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Signing in…" : "Sign In"}
      </Button>
      <div className="flex justify-between text-sm">
        <Link className="text-accent-strong hover:underline" href="/reset-password">
          Forgot password?
        </Link>
        <Link className="text-accent-strong hover:underline" href="/register">
          Create an account
        </Link>
      </div>
    </form>
  );
}
