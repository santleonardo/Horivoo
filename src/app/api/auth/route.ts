import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, createToken } from '@/lib/auth';

type Row = Record<string, unknown>;

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
      }) as Row;

      let teacher_id: string | undefined;
      if (role === 'teacher') {
        const teacher = await db.teacher.create({
          data: { user_id: user.id as string, name, email },
        }) as Row;
        teacher_id = teacher.id as string;
      }
      if (role === 'coordinator') {
        await db.coordinator.create({ data: { user_id: user.id as string, name, email } });
      }

      const token = await createToken({
        userId: user.id as string,
        email: user.email as string,
        role: user.role as string,
      });

      return NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role, ...(teacher_id && { teacherId: teacher_id }) },
        token,
      }, { status: 201 });
    }

    // ── Login ───────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } }) as Row | null;
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const valid = verifyPassword(password, user.password as string);
    if (!valid) return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });

    const teacher = await db.teacher.findUnique({ where: { user_id: user.id as string } }) as Row | null;

    const token = await createToken({
      userId: user.id as string,
      email: user.email as string,
      role: user.role as string,
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, teacherId: teacher?.id },
      token,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
