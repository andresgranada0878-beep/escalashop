import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type AddressRisk = "high" | "medium" | "low";

function assessAddressRisk(fullAddress: string): {
  score: AddressRisk;
  reason: string;
} {
  const normalized = fullAddress.toLowerCase();
  const letterCount = (normalized.match(/[a-záéíóúñ]/gi) ?? []).length;
  const hasNumbers = /\d/.test(normalized);
  const detailPattern =
    /\b(apto|apartamento|casa|torre|local|interior)\b/;

  if (letterCount < 10 || !hasNumbers) {
    const reason =
      letterCount < 10
        ? "Dirección muy corta (menos de 10 letras)."
        : "La dirección no contiene números.";
    return { score: "high", reason };
  }
  if (!detailPattern.test(normalized)) {
    return {
      score: "medium",
      reason: "Sin referencias de apto, casa, torre u otro detalle.",
    };
  }
  return {
    score: "low",
    reason: "Dirección con longitud, número y detalle suficientes.",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const orderNumber = body.name as string | undefined;
    const customer = body.customer?.first_name as string | undefined;
    const shipping = body.shipping_address;
    const phone = shipping?.phone as string | undefined;
    const address1 = (shipping?.address1 as string | undefined) ?? "";
    const address2 = (shipping?.address2 as string | undefined) ?? "";
    const fullAddress = [address1, address2].filter(Boolean).join(" ");
    const city = shipping?.city as string | undefined;
    const totalPrice = body.total_price as string | number | undefined;

    const { score: addressRisk, reason: riskReason } =
      assessAddressRisk(fullAddress);

    const codAmountCop =
      typeof totalPrice === "number"
        ? totalPrice
        : parseFloat(String(totalPrice ?? "0")) || 0;

    console.log(`
🛒 Nuevo pedido recibido
━━━━━━━━━━━━━━━━━━━━━━━━
📦 Pedido:     ${orderNumber ?? "—"}
👤 Cliente:    ${customer ?? "—"}
📍 Dirección:  ${fullAddress || "—"}
🏙️  Ciudad:     ${city ?? "—"}
📞 Teléfono:   ${phone ?? "—"}
💰 Total:      ${totalPrice ?? "—"}
⚠️  Riesgo:     ${addressRisk}
`);

    const trackingCode = `TRK-${Math.floor(10000 + Math.random() * 90000)}`;

    const { error } = await supabase.from("orders_tracking").insert({
      order_number: orderNumber,
      tracking_code: trackingCode,
      customer_name: customer,
      customer_phone: phone,
      city,
      raw_address: fullAddress,
      product_summary: "Pedido Tienda Online",
      cod_amount_cop: codAmountCop,
      address_risk_score: addressRisk,
      risk_reason: riskReason,
    });

    if (error) {
      console.error("Error al guardar pedido en Supabase:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, orderNumber, addressRisk, tracking_code: trackingCode },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
