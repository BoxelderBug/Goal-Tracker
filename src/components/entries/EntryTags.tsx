import Link from "next/link";
import type { Entry } from "@/types/models";
import { entryTags, tagKey } from "@/lib/domain/tags";

/** An entry's tags as small chips, each linking to that tag's filtered list. */
export function EntryTags({ entry }: { entry: Pick<Entry, "tags"> }) {
  const tags = entryTags(entry);
  if (!tags.length) return null;
  return (
    <span className="mt-0.5 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Link
          key={tagKey(tag)}
          href={`/entries?tag=${encodeURIComponent(tag)}`}
          className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent-strong transition hover:brightness-95"
        >
          {tag}
        </Link>
      ))}
    </span>
  );
}
