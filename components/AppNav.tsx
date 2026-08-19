"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReceiptText, LayoutDashboard, ShoppingBag, Users, Settings } from "lucide-react";

/* roles: qué roles ven cada pestaña. Reservas se agregará cuando se construya. */
const TABS = [
  { href: "/captura", label: "Captura", Icon: ReceiptText, roles: ["ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, roles: ["ADMIN", "GERENCIA", "SOCIO", "RECEPCION"] },
  { href: "/gastos", label: "Gastos", Icon: ShoppingBag, roles: ["ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/socios", label: "Socios", Icon: Users, roles: ["ADMIN", "GERENCIA", "SOCIO"] },
  { href: "/admin", label: "Admin", Icon: Settings, roles: ["ADMIN"] },
];

const base = "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors";

export default function AppNav({ roleCode }: { roleCode: string | null }) {
  const pathname = usePathname();
  if (!roleCode) return null;
  const tabs = TABS.filter((t) => t.roles.includes(roleCode));
  if (tabs.length === 0) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card">
      <div className="mx-auto flex w-full max-w-[430px] items-stretch justify-between px-2">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={`${base} ${active ? "text-teal" : "text-muted hover:text-ink"}`}>
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}