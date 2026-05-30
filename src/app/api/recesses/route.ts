import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recesses = await db.recess.findMany({
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json(recesses);
  } catch (error) {
    console.error('List recesses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Only coordinators can create recesses' }, { status: 403 });
    }

    const body = await request.json();
    const { startDate, endDate, description } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'startDate must be before or equal to endDate' },
        { status: 400 }
      );
    }

    const recess = await db.recess.create({
      data: {
        startDate,
        endDate,
        description: description || '',
      },
    });

    return NextResponse.json(recess, { status: 201 });
  } catch (error) {
    console.error('Create recess error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
