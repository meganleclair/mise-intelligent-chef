import { UpdatePasswordForm } from "@/components/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <p className="font-serif text-2xl text-text-heading">Set a new password</p>
          <p className="text-sm text-muted-foreground">
            Choose a new password for your Mise account.
          </p>
        </div>
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
