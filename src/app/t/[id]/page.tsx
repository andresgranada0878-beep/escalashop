"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Package,
  MapPin,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
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
  const id = (params?.id as string | undefined) ?? "";

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [orderData, setOrderData] = useState<OrderTracking | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFound(false);
      setActionError(null);

      const { data, error } = await supabase
        .from("orders_tracking")
        .select("*")
        .eq("tracking_code", id)
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
      setConfirmed(Boolean(order.customer_confirmed));
    })();

    return () => {
      cancelled = true;
    };
  }, [isMounted, id]);

  const handleCorrectAddress = async () => {
    if (!editing) {
      setEditing(true);
      setActionError(null);
      return;
    }

    if (!orderData) return;

    setSavingAddress(true);
    setActionError(null);

    const nextAddress = address.trim();
    const { error } = await supabase
      .from("orders_tracking")
      .update({ raw_address: nextAddress })
      .eq("tracking_code", id);

    setSavingAddress(false);

    if (error) {
      console.error("Error al actualizar dirección:", error);
      setActionError("No pudimos guardar la dirección. Intenta de nuevo.");
      return;
    }

    setOrderData({ ...orderData, raw_address: nextAddress });
    setEditing(false);
  };

  const handleConfirmOrder = async () => {
    if (!orderData) return;

    setConfirming(true);
    setActionError(null);

    const { error } = await supabase
      .from("orders_tracking")
      .update({ customer_confirmed: true })
      .eq("tracking_code", id);

    setConfirming(false);

    if (error) {
      console.error("Error al confirmar pedido:", error);
      setActionError("No pudimos confirmar el pedido. Intenta de nuevo.");
      return;
    }

    setEditing(false);
    setConfirmed(true);
    setOrderData({ ...orderData, customer_confirmed: true });
  };

  if (!isMounted || loading) {
    return (
      <main className="min-h-screen bg-[#FAF9F6] text-[#2C2A29] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[28px] border border-[#E6E2DC] bg-white px-8 py-12 text-center shadow-[0_16px_40px_-28px_rgba(44,42,41,0.35)]">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E6E2DC] bg-[#F5F3EF]">
            <Loader2 className="h-5 w-5 animate-spin text-[#8C6D53]" />
          </div>
          <p className="text-sm font-medium tracking-wide text-[#2C2A29]">
            Cargando guía...
          </p>
          <p className="mt-2 text-xs text-[#8A857E]">
            Consultando el estado de tu pedido
          </p>
        </div>
      </main>
    );
  }

  if (notFound || !orderData) {
    return (
      <main className="min-h-screen bg-[#FAF9F6] text-[#2C2A29] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[28px] border border-[#E6E2DC] bg-white px-8 py-12 text-center shadow-[0_16px_40px_-28px_rgba(44,42,41,0.35)]">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E6E2DC] bg-[#F5F3EF]">
            <Package className="h-5 w-5 text-[#8A857E]" />
          </div>
          <h1 className="text-base font-semibold text-[#2C2A29]">
            Guía no encontrada
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-[#8A857E]">
            No existe un pedido con el código{" "}
            <span className="font-medium text-[#2C2A29]">{id || "—"}</span>.
            Revisa el enlace o comunícate con la tienda.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAF9F6] text-[#2C2A29] flex items-center justify-center p-4 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(140,109,83,0.12),transparent),radial-gradient(ellipse_60%_40%_at_80%_100%,rgba(107,127,90,0.08),transparent)]"
      />

      <div className="relative z-10 w-full max-w-md rounded-[28px] border border-[#E6E2DC] bg-white p-6 shadow-[0_16px_40px_-28px_rgba(44,42,41,0.35)] space-y-6">
        <header className="flex items-start justify-between gap-3 border-b border-[#E6E2DC] pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-2xl bg-[#8C6D53] p-2.5 shadow-[0_10px_24px_-14px_rgba(140,109,83,0.7)]">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#A39E96]">
                EscalaShop
              </p>
              <h1 className="truncate text-sm font-semibold text-[#2C2A29]">
                Confirmación de despacho
              </h1>
              <p className="truncate text-xs text-[#8A857E]">
                Guía {orderData.tracking_code}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[#E6E2DC] bg-[#F5F3EF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8C6D53]">
            COD
          </span>
        </header>

        <section className="rounded-2xl border border-[#E6E2DC] bg-[#FAF9F6] p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[#8A857E]">Cliente</span>
            <span className="font-medium text-[#2C2A29] text-right">
              {orderData.customer_name ?? "—"}
            </span>
          </div>
          <div className="h-px bg-[#E6E2DC]" />
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[#8A857E]">Número de orden</span>
            <span className="font-semibold text-[#2C2A29]">
              {orderData.order_number ?? "—"}
            </span>
          </div>
          <div className="h-px bg-[#E6E2DC]" />
          <div className="flex items-start justify-between gap-3 text-xs">
            <span className="text-[#8A857E]">Producto</span>
            <span className="max-w-[65%] text-right font-medium text-[#2C2A29]">
              {orderData.product_summary ?? "Pedido Tienda Online"}
            </span>
          </div>
          <div className="h-px bg-[#E6E2DC]" />
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[#8A857E]">Valor a pagar (COP)</span>
            <span className="text-sm font-bold text-[#6B7F5A]">
              {formatCop(orderData.cod_amount_cop ?? 0)}
            </span>
          </div>
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A39E96]">
              <MapPin className="h-3.5 w-3.5 text-[#8C6D53]" />
              Dirección de entrega
            </label>
            {!confirmed ? (
              <button
                type="button"
                onClick={handleCorrectAddress}
                disabled={savingAddress}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C6D53] transition hover:text-[#735841] disabled:opacity-50"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {editing
                  ? savingAddress
                    ? "Guardando..."
                    : "Guardar"
                  : "Corregir dirección"}
              </button>
            ) : null}
          </div>

          {editing ? (
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-[#8C6D53]/50 bg-[#FAF9F6] px-3.5 py-3 text-sm text-[#2C2A29] outline-none placeholder:text-[#A39E96] focus:border-[#8C6D53]"
              placeholder="Calle / Carrera # Número, apto, barrio, ciudad"
            />
          ) : (
            <div className="rounded-2xl border border-[#E6E2DC] bg-[#FAF9F6] px-3.5 py-3.5">
              <p className="text-sm font-medium leading-relaxed text-[#2C2A29]">
                {orderData.raw_address || "—"}
              </p>
              {orderData.city ? (
                <p className="mt-1.5 text-xs text-[#8A857E]">{orderData.city}</p>
              ) : null}
            </div>
          )}
        </section>

        {actionError ? (
          <p className="rounded-xl border border-[#E8D0C6] bg-[#F8EDE8] px-3 py-2 text-xs text-[#9B4D3A]">
            {actionError}
          </p>
        ) : null}

        {confirmed ? (
          <div className="rounded-2xl border border-[#C9D4BE] bg-[#F3F6F0] px-5 py-5 text-center space-y-2.5">
            <CheckCircle2 className="mx-auto h-9 w-9 text-[#6B7F5A]" />
            <h2 className="text-sm font-semibold text-[#2C2A29]">
              ¡Pedido confirmado para despacho!
            </h2>
            <p className="text-xs leading-relaxed text-[#4F5E45]">
              Tu paquete ya entró a alistamiento prioritario. Te notificaremos
              por WhatsApp apenas salga a ruta.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={confirming || editing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6B7F5A] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(107,127,90,0.55)] transition hover:bg-[#556648] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
            {confirming
              ? "Confirmando..."
              : "Sí, confirmo que recibiré el pedido"}
          </button>
        )}

        <footer className="flex items-center justify-between border-t border-[#E6E2DC] pt-4 text-[11px] text-[#A39E96]">
          <span className="font-medium text-[#6B7F5A]">1. Recibido</span>
          <span
            className={
              confirmed ? "font-medium text-[#6B7F5A]" : "text-[#A39E96]"
            }
          >
            2. Confirmado
          </span>
          <span>3. En ruta</span>
          <span>4. Entregado</span>
        </footer>
      </div>
    </main>
  );
}

export default function PublicTrackingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-[#8C6D53]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando guía...
          </div>
        </main>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
