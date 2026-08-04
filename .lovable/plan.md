# Fix contact-form email sending

Two code changes, then a live end-to-end test.

## 1. `src/routes/api/public/contact.ts` — add the unsubscribe token

The email provider rejects any `purpose: "transactional"` send without an
`unsubscribe_token` (HTTP 400 `missing_unsubscribe`). The contact endpoint
enqueues without one, so every contact email fails on its first attempt.

Fix: before enqueueing, get-or-create the unsubscribe token for the fixed
support recipient in `email_unsubscribe_tokens` (same logic the scaffolded
send route already uses: look up by email, create a random 32-byte hex token
if none exists, re-read after upsert to survive races), then include
`unsubscribe_token` in the enqueue payload.

Recipient is our own support inbox, so the link is internal — it just
satisfies the provider requirement. No caller-supplied data is involved, so
the open-relay-proof properties of this endpoint are unchanged.

```diff
+function generateToken(): string { /* 32 random bytes, hex */ }
+
+async function getUnsubscribeToken(supabase, email): Promise<string | null> {
+  // select token by email -> reuse if present
+  // otherwise upsert(onConflict: 'email', ignoreDuplicates) + re-read
+}
...
+        const unsubscribeToken = await getUnsubscribeToken(supabase, CONTACT_RECIPIENT)
+        if (!unsubscribeToken) { log failed row; return 500 send_failed }
...
           idempotency_key: messageId,
+          unsubscribe_token: unsubscribeToken,
           queued_at: new Date().toISOString(),
```

## 2. `src/routes/lovable/email/queue/process.ts` — per-attempt idempotency key

Today every retry re-sends with the same `idempotency_key`. The provider
permanently locks a key after a failed run (409 `run_failed`), so one
transient failure guarantees 5 doomed retries and a dead-letter.

Fix: derive the key sent to the provider from the stored key plus the
attempt number:

```diff
-              idempotency_key: payload.idempotency_key,
+              idempotency_key: attemptKey,  // `${payload.idempotency_key}:a${failedAttempts}`
```

Why this does not reintroduce double sends:

- `failedAttempts` is derived from the durable count of `failed` rows in
  `email_send_log` for that `message_id` — not from a random value. Two
  workers picking up the *same* attempt compute the *same* key, so the
  provider still deduplicates a genuine duplicate delivery.
- The existing pre-send guard (skip + delete when a `sent` row already
  exists for the `message_id`) stays in place.
- The key only advances after a real send failure is recorded, i.e. after
  the provider has already refused that attempt.

## 3. Test

The 3 dead-lettered contact messages have burned keys and cannot be revived.
Submit a fresh contact message (new `message_id`, new key), trigger the queue
processor, and report the resulting `email_send_log` status.

## Verification

- `email_send_log` shows `sent` for the new `contact_form` message.
- `tsgo --noEmit` clean.
