import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const user = get<{ id: string; email: string; name: string; role: string }>('SELECT id, email, name, role FROM users WHERE id = ?', [payload.userId]);
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const teacher = get<{ id: string }>('SELECT id FROM teachers WHERE user_id = ?', [user.id]);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, teacherId: teacher?.id },
    });
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json({ error: 'Erro ao verificar sessão' }, { status: 500 });
  }
}
