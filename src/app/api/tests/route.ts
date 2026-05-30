import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    const where: Record<string, unknown> = {};
    if (classId) where.classId = classId;

    const tests = await db.test.findMany({
      where,
      include: {
        class: true,
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error('List tests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can create tests' }, { status: 403 });
    }

    const body = await request.json();
    const { classId, title, date } = body;

    if (!classId || !title || !date) {
      return NextResponse.json(
        { error: 'classId, title, and date are required' },
        { status: 400 }
      );
    }

    const cls = await db.class.findUnique({ where: { id: classId } });
    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const test = await db.test.create({
      data: { classId, title, date },
      include: { class: true },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error('Create test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
