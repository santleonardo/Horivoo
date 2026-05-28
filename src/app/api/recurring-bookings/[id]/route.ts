import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
