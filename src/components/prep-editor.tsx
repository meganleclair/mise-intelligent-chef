"use client";

import { useMemo, useState, useTransition } from "react";
import type { PrepItem, PrepUrgency } from "@/lib/types/recipe";
import { updatePrepItems } from "@/lib/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const URGENCY: { value: PrepUrgency | ""; label: string }[] = [
  { value: "", label: "Timing (optional)" },
  { value: "before_start", label: "Before you start" },
  { value: "same_day", label: "Same day" },
  { value: "overnight", label: "Overnight or longer" },
];

type Props = {
  recipeId: string;
  initialItems: PrepItem[];
};

export function PrepEditor({ recipeId, initialItems }: Props) {
  const [items, setItems] = useState<PrepItem[]>(() =>
    [...initialItems].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items],
  );

  function save(next: PrepItem[]) {
    setMessage(null);
    startTransition(async () => {
      const res = await updatePrepItems(recipeId, next);
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setMessage("Saved.");
    });
  }

  function add() {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `prep-${Date.now()}`;
    const next = [
      ...items,
      {
        id,
        text: "",
        sortOrder: items.length,
      },
    ];
    setItems(next);
    save(next);
  }

  function remove(id: string) {
    const filtered = items.filter((p) => p.id !== id);
    const next = filtered.map((p, i) => ({ ...p, sortOrder: i }));
    setItems(next);
    save(next);
  }

  function patch(id: string, partial: Partial<PrepItem>) {
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...partial } : p)),
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl text-text-heading">Before you begin</h2>
        <p className="text-sm text-muted-foreground">
          Shape the timeline yourself—add, edit, or remove what your kitchen actually needs.
        </p>
      </div>

      <ul className="space-y-4">
        {sorted.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`prep-${item.id}`}>What to do</Label>
                  <Textarea
                    id={`prep-${item.id}`}
                    value={item.text}
                    onChange={(e) => {
                      patch(item.id, { text: e.target.value });
                    }}
                    rows={3}
                    placeholder="e.g. Soak beans overnight"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`lead-${item.id}`}>Lead time (minutes)</Label>
                    <Input
                      id={`lead-${item.id}`}
                      type="number"
                      min={0}
                      value={item.leadTimeMinutes ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        patch(item.id, {
                          leadTimeMinutes: v === "" ? undefined : Number(v),
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`urg-${item.id}`}>When</Label>
                    <select
                      id={`urg-${item.id}`}
                      className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      value={item.urgency ?? ""}
                      onChange={(e) => {
                        const v = e.target.value as PrepUrgency | "";
                        patch(item.id, {
                          urgency: v === "" ? undefined : v,
                        });
                      }}
                    >
                      {URGENCY.map((o) => (
                        <option key={o.value || "none"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => remove(item.id)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={add} disabled={pending}>
          Add prep step
        </Button>
        <Button
          type="button"
          onClick={() => save(items)}
          disabled={pending}
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {message ? (
          <span className="text-sm text-muted-foreground" role="status">
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
