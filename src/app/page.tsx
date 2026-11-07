"use client";

import React, { useState } from "react";
import { Sparkles, ImageIcon, Loader2 } from "lucide-react";

const TEMP_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1572635196233-2242c0cbc0fe?auto=format&fit=crop&w=800&q=80";

const STYLE_PRESETS = [
  { id: "studio", label: "Estudio blanco" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "minimal", label: "Minimal" },
  { id: "luxury", label: "Luxury" },
] as const;

export default function Home() {
  const [stylePreset, setStylePreset] =
    useState<(typeof STYLE_PRESETS)[number]["id"]>("studio");
  const [credits, setCredits] = useState(3);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-indigo-400" />
              Fotos IA — EscalaShop
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Transforma fotos de producto con estilos listos para tu tienda.
            </p>
          </div>
          <div className="text-sm bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 px-4 py-2 rounded-xl font-semibold">
            Créditos: {credits}
          </div>
        </header>

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

            {error ? (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}
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
      </div>
    </main>
  );
}
