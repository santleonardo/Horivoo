/**
 * /api/health — Verifica se o Supabase está configurado e acessível
 */
import { NextResponse } from 'next/server';
import { isSupabaseConfigured, db } from '@/lib/db';

export async function GET() {
  const configured = isSupabaseConfigured();

  if (!configured) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local',
      supabaseConfigured: false,
    }, { status: 503 });
  }

  try {
    // Simple query to verify connection
    await db.user.count();
    return NextResponse.json({
      status: 'ok',
      supabaseConfigured: true,
      supabaseConnected: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({
      status: 'error',
      supabaseConfigured: true,
      supabaseConnected: false,
      message: `Erro ao conectar ao Supabase: ${msg}`,
    }, { status: 503 });
  }
}
