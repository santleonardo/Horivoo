import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    run('DELETE FROM non_class_days WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting non-class day:', error);
    return NextResponse.json({ error: 'Erro ao remover dia sem aula' }, { status: 500 });
  }
}
