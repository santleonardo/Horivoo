import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    run('DELETE FROM blocked_slots WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting blocked slot:', error);
    return NextResponse.json({ error: 'Erro ao desbloquear horário' }, { status: 500 });
  }
}
