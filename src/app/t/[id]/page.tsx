"use client";

import React, { useState, use } from "react";
import { CheckCircle2, MapPin, Package, ShieldCheck, Edit3 } from "lucide-react";

export default function PublicTrackingPage({ params }: { params: Promise<{ id?: string }> }) {
  // Desenvolvemos la promesa de los params con React.use()
  const resolvedParams = use(params);
  const trackingId = resolvedParams?.id || "TRK-9081";

  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState("Calle 10 Sur #43A-15 Apto 802 Edificio Mirador");
  const [reference, setReference] = useState("Portería 24 horas, frente al parque");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">Confirmación de Despacho</span>
              <span className="text-xs text-slate-400">Guía interna: {trackingId}</span>
            </div>
          </div>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-semibold">
            Contraentrega
          </span>
        </div>

        {/* Resumen del Pedido */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Producto:</span>
            <span className="text-white font-medium">Pedido Tienda Online (#1084)</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Valor a pagar al recibir:</span>
            <span className="text-emerald-400 font-bold text-sm">$145.000 COP</span>
          </div>
        </div>

        {/* Dirección y Botón de Edición */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Dirección de Entrega
            </label>
            {!confirmed && (
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> {editing ? "Guardar" : "Corregir dirección"}
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white"
                placeholder="Calle / Carrera # Número y Apto"
              />
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
                placeholder="Punto de referencia o quién recibe"
              />
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <p className="text-sm text-white font-medium">{address}</p>
              <p className="text-xs text-slate-400 mt-1">Ref: {reference}</p>
            </div>
          )}
        </div>

        {/* Botón de Confirmación en 1 Clic */}
        {confirmed ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">¡Pedido Confirmado para Despacho!</h3>
            <p className="text-xs text-slate-300">
              Tu paquete ya entró a alistamiento prioritario. Te notificaremos por WhatsApp apenas salga a ruta.
            </p>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditing(false);
              setConfirmed(true);
            }}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" /> Sí, confirmo que recibiré el pedido
          </button>
        )}

        {/* Barra de Progreso */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="text-emerald-400 font-semibold">1. Recibido</span>
          <span className={confirmed ? "text-emerald-400 font-semibold" : ""}>2. Confirmado</span>
          <span>3. En Ruta</span>
          <span>4. Entregado</span>
        </div>
      </div>
    </main>
  );
}