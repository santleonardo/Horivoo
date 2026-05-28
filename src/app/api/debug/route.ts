import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const jwt = process.env.JWT_SECRET;

  // Test actual connection to Supabase
  let supabaseStatus = 'not tested';
  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      });
      supabaseStatus = res.ok
        ? `OK (${res.status})`
        : `ERRO ${res.status}: ${await res.text()}`;
    } catch (e) {
      supabaseStatus = `FETCH FALHOU: ${e instanceof Error ? e.message : e}`;
    }
  }

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url ? `SET (${url.slice(0, 30)}...)` : 'NÃO DEFINIDA ❌',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET ✓' : 'NÃO DEFINIDA ❌',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET ✓' : 'NÃO DEFINIDA ❌',
      JWT_SECRET: jwt ? 'SET ✓' : 'NÃO DEFINIDA (usando padrão)',
    },
    supabase_connection: supabaseStatus,
  });
}
