/**
 * /api/recurring-bookings/[id] — Deactivate recurring booking
 * DELETE: Only coordinator can deactivate
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, 'coordinator');
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    await db.recurringBooking.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deactivating recurring booking:', error);
    return NextResponse.json({ error: 'Erro ao desativar agendamento recorrente' }, { status: 500 });
  }
}
