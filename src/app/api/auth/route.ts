import { NextRequest, NextResponse } from 'next/server';
import { db, get, run } from '@/lib/db';
import { verifyPassword, hashPassword, createToken } from '@/lib/auth';
import { randomUUID } from 'crypto';

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

      const existing = get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
      }

      const hashedPassword = hashPassword(password);
      const userId = randomUUID();

      db.transaction(() => {
        run('INSERT INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)', [userId, email, name, hashedPassword, role]);

        if (role === 'teacher') {
          const teacherId = randomUUID();
          run('INSERT INTO teachers (id, user_id, name, email) VALUES (?, ?, ?, ?)', [teacherId, userId, name, email]);
        }

        if (role === 'coordinator') {
          run('INSERT INTO coordinators (id, user_id, name, email) VALUES (?, ?, ?, ?)', [randomUUID(), userId, name, email]);
        }
      })();

      // Get teacherId if applicable
      const teacher = get<{ id: string }>('SELECT id FROM teachers WHERE user_id = ?', [userId]);
      const teacherId = teacher?.id;

      const token = await createToken({
        userId,
        email,
        role,
      });

      return NextResponse.json({
        user: {
          id: userId,
          email,
          name,
          role,
          ...(teacherId && { teacherId }),
        },
        token,
      }, { status: 201 });
    }

    // ── Login ───────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const user = get<{ id: string; email: string; name: string; password: string; role: string }>('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const valid = verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    const teacher = get<{ id: string }>('SELECT id FROM teachers WHERE user_id = ?', [user.id]);

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
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
