-- ============================================================
-- Horivoo — Reset (desenvolvimento)
-- Remove todos os dados mantendo a estrutura
-- ============================================================

DELETE FROM public.appointments;
DELETE FROM public.blocked_slots;
DELETE FROM public.blocked_periods;
DELETE FROM public.recurring_schedules;
DELETE FROM public.teacher_availability;
DELETE FROM public.non_class_days;
DELETE FROM public.recesses;
DELETE FROM public.holidays;
DELETE FROM public.students;
DELETE FROM public.coordinators;
DELETE FROM public.teachers;
DELETE FROM public.users;
