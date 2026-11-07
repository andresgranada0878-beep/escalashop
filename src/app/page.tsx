"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
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

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-escala-display",
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-escala-body",
});

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

    window.location.href = `${paymentLink}?reference=${encodeURIComponent(`${userEmail}___${planId}`)}`;
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "studio", label: "Estudio Fotos IA", icon: <Camera className="w-4 h-4" /> },
    {
      id: "shield",
      label: "Escudo Contraentrega",
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
      <main
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen bg-[#FAF9F6] flex items-center justify-center text-[#8C6D53]`}
        style={{ fontFamily: "var(--font-escala-body), sans-serif" }}
      >
        <p className="text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verificando sesión...
        </p>
      </main>
    );
  }

  return (
    <main
      className={`${bodyFont.variable} ${displayFont.variable} min-h-screen bg-[#FAF9F6] text-[#2C2A29]`}
      style={{ fontFamily: "var(--font-escala-body), sans-serif" }}
    >
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r border-[#E6E2DC] bg-[#F5F3EF] p-5 flex flex-col gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8C6D53] text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <span
                className="text-xl font-semibold tracking-tight text-[#2C2A29]"
                style={{ fontFamily: "var(--font-escala-display), serif" }}
              >
                EscalaShop
              </span>
            </div>
            <p
              className="text-[11px] text-[#8A857E] truncate pl-0.5"
              title={userEmail}
            >
              {userEmail}
            </p>
          </div>

          <nav className="flex flex-col gap-1.5 flex-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 text-[13px] font-medium px-3.5 py-2.5 rounded-2xl border transition text-left ${
                    active
                      ? "border-[#E6E2DC] bg-white text-[#2C2A29] shadow-[0_8px_24px_-12px_rgba(44,42,41,0.18)]"
                      : "border-transparent text-[#8A857E] hover:bg-white/70 hover:text-[#2C2A29]"
                  }`}
                >
                  <span
                    className={active ? "text-[#8C6D53]" : "text-[#B0A99F]"}
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="space-y-3 pt-3 border-t border-[#E6E2DC]">
            <div className="rounded-2xl border border-[#E6E2DC] bg-white px-3.5 py-3 shadow-[0_6px_20px_-14px_rgba(44,42,41,0.2)]">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#A39E96]">
                Créditos
              </p>
              <p
                className="mt-0.5 text-2xl font-semibold text-[#2C2A29]"
                style={{ fontFamily: "var(--font-escala-display), serif" }}
              >
                {credits}
              </p>
              <p className="text-[11px] text-[#8A857E] mt-0.5">
                Plan {planType}
                {proActive ? " · PRO" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-xs text-[#8A857E] hover:text-[#2C2A29] py-2 rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 p-6 sm:p-8 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <header className="border-b border-[#E6E2DC] pb-6">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#A39E96] mb-1">
                Panel EscalaShop
              </p>
              <h1
                className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#2C2A29]"
                style={{ fontFamily: "var(--font-escala-display), serif" }}
              >
                {activeTab === "studio"
                  ? "Estudio Fotos IA"
                  : activeTab === "shield"
                    ? "Escudo Contraentrega"
                    : "Planes y Créditos"}
              </h1>
              <p className="text-sm text-[#8A857E] mt-2 max-w-xl leading-relaxed">
                Herramienta calmada para crear catálogo visual y proteger tus
                envíos contraentrega.
              </p>
            </header>

            {error ? (
              <p className="text-xs text-[#9B4D3A] bg-[#F8EDE8] border border-[#E8D0C6] rounded-2xl px-4 py-3">
                {error}
              </p>
            ) : null}

            {activeTab === "studio" ? (
              <div className="grid md:grid-cols-2 gap-6">
                <section className="bg-white border border-[#E6E2DC] rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-28px_rgba(44,42,41,0.35)]">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A39E96]">
                    Imagen original
                  </h2>
                  <div className="relative aspect-square rounded-2xl overflow-hidden border border-[#E6E2DC] bg-[#F5F3EF]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={TEMP_PRODUCT_IMAGE}
                      alt="Producto de ejemplo"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[#8A857E]">Estilo</p>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setStylePreset(preset.id)}
                          className={`text-xs py-2.5 px-3 rounded-xl border transition ${
                            stylePreset === preset.id
                              ? "border-[#8C6D53] bg-[#F3EBE4] text-[#2C2A29] font-semibold"
                              : "border-[#E6E2DC] text-[#8A857E] hover:border-[#D4CEC4] hover:bg-[#FAF9F6]"
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
                    className="w-full py-3 bg-[#8C6D53] hover:bg-[#735841] disabled:opacity-45 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 transition shadow-[0_10px_24px_-14px_rgba(140,109,83,0.7)]"
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

                <section className="bg-white border border-[#E6E2DC] rounded-2xl p-5 space-y-4 shadow-[0_16px_40px_-28px_rgba(44,42,41,0.35)]">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A39E96]">
                    Resultado
                  </h2>
                  <div className="relative aspect-square rounded-2xl overflow-hidden border border-[#E6E2DC] bg-[#F5F3EF] flex items-center justify-center">
                    {isGenerating ? (
                      <p className="text-sm text-[#8C6D53] flex items-center gap-2">
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
                      <p className="text-xs text-[#A39E96] px-8 text-center leading-relaxed">
                        Elige un estilo y genera para ver el resultado
                        profesional.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "shield" ? (
              <section className="bg-white border border-[#E6E2DC] rounded-2xl p-6 sm:p-8 space-y-5 shadow-[0_16px_40px_-28px_rgba(44,42,41,0.35)]">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3.5 rounded-2xl ${
                      proActive ? "bg-[#6B7F5A]" : "bg-[#F5F3EF]"
                    }`}
                  >
                    <ShieldCheck
                      className={`w-6 h-6 ${proActive ? "text-white" : "text-[#8C6D53]"}`}
                    />
                  </div>
                  <div>
                    <h2
                      className="text-2xl font-semibold text-[#2C2A29]"
                      style={{
                        fontFamily: "var(--font-escala-display), serif",
                      }}
                    >
                      Escudo Contraentrega
                    </h2>
                    <p className="text-sm text-[#8A857E] mt-0.5">
                      Validación de direcciones y confirmación de pedidos
                      contraentrega.
                    </p>
                  </div>
                </div>
                {proActive ? (
                  <div className="rounded-2xl border border-[#C9D4BE] bg-[#F3F6F0] p-4 text-sm text-[#4F5E45] leading-relaxed">
                    Tu plan PRO está activo. Los pedidos de Shopify se auditan
                    automáticamente y tus clientes confirman despacho desde el
                    enlace de guía.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#E8D9C8] bg-[#FBF6F0] p-4 text-sm text-[#7A624C] leading-relaxed">
                    Activa el plan PRO en &quot;Planes y Créditos&quot; para
                    habilitar el escudo logístico completo.
                  </div>
                )}
              </section>
            ) : null}

            {activeTab === "pricing" ? (
              <section className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-[#E6E2DC] rounded-2xl p-6 space-y-4 flex flex-col shadow-[0_16px_40px_-28px_rgba(44,42,41,0.35)]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#A39E96]">
                    Recarga
                  </p>
                  <h2
                    className="text-2xl font-semibold text-[#2C2A29]"
                    style={{ fontFamily: "var(--font-escala-display), serif" }}
                  >
                    Pack 50 Fotos
                  </h2>
                  <p className="text-sm text-[#8A857E] flex-1 leading-relaxed">
                    Recarga única de 50 créditos para el estudio de fotos IA.
                    Ideal para catálogos y lanzamientos.
                  </p>
                  <p
                    className="text-3xl font-semibold text-[#8C6D53]"
                    style={{ fontFamily: "var(--font-escala-display), serif" }}
                  >
                    $49.000 COP
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCheckout("pack_50")}
                    disabled={checkoutPlanId !== null}
                    className="w-full py-3 bg-[#8C6D53] hover:bg-[#735841] disabled:opacity-45 text-white font-semibold text-sm rounded-2xl transition shadow-[0_10px_24px_-14px_rgba(140,109,83,0.7)]"
                  >
                    {checkoutPlanId === "pack_50"
                      ? "Procesando pago seguro..."
                      : "Comprar pack de 50 créditos"}
                  </button>
                </div>

                <div className="bg-white border border-[#D6DEC8] rounded-2xl p-6 space-y-4 flex flex-col shadow-[0_16px_40px_-28px_rgba(44,42,41,0.35)] ring-1 ring-[#C9D4BE]/60">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#6B7F5A]">
                    Recomendado
                  </p>
                  <h2
                    className="text-2xl font-semibold text-[#2C2A29]"
                    style={{ fontFamily: "var(--font-escala-display), serif" }}
                  >
                    Plan PRO Mensual
                  </h2>
                  <p className="text-sm text-[#8A857E] flex-1 leading-relaxed">
                    Escudo logístico + 100 créditos de fotos IA cada mes.
                    Confirmación de pedidos y auditoría de direcciones.
                  </p>
                  <p
                    className="text-3xl font-semibold text-[#6B7F5A]"
                    style={{ fontFamily: "var(--font-escala-display), serif" }}
                  >
                    $129.000 COP
                    <span className="text-base font-medium text-[#8A857E]">
                      {" "}
                      / mes
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCheckout("pro_monthly")}
                    disabled={checkoutPlanId !== null}
                    className="w-full py-3 bg-[#6B7F5A] hover:bg-[#556648] disabled:opacity-45 text-white font-semibold text-sm rounded-2xl transition shadow-[0_10px_24px_-14px_rgba(107,127,90,0.55)]"
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
