update public.family_subscriptions
set status = 'active',
    current_period_end = timestamptz '2026-09-03 18:43:51+00',
    cancel_at_period_end = true,
    updated_at = now()
where stripe_subscription_id = 'sub_1U0QqTRqi163g86tylhHqejy';