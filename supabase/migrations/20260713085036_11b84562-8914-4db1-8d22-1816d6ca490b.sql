ALTER TYPE public.appointment_kind ADD VALUE IF NOT EXISTS 'meeting';
ALTER TYPE public.appointment_kind ADD VALUE IF NOT EXISTS 'lab';
ALTER TYPE public.appointment_kind ADD VALUE IF NOT EXISTS 'dental';
ALTER TYPE public.appointment_kind ADD VALUE IF NOT EXISTS 'hospital_stay';