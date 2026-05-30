/**
 * /api/makeups/[id] — Update / Delete makeup class
 * PUT: Only coordinator
 * DELETE: Only coordinator
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

type Row = Record<string, unknown>;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const body = await request.json() as Row;
    const { newDate, newStartTime, newEndTime } = body;

    const updates: Row = {};
    if (newDate !== undefined)      updates['new_date'] = newDate;
    if (newStartTime !== undefined) updates['new_start_time'] = newStartTime;
    if (newEndTime !== undefined)   updates['new_end_time'] = newEndTime;

    const makeup = await db.makeUpClass.update({ where: { id }, data: updates });
    return NextResponse.json({ makeup });
  } catch (error) {
    console.error('[makeups/[id] PUT]', error);
    return NextResponse.json({ error: 'Erro ao atualizar reposição' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    await db.makeUpClass.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[makeups/[id] DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir reposição' }, { status: 500 });
  }
}
