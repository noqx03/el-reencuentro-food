"use client";
export const dynamic = "force-dynamic";



import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Credenciales inválidas. Verificá tu correo y contraseña.");
        setLoading(false);
        return;
      }

      router.push("/pos");
      router.refresh();
    } catch (err) {
      setError("Ocurrió un error inesperado. Intentalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-3 text-amber-500">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-wide">
            El Reencuentro Food
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Gestión de Ventas, Menú y Stock
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@elreencuentro.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              "INICIAR SESIÓN"
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-500">
            Usuarios de prueba: <br />
            <span className="text-slate-400">admin@elreencuentro.com</span> (pass: admin123) <br />
            <span className="text-slate-400">ventas@elreencuentro.com</span> (pass: ventas123)
          </p>
        </div>

      </div>
    </div>
  );
}