import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, action } = body as Record<string, string>;

    // ── Signup ─────────────────────────────────────────────
    if (action === 'signup') {
      if (!email || !password || !name || !role) {
        return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
      }
      if (!['teacher', 'coordinator', 'student'].includes(role)) {
        return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 });
      }

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
      }

      const hashedPassword = hashPassword(password);
      const user = await db.user.create({
        data: { email, name, password: hashedPassword, role },
      });

      let teacherId: string | undefined;

      if (role === 'teacher') {
        const teacher = await db.teacher.create({
          data: { user_id: user.id, name, email },
        });
        teacherId = String(teacher.id);
      }

      if (role === 'coordinator') {
        await db.coordinator.create({
          data: { user_id: user.id, name, email },
        });
      }

      const token = createToken({
        userId: String(user.id),
        email: user.email,
        role: user.role,
      });

      return NextResponse.json({
        user: {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          ...(teacherId && { teacherId }),
        },
        token,
      }, { status: 201 });
    }

    // ── Login ───────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const valid = verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    const teacher = await db.teacher.findUnique({ where: { user_id: String(user.id) } });

    const token = createToken({
      userId: String(user.id),
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: user.role,
        teacherId: teacher ? String(teacher.id) : undefined,
      },
      token,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
