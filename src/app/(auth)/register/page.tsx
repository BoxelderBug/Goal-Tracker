"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth, PROFILE_COLLECTION } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /\d/.test(p) },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (PASSWORD_RULES.some((rule) => !rule.test(password))) {
      setError("Password does not meet the requirements.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();
    try {
      const credential = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        normalizedEmail,
        password,
      );
      await setDoc(doc(getDb(), PROFILE_COLLECTION, credential.user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        username: trimmedUsername,
        usernameKey: trimmedUsername.toLowerCase(),
        createdAt: new Date().toISOString(),
      });
      router.replace("/");
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : "Account creation failed. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg">Create account</h2>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name">
          <Input
            autoComplete="given-name"
            required
            maxLength={80}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Field>
        <Field label="Last Name">
          <Input
            autoComplete="family-name"
            required
            maxLength={80}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Email">
        <Input
          type="email"
          autoComplete="email"
          required
          maxLength={120}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Username">
        <Input
          autoComplete="username"
          required
          maxLength={80}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          autoComplete="new-password"
          required
          maxLength={120}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <ul aria-live="polite" className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.id} className={cn(met ? "text-success" : "text-muted")}>
              {met ? "✓" : "•"} {rule.label}
            </li>
          );
        })}
      </ul>
      <Field label="Confirm Password">
        <Input
          type="password"
          autoComplete="new-password"
          required
          maxLength={120}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Creating account…" : "Create Account"}
      </Button>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link className="text-accent-strong hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
