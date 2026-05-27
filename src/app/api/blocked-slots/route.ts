import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacher_id");

    const supabase = await createClient();
    let query = supabase
      .from("blocked_slots")
      .select("id, teacher_id, day, hour, created_at")
      .order("day")
      .order("hour");

    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar bloqueios" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teacher_id, day, hour } = body;

    if (!teacher_id || !day || !hour) {
      return NextResponse.json(
        { error: "Campos obrigatórios: teacher_id, day, hour" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blocked_slots")
      .insert({ teacher_id, day, hour })
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        return NextResponse.json(
          { error: "Horário já bloqueado" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro ao bloquear horário" },
      { status: 500 }
    );
  }
}
