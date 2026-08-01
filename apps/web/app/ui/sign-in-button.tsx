"use client";

import { useFormStatus } from "react-dom";

export function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="button button-primary auth-submit"
      type="submit"
      disabled={pending}
    >
      {pending ? "Signing in…" : "Continue securely"}
    </button>
  );
}
