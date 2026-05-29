import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Row = Record<string, unknown>;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, bookingType, originalBookingId } = body;

    if (status && !['confirmed', 'cancelled', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    // update data uses snake_case for PostgREST columns
    const data: Row = {};
    if (status) data['status'] = status;
    if (notes !== undefined) data['notes'] = notes;
    if (bookingType) data['booking_type'] = bookingType;
    if (originalBookingId !== undefined) data['original_booking_id'] = originalBookingId;

    // Always update the updated_at timestamp
    data['updated_at'] = new Date().toISOString();

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const booking = await db.booking.update({
      where: { id },
      data,
    });

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.booking.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ error: 'Erro ao excluir agendamento' }, { status: 500 });
  }
}
