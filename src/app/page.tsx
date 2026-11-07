"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ImageIcon,
  Loader2,
  ShieldCheck,
  CreditCard,
  Camera,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const TEMP_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1572635196233-2242c0cbc0fe?auto=format&fit=crop&w=800&q=80";

const STYLE_PRESETS = [
  { id: "studio", label: "Estudio blanco" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "minimal", label: "Minimal" },
  { id: "luxury", label: "Luxury" },
] as const;

type ActiveTab = "studio" | "shield" | "pricing";

type StoreProfile = {
  photo_credits: number | null;
  plan_type: string | null;
  subscription_active: boolean | null;
};

export default function Home() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("studio");
  const [stylePreset, setStylePreset] =
    useState<(typeof STYLE_PRESETS)[number]["id"]>("studio");
  const [credits, setCredits] = useState(0);
  const [planType, setPlanType] = useState("free");
  const [proActive, setProActive] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionError) {
        console.error("Error de sesión:", sessionError);
        router.replace("/login");
        return;
      }

      const session = data.session;
      if (!session?.user?.email) {
        router.replace("/login");
        return;
      }

      const email = session.user.email.toLowerCase();
      setUserEmail(email);

      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("photo_credits, plan_type, subscription_active")
        .eq("email", email)
        .maybeSingle();

      if (cancelled) return;

      if (storeError) {
        console.error("Error al cargar tienda:", storeError);
        setError(storeError.message);
      } else if (store) {
        applyStoreProfile(store as StoreProfile);
      } else {
        const { data: created, error: createError } = await supabase
          .from("stores")
          .insert({
            email,
            photo_credits: 3,
            plan_type: "free",
            subscription_active: false,
          })
          .select("photo_credits, plan_type, subscription_active")
          .single();

        if (createError) {
          console.error("Error al crear tienda:", createError);
          setError(createError.message);
        } else if (created) {
          applyStoreProfile(created as StoreProfile);
        }
      }

      setAuthReady(true);
    };

    const applyStoreProfile = (store: StoreProfile) => {
      setCredits(store.photo_credits ?? 0);
      const plan = store.plan_type ?? "free";
      setPlanType(plan);
      setProActive(
        Boolean(store.subscription_active) ||
          plan === "pro" ||
          plan === "pro_monthly",
      );
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/login");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleGeneratePhoto = async () => {
    if (!userEmail) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: TEMP_PRODUCT_IMAGE,
          stylePreset,
          storeEmail: userEmail,
        }),
      });

      const data = (await response.json()) as {
        result_image_url?: string;
        photo_credits?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudo generar la foto");
        if (response.status === 403) {
          setCredits(0);
        }
        return;
      }

      if (data.result_image_url) {
        setResultImageUrl(data.result_image_url);
      }
      if (typeof data.photo_credits === "number") {
        setCredits(data.photo_credits);
      }
    } catch {
      setError("Error de conexión con el motor de fotos IA");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCheckout = (planId: string) => {
    if (!userEmail) return;

    setCheckoutPlanId(planId);
    setError(null);

    const paymentLink =
      planId === "pack_50"
        ? "https://checkout.wompi.co/l/test_pack"
        : "https://checkout.wompi.co/l/test_pro";

    // La pasarela reenviará esta reference al webhook /api/webhooks/payments
    window.location.href = `${paymentLink}?reference=${encodeURIComponent(`${userEmail}___${planId}`)}`;
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "studio", label: "Fotos IA", icon: <Camera className="w-4 h-4" /> },
    {
      id: "shield",
      label: "Escudo PRO",
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: "pricing",
      label: "Planes y Créditos",
      icon: <CreditCard className="w-4 h-4" />,
    },
  ];

  if (!authReady || !userEmail) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-400">
        <p className="text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verificando sesión...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="flex min-h-screen">
        <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-white text-sm">EscalaShop</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate" title={userEmail}>
              {userEmail}
            </p>
          </div>

          <nav className="flex flex-col gap-1.5 flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl border transition text-left ${
                  activeTab === tab.id
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                    : "border-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 px-3 py-2 rounded-xl font-semibold">
              Créditos: {credits}
              <div className="font-normal text-[10px] text-indigo-300/80 mt-0.5">
                Plan: {planType}
                {proActive ? " · PRO" : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-200 py-2 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <header className="border-b border-slate-800 pb-6">
              <h1 className="text-2xl font-bold text-white">
                {activeTab === "studio"
                  ? "Fotos IA"
                  : activeTab === "shield"
                    ? "Escudo PRO"
                    : "Planes y Créditos"}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Motor de fotos IA y protección logística para tu tienda.
              </p>
            </header>

            {error ? (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}

            {activeTab === "studio" ? (
              <div className="grid md:grid-cols-2 gap-6">
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                    Imagen original (MVP)
                  </h2>
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={TEMP_PRODUCT_IMAGE}
                      alt="Producto de ejemplo"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-medium">Estilo</p>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setStylePreset(preset.id)}
                          className={`text-xs py-2 px-3 rounded-lg border transition ${
                            stylePreset === preset.id
                              ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                              : "border-slate-700 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGeneratePhoto}
                    disabled={isGenerating || credits <= 0}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generando con IA...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        Generar foto profesional
                      </>
                    )}
                  </button>
                </section>

                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                    Resultado
                  </h2>
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                    {isGenerating ? (
                      <p className="text-sm text-indigo-300 flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Procesando (~2.5s)...
                      </p>
                    ) : resultImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resultImageUrl}
                        alt="Resultado generado por IA"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <p className="text-xs text-slate-500 px-6 text-center">
                        Elige un estilo y pulsa generar para ver el resultado de
                        la API.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "shield" ? (
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl ${proActive ? "bg-emerald-600" : "bg-slate-800"}`}
                  >
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      EscalaShield PRO
                    </h2>
                    <p className="text-sm text-slate-400">
                      Validación de direcciones y confirmación de pedidos
                      contraentrega.
                    </p>
                  </div>
                </div>
                {proActive ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-200">
                    Tu plan PRO está activo. Los pedidos de Shopify se auditan
                    automáticamente y tus clientes confirman despacho desde el
                    enlace de guía.
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200">
                    Activa el plan PRO en &quot;Planes y Créditos&quot; para
                    habilitar el escudo logístico completo.
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === "pricing" ? (
              <section className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col">
                  <h2 className="text-lg font-bold text-white">Pack 50 Fotos</h2>
                  <p className="text-sm text-slate-400 flex-1">
                    Recarga única de 50 créditos para el estudio de fotos IA.
                    Ideal para catálogos y lanzamientos.
                  </p>
                  <p className="text-2xl font-bold text-indigo-300">
                    $49.000 COP
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCheckout("pack_50")}
                    disabled={checkoutPlanId !== null}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition"
                  >
                    {checkoutPlanId === "pack_50"
                      ? "Procesando pago seguro..."
                      : "Comprar pack de 50 créditos"}
                  </button>
                </div>

                <div className="bg-slate-900 border border-emerald-800/50 rounded-2xl p-6 space-y-4 flex flex-col ring-1 ring-emerald-500/20">
                  <h2 className="text-lg font-bold text-white">
                    Plan PRO Mensual
                  </h2>
                  <p className="text-sm text-slate-400 flex-1">
                    Escudo logístico + 100 créditos de fotos IA cada mes.
                    Confirmación de pedidos y auditoría de direcciones.
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    $129.000 COP / mes
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCheckout("pro_monthly")}
                    disabled={checkoutPlanId !== null}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition"
                  >
                    {checkoutPlanId === "pro_monthly"
                      ? "Procesando pago seguro..."
                      : "Activar Plan PRO"}
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
