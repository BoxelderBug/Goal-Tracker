"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
      setSent(true);
    } catch {
      setError("Could not send the reset email. Check the address and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg">Check your inbox</h2>
        <p className="text-sm text-muted">
          If an account exists for {email.trim()}, a password reset link is on its way.
        </p>
        <Link className="text-sm text-accent-strong hover:underline" href="/login">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg">Reset password</h2>
      <Field label="Email">
        <Input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Sending…" : "Send Reset Link"}
      </Button>
      <Link className="text-sm text-accent-strong hover:underline" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
