import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, action } = body;

    // Signup
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

      const hashedPassword = await hashPassword(password);
      const user = await db.user.create({
        data: { email, name, password: hashedPassword, role },
        include: { teacherProfile: true, coordinatorProfile: true },
      });

      let teacherId: string | undefined;
      if (role === 'teacher') {
        const teacher = await db.teacher.create({
          data: { userId: user.id, name, email },
        });
        teacherId = teacher.id;
      }

      if (role === 'coordinator') {
        await db.coordinator.create({
          data: { userId: user.id, name, email },
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

    // Login
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { teacherProfile: true, coordinatorProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
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
        teacherId: user.teacherProfile?.id,
      },
      token,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
