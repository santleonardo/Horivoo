/**
 * /api/health — Verifica configuração de variáveis de ambiente
 */
import { NextResponse } from 'next/server';
import { isSupabaseConfigured, db } from '@/lib/db';

export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();
  const jwtConfigured      = !!process.env.JWT_SECRET;

  if (!jwtConfigured) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'JWT_SECRET não definido. Adicione-o ao .env.local e reinicie o servidor.',
      jwtConfigured: false,
      supabaseConfigured,
    }, { status: 503 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local',
      jwtConfigured: true,
      supabaseConfigured: false,
    }, { status: 503 });
  }

  try {
    await db.user.count();
    return NextResponse.json({
      status: 'ok',
      jwtConfigured: true,
      supabaseConfigured: true,
      supabaseConnected: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({
      status: 'error',
      jwtConfigured: true,
      supabaseConfigured: true,
      supabaseConnected: false,
      message: `Erro ao conectar ao Supabase: ${msg}`,
    }, { status: 503 });
  }
}
