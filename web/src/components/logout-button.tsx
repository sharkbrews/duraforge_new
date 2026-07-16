"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm font-semibold text-slate-brand hover:text-orange"
    >
      Sign out
    </button>
  );
}
