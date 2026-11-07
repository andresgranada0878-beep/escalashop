"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { Package, MapPin, Edit3, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type OrderTracking = {
  order_number: string | null;
  tracking_code: string;
  customer_name: string | null;
  customer_phone: string | null;
  city: string | null;
  raw_address: string | null;
  product_summary: string | null;
  cod_amount_cop: number | null;
  address_risk_score: string | null;
  risk_reason: string | null;
  customer_confirmed: boolean | null;
};

function formatCop(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function TrackingContent() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const trackingId = id ?? "";

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [orderData, setOrderData] = useState<OrderTracking | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !trackingId) {
      if (isMounted && !trackingId) {
        setLoading(false);
        setNotFound(true);
      }
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("orders_tracking")
        .select("*")
        .eq("tracking_code", trackingId)
        .maybeSingle();

      if (cancelled) return;

      setLoading(false);

      if (error) {
        console.error("Error al cargar guía:", error);
        setNotFound(true);
        return;
      }

      if (!data) {
        setNotFound(true);
        return;
      }

      const order = data as OrderTracking;
      setOrderData(order);
      setAddress(order.raw_address ?? "");
      setReference(
        [order.city, order.customer_phone].filter(Boolean).join(" · "),
      );
      setConfirmed(Boolean(order.customer_confirmed));
    })();

    return () => {
      cancelled = true;
    };
  }, [isMounted, trackingId]);

  const handleToggleEdit = async () => {
    if (editing && orderData) {
      setSavingAddress(true);
      const { error } = await supabase
        .from("orders_tracking")
        .update({ raw_address: address })
        .eq("tracking_code", trackingId);

      setSavingAddress(false);

      if (error) {
        console.error("Error al actualizar dirección:", error);
        return;
      }

      setOrderData({ ...orderData, raw_address: address });
    }
    setEditing(!editing);
  };

  const handleConfirm = async () => {
    if (!orderData) return;

    setConfirming(true);
    const { error } = await supabase
      .from("orders_tracking")
      .update({ customer_confirmed: true })
      .eq("tracking_code", trackingId);

    setConfirming(false);

    if (error) {
      console.error("Error al confirmar pedido:", error);
      return;
    }

    setEditing(false);
    setConfirmed(true);
    setOrderData({ ...orderData, customer_confirmed: true });
  };

  if (!isMounted) return null;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <p className="text-indigo-400 text-sm">Cargando tu guía...</p>
      </main>
    );
  }

  if (notFound || !orderData) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <p className="text-slate-400 text-sm">Guía no encontrada</p>
      </main>
    );
  }

  const productLabel = `${orderData.product_summary ?? "Pedido"} (${orderData.order_number ?? "—"})`;
  const amountLabel = formatCop(orderData.cod_amount_cop ?? 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                Confirmación de Despacho
              </span>
              <span className="text-xs text-slate-400">
                Guía interna: {orderData.tracking_code}
              </span>
              {orderData.customer_name && (
                <span className="text-xs text-slate-500 block">
                  {orderData.customer_name}
                </span>
              )}
            </div>
          </div>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-semibold">
            Contraentrega
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Producto:</span>
            <span className="text-white font-medium text-right max-w-[60%]">
              {productLabel}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Valor a pagar al recibir:</span>
            <span className="text-emerald-400 font-bold text-sm">{amountLabel}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Dirección de Entrega
            </label>
            {!confirmed && (
              <button
                type="button"
                onClick={handleToggleEdit}
                disabled={savingAddress}
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <Edit3 className="w-3 h-3" />{" "}
                {editing ? (savingAddress ? "Guardando..." : "Guardar") : "Corregir dirección"}
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
              <p className="text-sm text-white font-medium">
                {orderData.raw_address || address || "—"}
              </p>
              {reference ? (
                <p className="text-xs text-slate-400 mt-1">Ref: {reference}</p>
              ) : null}
            </div>
          )}
        </div>

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
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-5 h-5" />{" "}
            {confirming ? "Confirmando..." : "Sí, confirmo que recibiré el pedido"}
          </button>
        )}

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

export default function PublicTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-400">
          Cargando guía de rastreo...
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
