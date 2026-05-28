import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

async function main() {
  console.log('🌱 Seeding database...');

  // Limpar dados existentes
  await db.booking.deleteMany();
  await db.recurringBooking.deleteMany();
  await db.blockedPeriod.deleteMany();
  await db.blockedSlot.deleteMany();
  await db.availableSlot.deleteMany();
  await db.nonClassDay.deleteMany();
  await db.holiday.deleteMany();
  await db.recess.deleteMany();
  await db.coordinator.deleteMany();
  await db.student.deleteMany();
  await db.teacher.deleteMany();
  await db.user.deleteMany();

  // Criar usuários
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const userProf1 = await db.user.create({ data: { email: 'prof@horivoo.com', name: 'Prof. Maria Souza', password: hash('123456'), role: 'teacher' } });
  const userProf2 = await db.user.create({ data: { email: 'prof2@horivoo.com', name: 'Prof. João Lima', password: hash('123456'), role: 'teacher' } });
  const userCoord = await db.user.create({ data: { email: 'coord@horivoo.com', name: 'Coord. Ana Paula', password: hash('123456'), role: 'coordinator' } });
  const userStudent = await db.user.create({ data: { email: 'aluno@horivoo.com', name: 'Carlos Aluno', password: hash('123456'), role: 'student' } });

  // Criar Student profile
  await db.student.create({ data: { userId: userStudent.id, name: userStudent.name, email: userStudent.email, phone: '(11) 99999-0001' } });

  // Criar perfis de professor com disciplinas e bio
  const teacher1 = await db.teacher.create({ data: { userId: userProf1.id, name: userProf1.name, email: userProf1.email, subjects: 'Matemática, Física', bio: 'Doutora em Matemática pela USP. 15 anos de experiência em ensino superior.' } });
  const teacher2 = await db.teacher.create({ data: { userId: userProf2.id, name: userProf2.name, email: userProf2.email, subjects: 'Português, Redação', bio: 'Mestre em Letras. Especialista em redação para vestibulares.' } });
  await db.coordinator.create({ data: { userId: userCoord.id, name: userCoord.name, email: userCoord.email } });

  // Criar mais alunos
  const userStudent2 = await db.user.create({ data: { email: 'ana@horivoo.com', name: 'Ana Beatriz Silva', password: hash('123456'), role: 'student' } });
  const userStudent3 = await db.user.create({ data: { email: 'pedro@horivoo.com', name: 'Pedro Henrique Costa', password: hash('123456'), role: 'student' } });
  await db.student.create({ data: { userId: userStudent2.id, name: userStudent2.name, email: userStudent2.email, phone: '(11) 98888-0002' } });
  await db.student.create({ data: { userId: userStudent3.id, name: userStudent3.name, email: userStudent3.email, phone: '(11) 97777-0003' } });

  // Recessos
  await db.recess.create({ data: { startDate: '2025-07-01', endDate: '2025-07-15', description: 'Recesso de Inverno' } });
  await db.recess.create({ data: { startDate: '2025-12-20', endDate: '2026-01-05', description: 'Recesso de Fim de Ano' } });

  // Horários disponíveis - Prof. Maria
  const mariaSlots = [
    // Segunda (1)
    { teacherId: teacher1.id, dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
    { teacherId: teacher1.id, dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
    { teacherId: teacher1.id, dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
    { teacherId: teacher1.id, dayOfWeek: 1, startTime: '14:00', endTime: '15:00' },
    { teacherId: teacher1.id, dayOfWeek: 1, startTime: '15:00', endTime: '16:00' },
    // Terça (2)
    { teacherId: teacher1.id, dayOfWeek: 2, startTime: '08:00', endTime: '09:00' },
    { teacherId: teacher1.id, dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
    { teacherId: teacher1.id, dayOfWeek: 2, startTime: '14:00', endTime: '15:00' },
    // Quarta (3)
    { teacherId: teacher1.id, dayOfWeek: 3, startTime: '10:00', endTime: '11:00' },
    { teacherId: teacher1.id, dayOfWeek: 3, startTime: '11:00', endTime: '12:00' },
    { teacherId: teacher1.id, dayOfWeek: 3, startTime: '16:00', endTime: '17:00' },
    // Quinta (4)
    { teacherId: teacher1.id, dayOfWeek: 4, startTime: '08:00', endTime: '09:00' },
    { teacherId: teacher1.id, dayOfWeek: 4, startTime: '13:00', endTime: '14:00' },
    { teacherId: teacher1.id, dayOfWeek: 4, startTime: '14:00', endTime: '15:00' },
    // Sexta (5)
    { teacherId: teacher1.id, dayOfWeek: 5, startTime: '09:00', endTime: '10:00' },
    { teacherId: teacher1.id, dayOfWeek: 5, startTime: '10:00', endTime: '11:00' },
  ];

  const joaoSlots = [
    // Segunda (1)
    { teacherId: teacher2.id, dayOfWeek: 1, startTime: '13:00', endTime: '14:00' },
    { teacherId: teacher2.id, dayOfWeek: 1, startTime: '14:00', endTime: '15:00' },
    // Terça (2)
    { teacherId: teacher2.id, dayOfWeek: 2, startTime: '08:00', endTime: '09:00' },
    { teacherId: teacher2.id, dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
    { teacherId: teacher2.id, dayOfWeek: 2, startTime: '10:00', endTime: '11:00' },
    { teacherId: teacher2.id, dayOfWeek: 2, startTime: '15:00', endTime: '16:00' },
    // Quinta (4)
    { teacherId: teacher2.id, dayOfWeek: 4, startTime: '08:00', endTime: '09:00' },
    { teacherId: teacher2.id, dayOfWeek: 4, startTime: '09:00', endTime: '10:00' },
    { teacherId: teacher2.id, dayOfWeek: 4, startTime: '14:00', endTime: '15:00' },
    { teacherId: teacher2.id, dayOfWeek: 4, startTime: '15:00', endTime: '16:00' },
    // Sexta (5)
    { teacherId: teacher2.id, dayOfWeek: 5, startTime: '08:00', endTime: '09:00' },
    { teacherId: teacher2.id, dayOfWeek: 5, startTime: '13:00', endTime: '14:00' },
  ];

  for (const slot of [...mariaSlots, ...joaoSlots]) {
    await db.availableSlot.create({ data: slot });
  }

  // Feriados nacionais 2025
  const holidays = [
    { date: '2025-01-01', name: 'Confraternização Universal', type: 'nacional', recurring: true },
    { date: '2025-02-28', name: 'Carnaval', type: 'nacional', recurring: false },
    { date: '2025-03-03', name: 'Carnaval', type: 'nacional', recurring: false },
    { date: '2025-03-04', name: 'Carnaval', type: 'nacional', recurring: false },
    { date: '2025-04-21', name: 'Tiradentes', type: 'nacional', recurring: true },
    { date: '2025-05-01', name: 'Dia do Trabalho', type: 'nacional', recurring: true },
    { date: '2025-06-19', name: 'Corpus Christi', type: 'nacional', recurring: false },
    { date: '2025-09-07', name: 'Independência do Brasil', type: 'nacional', recurring: true },
    { date: '2025-10-12', name: 'Nossa Senhora Aparecida', type: 'nacional', recurring: true },
    { date: '2025-11-02', name: 'Finados', type: 'nacional', recurring: true },
    { date: '2025-11-15', name: 'Proclamação da República', type: 'nacional', recurring: true },
    { date: '2025-12-25', name: 'Natal', type: 'nacional', recurring: true },
  ];

  for (const h of holidays) {
    await db.holiday.create({ data: h });
  }

  console.log('✅ Seed complete!');
  console.log(`   ${2} teachers, ${1} coordinator, ${1} student`);
  console.log(`   ${mariaSlots.length + joaoSlots.length} available slots`);
  console.log(`   ${holidays.length} holidays`);
}

main().catch(e => { console.error(e); process.exit(1); });
