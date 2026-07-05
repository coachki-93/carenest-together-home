ALTER TABLE public.families
  ADD COLUMN timezone text NOT NULL DEFAULT 'Europe/Stockholm',
  ADD COLUMN notification_language text NOT NULL DEFAULT 'sv'
    CHECK (notification_language IN ('sv','en'));