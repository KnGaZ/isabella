"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "./LogoutButton";
import AppNav from "./AppNav";

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [nombre, setNombre] = useState("");
  const [roleCode, setRoleCode] = useState<string | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: perfil } = await supabase
        .from("users")
        .select("full_name, role:roles(code)")
        .eq("auth_uid", data.user.id)
        .maybeSingle();
      setNombre(perfil?.full_name ?? "");
      setRoleCode((perfil?.role as { code?: string } | null)?.code ?? null);
    });
  }, [pathname]);

  if (pathname === "/login") return <>{children}</>;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-mist/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[430px] items-center justify-between px-4 py-3">
          <Link href="/captura" className="font-display text-lg font-extrabold tracking-tight text-ink">
            Isabella <span className="text-teal">·</span> Bacalar
          </Link>
          <div className="flex items-center gap-2">
            {nombre && (
              <span className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1.5 pr-3 text-sm font-semibold text-ink">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-teal text-xs font-bold text-white">
                  {nombre[0]}
                </span>
                <span className="hidden sm:inline">{nombre}</span>
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="flex-1 pb-20">{children}</div>

      <AppNav roleCode={roleCode} />
    </>
  );
}