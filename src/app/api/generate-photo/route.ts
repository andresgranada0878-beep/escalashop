import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const STORE_EMAIL = "admin@tienda.com";
const GIFT_CREDITS = 3;
const AI_DELAY_MS = 2500;

const RESULT_BY_PRESET: Record<string, string> = {
  studio:
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
  lifestyle:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
  minimal:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
  luxury:
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=1200&q=80",
};

type StoreRow = {
  id: string;
  email: string;
  photo_credits: number;
};

async function getOrCreateStore(): Promise<StoreRow> {
  const { data: existing, error: selectError } = await supabase
    .from("stores")
    .select("id, email, photo_credits")
    .eq("email", STORE_EMAIL)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    return existing as StoreRow;
  }

  const { data: created, error: insertError } = await supabase
    .from("stores")
    .insert({ email: STORE_EMAIL, photo_credits: GIFT_CREDITS })
    .select("id, email, photo_credits")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return created as StoreRow;
}

function resolveResultUrl(stylePreset: string): string {
  return RESULT_BY_PRESET[stylePreset] ?? RESULT_BY_PRESET.studio;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageUrl = body.imageUrl as string | undefined;
    const stylePreset = (body.stylePreset as string | undefined) ?? "studio";

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl es requerido" },
        { status: 400 },
      );
    }

    const store = await getOrCreateStore();

    if (store.photo_credits <= 0) {
      return NextResponse.json(
        { error: "Sin créditos suficientes" },
        { status: 403 },
      );
    }

    await new Promise((resolve) => setTimeout(resolve, AI_DELAY_MS));

    const resultImageUrl = resolveResultUrl(stylePreset);
    const newCredits = store.photo_credits - 1;

    const { error: updateError } = await supabase
      .from("stores")
      .update({ photo_credits: newCredits })
      .eq("id", store.id);

    if (updateError) {
      console.error("Error al descontar crédito:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    const { error: photoError } = await supabase.from("ai_photos").insert({
      store_id: store.id,
      original_image_url: imageUrl,
      result_image_url: resultImageUrl,
      style_preset: stylePreset,
    });

    if (photoError) {
      console.error("Error al registrar foto IA:", photoError);
      return NextResponse.json(
        { error: photoError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        result_image_url: resultImageUrl,
        photo_credits: newCredits,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    console.error("generate-photo:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
