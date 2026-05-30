import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, createToken } from '@/lib/auth';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
}

interface AuthTeacher {
  id: string;
  user_id: string;
  name: string;
  email: string;
}

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
      const user = (await db.user.create({
        data: { email, name, password: hashedPassword, role },
      })) as unknown as AuthUser;

      let teacherId: string | undefined;

      if (role === 'teacher') {
        const teacher = (await db.teacher.create({
          data: { user_id: user.id, name, email },
        })) as unknown as AuthTeacher;
        teacherId = teacher.id;
      }

      if (role === 'coordinator') {
        await db.coordinator.create({
          data: { user_id: user.id, name, email },
        });
      }

      const token = await createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return NextResponse.json({
        user: {
          id: user.id,
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

    const user = (await db.user.findUnique({ where: { email } })) as unknown as AuthUser | null;
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const valid = verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    // Migração silenciosa: se a senha ainda usa SHA-256 legado, re-hash com PBKDF2
    if (!user.password.startsWith('pbkdf2:')) {
      await db.user.update({
        where: { id: user.id },
        data: { password: hashPassword(password), updated_at: new Date().toISOString() },
      });
    }

    const teacher = (await db.teacher.findUnique({ where: { user_id: user.id } })) as unknown as AuthTeacher | null;

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teacherId: teacher?.id,
      },
      token,
    });
  } catch (error) {
    console.error('Auth error:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor';
    if (msg.includes('Supabase não configurado') || msg.includes('fetch failed') || msg.includes('Invalid URL')) {
      return NextResponse.json(
        { error: 'Banco de dados não configurado. Verifique as variáveis de ambiente do Supabase no .env.local' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
