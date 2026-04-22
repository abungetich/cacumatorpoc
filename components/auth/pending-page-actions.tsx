"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function PendingPageActions() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <Button
        variant="secondary"
        className="rounded-full"
        onClick={() => {
          void signOut({ callbackUrl: "/login" });
        }}
      >
        Back to sign in
      </Button>
      <Button
        className="cacumator-auth-cta rounded-full"
        onClick={() => {
          void signOut({ callbackUrl: "/register" });
        }}
      >
        Register another mentor
      </Button>
    </div>
  );
}
