"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { MAX_TAGS_PER_ENTRY, normalizeTags, tagKey } from "@/lib/domain/tags";
import { Input } from "@/components/ui/Input";

/**
 * Chip-style tag editor. Commits on Enter, comma or blur; Backspace on an empty
 * box removes the last chip. `suggestions` fills a datalist so a tag gets
 * spelled the same way the second time.
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag…",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const listId = useId();
  const [draft, setDraft] = useState("");
  const full = value.length >= MAX_TAGS_PER_ENTRY;

  function commit(raw: string) {
    const next = normalizeTags([...value, ...raw.split(",")]);
    setDraft("");
    if (next.length !== value.length || next.some((t, i) => t !== value[i])) onChange(next);
  }

  function remove(tag: string) {
    onChange(value.filter((t) => tagKey(t) !== tagKey(tag)));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      // Enter would otherwise submit the surrounding entry form.
      event.preventDefault();
      if (draft.trim()) commit(draft);
      return;
    }
    if (event.key === "Backspace" && !draft && value.length) {
      event.preventDefault();
      remove(value[value.length - 1]);
    }
  }

  const unused = suggestions.filter((s) => !value.some((t) => tagKey(t) === tagKey(s)));

  return (
    <div className="flex flex-col gap-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tagKey(tag)}>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-strong">
                {tag}
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="text-accent-strong/70 transition hover:text-accent-strong"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => draft.trim() && commit(draft)}
        list={listId}
        maxLength={30}
        disabled={full}
        placeholder={full ? `Max ${MAX_TAGS_PER_ENTRY} tags` : placeholder}
        aria-label="Add a tag"
      />
      <datalist id={listId}>
        {unused.slice(0, 40).map((s) => (
          <option key={tagKey(s)} value={s} />
        ))}
      </datalist>
    </div>
  );
}
