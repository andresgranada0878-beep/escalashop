import { NextResponse } from "next/server";

type AddressRisk = "high" | "medium" | "low";

function assessAddressRisk(fullAddress: string): AddressRisk {
  const normalized = fullAddress.toLowerCase();
  const letterCount = (normalized.match(/[a-záéíóúñ]/gi) ?? []).length;
  const hasNumbers = /\d/.test(normalized);
  const detailPattern =
    /\b(apto|apartamento|casa|torre|local|interior)\b/;

  if (letterCount < 10 || !hasNumbers) {
    return "high";
  }
  if (!detailPattern.test(normalized)) {
    return "medium";
  }
  return "low";
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

    const addressRisk = assessAddressRisk(fullAddress);

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

    return NextResponse.json(
      { success: true, orderNumber, addressRisk },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
