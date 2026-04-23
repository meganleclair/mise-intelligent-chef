"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finishCookingWithFeedback } from "@/lib/actions/sessions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StarRatingInput } from "@/components/star-rating";

type Props = {
  recipeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CookFinishDialog({ recipeId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saveToKitchen, setSaveToKitchen] = useState(true);
  const [rating, setRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSaveToKitchen(true);
      setRating(null);
      setError(null);
    }
    onOpenChange(next);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await finishCookingWithFeedback(recipeId, {
        saveToKitchen,
        rating,
      });
      if (!result.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      handleOpenChange(false);
      router.push(`/recipes/${recipeId}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-text-heading">
            You did it
          </DialogTitle>
          <DialogDescription>
            Save this one to My Kitchen and note how it turned out—both are
            optional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-heading">
              How was it?
            </p>
            <StarRatingInput value={rating} onChange={setRating} idPrefix="cook-rate" />
            <p className="text-xs text-muted-foreground">
              Tap a star to rate; tap again to clear.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="save-kitchen"
              checked={saveToKitchen}
              onCheckedChange={(checked) =>
                setSaveToKitchen(checked === true)
              }
            />
            <Label htmlFor="save-kitchen" className="font-normal leading-snug">
              Save to My Kitchen
            </Label>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="default"
            className="w-full"
            disabled={pending}
            onClick={submit}
          >
            {pending ? "Saving…" : "Done"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
