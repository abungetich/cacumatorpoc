"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <Button variant="secondary" onClick={() => setOpen((state) => !state)} className="gap-2">
        {user.profilePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.profilePhoto}
            alt={user.name}
            className="h-7 w-7 rounded-full border border-[var(--border)] object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-contrast)]">
            {user.name.charAt(0)}
          </div>
        )}
        <span className="hidden sm:inline">{user.name}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 top-12 z-30 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--surface-2)]"
            onClick={async () => {
              await logout();
              setOpen(false);
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
