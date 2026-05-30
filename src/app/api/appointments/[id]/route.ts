/**
 * /api/appointments/[id] — Update / Delete appointment
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
    const { status, notes } = body;

    const updates: Row = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates['status'] = status;
    if (notes !== undefined) updates['notes'] = notes;

    const appointment = await db.appointment.update({ where: { id }, data: updates });
    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('[appointments/[id] PUT]', error);
    return NextResponse.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 });
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
    await db.appointment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[appointments/[id] DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir agendamento' }, { status: 500 });
  }
}
