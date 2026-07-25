import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/** Shown when a capture kind is switched off but its page is opened directly. */
export function CaptureDisabledNotice({ label }: { label: string }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-tone-behind">
      <span className="text-sm text-muted">
        {label} are turned off, so they stay out of the menus and views. Anything here is still saved.
      </span>
      <Link href="/settings">
        <Button size="sm">Turn back on</Button>
      </Link>
    </Card>
  );
}
