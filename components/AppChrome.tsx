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
      <header className="sticky top-0 z-40 border-b border-line/60 bg-mist/75 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[430px] items-center justify-between px-4">
          {/* Marca */}
          <Link href="/captura" className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 place-items-center rounded-xl bg-teal text-[15px] font-extrabold text-white shadow-sm"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              I
            </span>
            <span className="font-display text-[17px] font-extrabold leading-none tracking-tight text-ink">
              Isabella <span className="text-teal">Bacalar</span>
            </span>
          </Link>

          {/* Usuario + salir */}
          <div className="flex items-center gap-2">
            {nombre && (
              <span className="flex items-center gap-2 rounded-full bg-card/70 py-1 pl-1 pr-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-deep text-xs font-bold text-white">
                  {nombre[0]}
                </span>
                <span className="hidden text-sm font-semibold text-ink sm:inline">{nombre}</span>
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