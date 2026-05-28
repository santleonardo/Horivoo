import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/db';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    run('DELETE FROM blocked_periods WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blocked period:', error);
    return NextResponse.json({ error: 'Erro ao excluir período bloqueado' }, { status: 500 });
  }
}
