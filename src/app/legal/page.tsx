import Link from "next/link";

export const metadata = {
  title: "Legal · Goal Tracker",
};

export default function LegalPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 text-text">
      <div>
        <Link href="/" className="text-sm text-accent-strong underline">← Back to app</Link>
        <h1 className="mt-2 font-display text-3xl">Legal</h1>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Privacy</h2>
        <p className="text-sm text-muted">
          Goal Tracker stores the goals and entries you create in your own account using Google Firebase.
          Your data is used only to provide the app to you and is not sold or shared with third parties.
          Authentication is handled by Firebase Authentication; we store your email address to identify your
          account. You can export or delete your data at any time from the Data page.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Terms of use</h2>
        <p className="text-sm text-muted">
          Goal Tracker is provided as-is, without warranty of any kind. It is a personal productivity tool;
          you are responsible for keeping your own backups of important data (see the Data page for JSON
          export). We may update or discontinue features over time. By using the app you agree to use it for
          lawful, personal goal-tracking purposes.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Contact</h2>
        <p className="text-sm text-muted">
          Questions about your data or this app can be raised through the project&apos;s repository.
        </p>
      </section>
    </main>
  );
}
