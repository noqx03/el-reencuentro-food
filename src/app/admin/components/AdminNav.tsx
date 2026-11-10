"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Utensils, 
  Users, 
  FileText, 
  Vault, 
  ArrowLeft 
} from "lucide-react";

export default function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Catálogo & Precios",
      href: "/admin/productos",
      icon: Utensils,
    },
    {
      label: "Gestión de Personal",
      href: "/admin/usuarios",
      icon: Users,
    },
    {
      label: "Historial & Reportes",
      href: "/admin/reportes",
      icon: FileText,
    },
    {
      label: "Control de Caja",
      href: "/caja",
      icon: Vault,
    },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <Link
          href="/pos"
          className="p-2 bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al POS</span>
        </Link>
        <span className="text-slate-700 font-light">|</span>
        <h2 className="text-sm font-bold text-indigo-400 tracking-wide uppercase">
          Panel Administrativo
        </h2>
      </div>

      {/* Pestañas de Secciones */}
      <nav className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}