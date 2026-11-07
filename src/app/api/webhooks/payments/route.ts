import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type PaymentWebhookBody = {
  status?: string;
  reference?: string;
};

function parseReference(reference: string): {
  storeEmail: string;
  planId: string;
} | null {
  const separator = "___";
  const sepIndex = reference.indexOf(separator);
  if (sepIndex <= 0) return null;

  const storeEmail = reference.slice(0, sepIndex).trim().toLowerCase();
  const planId = reference.slice(sepIndex + separator.length).trim();

  if (!storeEmail || !planId) return null;
  return { storeEmail, planId };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PaymentWebhookBody;
    const status = (body.status ?? "").toUpperCase();
    const reference = body.reference ?? "";

    if (!reference) {
      return NextResponse.json(
        { success: false, error: "reference es requerida" },
        { status: 400 },
      );
    }

    const parsed = parseReference(reference);
    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          error: "reference inválida. Formato esperado: email___planId",
        },
        { status: 400 },
      );
    }

    const { storeEmail, planId } = parsed;

    // Solo acreditamos pagos confirmados; igual respondemos 200 a la pasarela.
    if (status !== "APPROVED") {
      console.log(
        `Webhook de pago ignorado (status=${status || "vacío"}) ref=${reference}`,
      );
      return NextResponse.json({ success: true, credited: false }, { status: 200 });
    }

    if (planId !== "pack_50" && planId !== "pro_monthly") {
      return NextResponse.json(
        { success: false, error: "planId no reconocido" },
        { status: 400 },
      );
    }

    const { data: store, error: selectError } = await supabase
      .from("stores")
      .select("id, email, photo_credits")
      .eq("email", storeEmail)
      .maybeSingle();

    if (selectError) {
      console.error("Error al buscar tienda:", selectError);
      return NextResponse.json(
        { success: false, error: selectError.message },
        { status: 500 },
      );
    }

    if (!store) {
      console.error(`Tienda no encontrada para email=${storeEmail}`);
      return NextResponse.json(
        { success: false, error: "Tienda no encontrada" },
        { status: 404 },
      );
    }

    const currentCredits = store.photo_credits ?? 0;

    if (planId === "pack_50") {
      const { error: updateError } = await supabase
        .from("stores")
        .update({ photo_credits: currentCredits + 50 })
        .eq("email", storeEmail);

      if (updateError) {
        console.error("Error al acreditar pack_50:", updateError);
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 },
        );
      }
    } else {
      const { error: updateError } = await supabase
        .from("stores")
        .update({
          plan_type: "pro",
          subscription_active: true,
          photo_credits: currentCredits + 100,
        })
        .eq("email", storeEmail);

      if (updateError) {
        console.error("Error al activar pro_monthly:", updateError);
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 },
        );
      }
    }

    console.log(
      `✅ Pago APPROVED acreditado: ${storeEmail} → ${planId} (antes: ${currentCredits})`,
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del webhook";
    console.error("webhooks/payments:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
