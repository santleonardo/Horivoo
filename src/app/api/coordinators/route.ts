import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    const supabase = await createClient();

    let query = supabase
      .from("coordinators")
      .select("id, name, email, user_id, created_at");

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (userId && data && data.length > 0) {
      return NextResponse.json(data[0]);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar coordenadores" },
      { status: 500 }
    );
  }
}
