-- =====================================================================
-- Billing Slice 1 — subscription state, idempotency ledger, active gate
-- =====================================================================
-- Enum-in-transaction safety: CREATE TYPE (new enums) is safe to use in
-- the same transaction that creates them. The ALTER TYPE ADD VALUE
-- restriction only applies to adding values to a pre-existing enum.

-- 1. Enums --------------------------------------------------------------
CREATE TYPE public.subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'none'
);

CREATE TYPE public.subscription_plan AS ENUM (
  'founding',
  'standard'
);

-- 2. families.founding_member ------------------------------------------
ALTER TABLE public.families
  ADD COLUMN founding_member boolean NOT NULL DEFAULT true;

-- 3. family_subscriptions ----------------------------------------------
CREATE TABLE public.family_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL UNIQUE REFERENCES public.families(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  status public.subscription_status NOT NULL DEFAULT 'none',
  plan public.subscription_plan,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SELECT to authenticated: scoped by RLS policy below.
-- NO INSERT/UPDATE/DELETE to authenticated: only service_role (webhook) writes.
GRANT SELECT ON public.family_subscriptions TO authenticated;
GRANT ALL ON public.family_subscriptions TO service_role;

ALTER TABLE public.family_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_subscriptions_select_members"
  ON public.family_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_family_member(family_id, auth.uid()));

-- NO write policy for authenticated. service_role bypasses RLS.
-- Clients therefore cannot forge status='active'.

CREATE TRIGGER family_subscriptions_set_updated_at
  BEFORE UPDATE ON public.family_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX family_subscriptions_stripe_customer_idx
  ON public.family_subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX family_subscriptions_stripe_subscription_idx
  ON public.family_subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- 4. stripe_webhook_events (idempotency ledger) -------------------------
CREATE TABLE public.stripe_webhook_events (
  event_id text NOT NULL PRIMARY KEY,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.stripe_webhook_events TO service_role;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies at all → authenticated is fully denied by RLS.

-- 5. is_family_subscription_active helper ------------------------------
-- Active iff:
--   trialing AND trial_ends_at > now()
--   OR active AND current_period_end > now()
--   OR past_due AND current_period_end > now()  -- Stripe dunning grace
CREATE OR REPLACE FUNCTION public.is_family_subscription_active(_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_subscriptions
    WHERE family_id = _family_id
      AND (
        (status = 'trialing' AND trial_ends_at IS NOT NULL AND trial_ends_at > now())
        OR (status = 'active' AND current_period_end IS NOT NULL AND current_period_end > now())
        OR (status = 'past_due' AND current_period_end IS NOT NULL AND current_period_end > now())
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_family_subscription_active(uuid) TO authenticated, service_role;

-- 6. Trial-seeding trigger ---------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_family_subscription_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.family_subscriptions (family_id, status, trial_ends_at)
  VALUES (NEW.id, 'trialing', now() + interval '30 days')
  ON CONFLICT (family_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER families_seed_subscription_trial
  AFTER INSERT ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.seed_family_subscription_trial();

-- 7. Backfill existing families ----------------------------------------
INSERT INTO public.family_subscriptions (family_id, status, trial_ends_at)
SELECT id, 'trialing', created_at + interval '30 days'
FROM public.families
ON CONFLICT (family_id) DO NOTHING;