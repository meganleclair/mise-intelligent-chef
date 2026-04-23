"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importAndSaveRecipe } from "@/lib/actions/recipes";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ImportRecipeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    const url = String(formData.get("url") ?? "");
    setError(null);
    startTransition(async () => {
      const res = await importAndSaveRecipe(url);
      if (!res.ok) {
        setError("error" in res ? res.error : "Something went wrong.");
        return;
      }
      router.push(`/recipes/${res.recipeId}`);
      router.refresh();
    });
  }

  return (
    <form
      action={(fd) => onSubmit(fd)}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="recipe-url" className="text-sm text-muted-foreground">
          Recipe URL
        </Label>
        <Input
          id="recipe-url"
          name="url"
          type="url"
          required
          placeholder="https://"
          className="bg-card"
          disabled={pending}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants(), "shrink-0")}
      >
        {pending ? "Importing…" : "Import recipe"}
      </button>
      {error ? (
        <p className="text-sm text-destructive sm:w-full" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
