ALTER TABLE public.care_place_checklist_items
ADD COLUMN IF NOT EXISTS days_left_threshold integer NOT NULL DEFAULT 2;