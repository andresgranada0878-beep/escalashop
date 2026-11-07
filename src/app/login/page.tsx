"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Mail, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.user) {
          const { error: storeError } = await supabase.from("stores").insert({
            email: trimmedEmail,
            photo_credits: 3,
            plan_type: "free",
            subscription_active: false,
          });

          if (storeError && storeError.code !== "23505") {
            console.error("Error al crear tienda:", storeError);
            setError(
              `Cuenta creada, pero no se pudo inicializar la tienda: ${storeError.message}`,
            );
            return;
          }
        }

        if (data.session) {
          router.replace("/");
          return;
        }

        setInfo(
          "Cuenta creada. Revisa tu correo para confirmar, o inicia sesión si la confirmación está desactivada.",
        );
        setMode("login");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace("/");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#2C2A29] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center bg-[#8C6D53] p-3 rounded-2xl mb-2 shadow-[0_10px_24px_-14px_rgba(140,109,83,0.7)]">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-[#2C2A29]">EscalaShop</h1>
          <p className="text-sm text-[#8A857E]">
            Accede a tu panel de fotos IA y escudo logístico
          </p>
        </div>

        <div className="bg-white border border-[#E6E2DC] rounded-3xl p-6 shadow-[0_16px_40px_-28px_rgba(44,42,41,0.35)] space-y-6">
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#F5F3EF] rounded-xl border border-[#E6E2DC]">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setInfo(null);
              }}
              className={`text-xs font-semibold py-2.5 rounded-lg transition ${
                mode === "login"
                  ? "bg-[#8C6D53] text-white shadow-sm"
                  : "text-[#8A857E] hover:text-[#2C2A29]"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setInfo(null);
              }}
              className={`text-xs font-semibold py-2.5 rounded-lg transition ${
                mode === "register"
                  ? "bg-[#8C6D53] text-white shadow-sm"
                  : "text-[#8A857E] hover:text-[#2C2A29]"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8A857E]">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A39E96] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#E6E2DC] focus:border-[#8C6D53] rounded-xl pl-10 pr-3 py-2.5 text-sm text-[#2C2A29] outline-none transition"
                  placeholder="tu@tienda.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8A857E]">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A39E96] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#E6E2DC] focus:border-[#8C6D53] rounded-xl pl-10 pr-3 py-2.5 text-sm text-[#2C2A29] outline-none transition"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              </div>
            </div>

            {error ? (
              <p className="text-xs text-[#9B4D3A] bg-[#F8EDE8] border border-[#E8D0C6] rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}

            {info ? (
              <p className="text-xs text-[#4F5E45] bg-[#F3F6F0] border border-[#C9D4BE] rounded-xl px-3 py-2">
                {info}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#8C6D53] hover:bg-[#735841] disabled:opacity-50 text-white font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 transition shadow-[0_10px_24px_-14px_rgba(140,109,83,0.7)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === "login" ? "Entrando..." : "Creando cuenta..."}
                </>
              ) : mode === "login" ? (
                "Entrar al dashboard"
              ) : (
                "Registrarme (3 créditos gratis)"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
