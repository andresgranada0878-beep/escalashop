import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PAYMENT_DELAY_MS = 2000;
const DEFAULT_STORE_EMAIL = "admin@tienda.com";

type StoreRow = {
  id: string;
  email: string;
  photo_credits: number;
  subscription_active: boolean | null;
};

async function getOrCreateStore(email: string): Promise<StoreRow> {
  const { data: existing, error: selectError } = await supabase
    .from("stores")
    .select("id, email, photo_credits, subscription_active")
    .eq("email", email)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    return existing as StoreRow;
  }

  const { data: created, error: insertError } = await supabase
    .from("stores")
    .insert({
      email,
      photo_credits: 0,
      subscription_active: false,
    })
    .select("id, email, photo_credits, subscription_active")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return created as StoreRow;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const planId = body.planId as string | undefined;
    const storeEmail =
      (body.storeEmail as string | undefined) ?? DEFAULT_STORE_EMAIL;

    if (!planId) {
      return NextResponse.json(
        { error: "planId es requerido" },
        { status: 400 },
      );
    }

    if (planId !== "pack_50" && planId !== "pro_monthly") {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    await new Promise((resolve) => setTimeout(resolve, PAYMENT_DELAY_MS));

    const store = await getOrCreateStore(storeEmail);
    const currentCredits = store.photo_credits ?? 0;

    let newCredits = currentCredits;
    let updatePayload: {
      photo_credits: number;
      subscription_active?: boolean;
    };

    if (planId === "pack_50") {
      newCredits = currentCredits + 50;
      updatePayload = { photo_credits: newCredits };
    } else {
      newCredits = currentCredits + 100;
      updatePayload = {
        photo_credits: newCredits,
        subscription_active: true,
      };
    }

    const { error: updateError } = await supabase
      .from("stores")
      .update(updatePayload)
      .eq("email", storeEmail);

    if (updateError) {
      console.error("Error en checkout:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    const message =
      planId === "pack_50"
        ? "Pack de 50 créditos activado correctamente."
        : "Plan PRO mensual activado. Créditos y Escudo PRO habilitados.";

    return NextResponse.json(
      {
        success: true,
        message,
        planId,
        photo_credits: newCredits,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("checkout:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
