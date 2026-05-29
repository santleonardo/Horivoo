/**
 * /api/auth/me/route.ts
 * GET  → retorna dados do usuário logado
 * PATCH → atualiza nome e/ou senha
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, hashPassword, verifyPassword } from '@/lib/auth';

type Row = Record<string, unknown>;

async function getPayload(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.substring(7));
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload(request);
    if (!payload) return NextResponse.json({ error: 'Token não fornecido ou inválido' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: payload.userId } }) as Row | null;
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const teacher = await db.teacher.findUnique({ where: { user_id: user.id as string } }) as Row | null;

    return NextResponse.json({
      user: {
        id:        user.id,
        email:     user.email,
        name:      user.name,
        role:      user.role,
        teacherId: teacher?.id,
      },
    });
  } catch (error) {
    console.error('[auth/me GET]', error);
    return NextResponse.json({ error: 'Erro ao verificar sessão' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = await getPayload(request);
    if (!payload) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json() as Record<string, string>;
    const { name, currentPassword, newPassword } = body;

    const user = await db.user.findUnique({ where: { id: payload.userId } }) as Row | null;
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const updates: Row = {};

    // Update name
    if (name !== undefined) {
      if (!name.trim()) return NextResponse.json({ error: 'Nome não pode estar vazio' }, { status: 400 });
      updates['name'] = name.trim();
    }

    // Update password
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Informe a senha atual' }, { status: 400 });
      }
      const valid = verifyPassword(currentPassword, user.password as string);
      if (!valid) {
        return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 401 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres' }, { status: 400 });
      }
      updates['password'] = hashPassword(newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    updates['updated_at'] = new Date().toISOString();

    await db.user.update({ where: { id: payload.userId }, data: updates });

    // Also update teacher profile name if applicable
    if (updates['name'] && user.role === 'teacher') {
      const teacher = await db.teacher.findUnique({ where: { user_id: payload.userId } }) as Row | null;
      if (teacher) {
        await db.teacher.update({
          where: { id: teacher.id as string },
          data: { name: updates['name'], updated_at: new Date().toISOString() },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[auth/me PATCH]', error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
