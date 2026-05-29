/**
 * /api/users/route.ts
 * GET → lista usuários disponíveis para mensagens (exceto o próprio)
 * Respeita papel: aluno só vê professor + coordenador
 *                 professor vê alunos + coordenador
 *                 coordenador vê todos
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

type UserRow = Record<string, unknown>;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  const me = await verifyToken(token);
  if (!me) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const all = await db.user.findMany({
      orderBy: [{ name: 'asc' }],
    }) as UserRow[];

    // Filter by role rules and exclude self
    const filtered = all
      .filter(u => u.id !== me.userId)
      .filter(u => {
        if (me.role === 'coordinator') return true;
        if (me.role === 'teacher') return ['student', 'coordinator'].includes(u.role as string);
        if (me.role === 'student') return ['teacher', 'coordinator'].includes(u.role as string);
        return false;
      })
      .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role }));

    return NextResponse.json({ users: filtered });
  } catch (error) {
    console.error('[users GET]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
