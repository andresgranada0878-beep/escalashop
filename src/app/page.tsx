"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ImageIcon,
  Loader2,
  ShieldCheck,
  CreditCard,
  Camera,
} from "lucide-react";

const STORE_EMAIL = "admin@tienda.com";

const TEMP_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1572635196233-2242c0cbc0fe?auto=format&fit=crop&w=800&q=80";

const STYLE_PRESETS = [
  { id: "studio", label: "Estudio blanco" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "minimal", label: "Minimal" },
  { id: "luxury", label: "Luxury" },
] as const;

type ActiveTab = "studio" | "shield" | "pricing";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("studio");
  const [stylePreset, setStylePreset] =
    useState<(typeof STYLE_PRESETS)[number]["id"]>("studio");
  const [credits, setCredits] = useState(3);
  const [proActive, setProActive] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePhoto = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: TEMP_PRODUCT_IMAGE,
          stylePreset,
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

  const handleCheckout = async (planId: string) => {
    setCheckoutPlanId(planId);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          storeEmail: STORE_EMAIL,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        photo_credits?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "No se pudo completar el pago");
        return;
      }

      if (typeof data.photo_credits === "number") {
        setCredits(data.photo_credits);
      }

      window.alert("¡Pago exitoso! Créditos añadidos");

      if (planId === "pack_50") {
        setActiveTab("studio");
      } else if (planId === "pro_monthly") {
        setProActive(true);
        setActiveTab("shield");
      }
    } catch {
      setError("Error de conexión al procesar el pago");
    } finally {
      setCheckoutPlanId(null);
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "studio", label: "Fotos IA", icon: <Camera className="w-4 h-4" /> },
    { id: "shield", label: "Escudo PRO", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "pricing", label: "Planes y Créditos", icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-7 h-7 text-indigo-400" />
                EscalaShop
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Motor de fotos IA y protección logística para tu tienda.
              </p>
            </div>
            <div className="text-sm bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 px-4 py-2 rounded-xl font-semibold">
              Créditos: {credits}
              {proActive ? (
                <span className="ml-2 text-emerald-300">· PRO activo</span>
              ) : null}
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border transition ${
                  activeTab === tab.id
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
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
                    Elige un estilo y pulsa generar para ver el resultado de la API.
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
                <h2 className="text-lg font-bold text-white">EscalaShield PRO</h2>
                <p className="text-sm text-slate-400">
                  Validación de direcciones y confirmación de pedidos contraentrega.
                </p>
              </div>
            </div>
            {proActive ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-200">
                Tu plan PRO está activo. Los pedidos de Shopify se auditan automáticamente
                y tus clientes confirman despacho desde el enlace de guía.
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200">
                Activa el plan PRO en &quot;Planes y Créditos&quot; para habilitar el escudo
                logístico completo.
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "pricing" ? (
          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col">
              <h2 className="text-lg font-bold text-white">Pack 50 Fotos</h2>
              <p className="text-sm text-slate-400 flex-1">
                Recarga única de 50 créditos para el estudio de fotos IA. Ideal para
                catálogos y lanzamientos.
              </p>
              <p className="text-2xl font-bold text-indigo-300">$49.000 COP</p>
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
              <h2 className="text-lg font-bold text-white">Plan PRO Mensual</h2>
              <p className="text-sm text-slate-400 flex-1">
                Escudo logístico + 100 créditos de fotos IA cada mes. Confirmación de
                pedidos y auditoría de direcciones.
              </p>
              <p className="text-2xl font-bold text-emerald-400">$129.000 COP / mes</p>
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
    </main>
  );
}
