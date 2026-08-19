"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const cerrarSesion = async () => {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <button
      onClick={cerrarSesion}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:border-out/40 hover:text-out disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut size={16} />
      {loading ? "Saliendo…" : "Salir"}
    </button>
  );
}
