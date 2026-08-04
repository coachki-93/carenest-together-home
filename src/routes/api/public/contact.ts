import * as React from 'react'
import { render } from '@react-email/render'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  CONTACT_RECIPIENT,
  template as contactTemplate,
} from '@/lib/email-templates/contact-form'

/**
 * Public contact-form endpoint — deliberately an open-relay-proof choke point.
 *
 * Hard invariants (do not loosen):
 *  - Exactly ONE template may ever be sent: the imported contact_form template.
 *  - Exactly ONE recipient: the hardcoded CONTACT_RECIPIENT constant.
 *  - Subject is derived server-side from the template; callers cannot set it.
 *  - No caller-supplied headers of any kind are forwarded.
 *  - Caller data (name/email/message) only ever lands in the rendered body and
 *    in reply_to (a validated single email address) — never in routing.
 */

const TEMPLATE_NAME = 'contact_form'
const SITE_NAME = 'Tillsa'
const SENDER_DOMAIN = 'notify.tillsa.app'
const FROM_DOMAIN = 'tillsa.app'

const MIN_FILL_MS = 3000
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(10).max(5000),
  locale: z.enum(['en', 'sv']).optional(),
  // Honeypot — must stay empty for real humans.
  website: z.string().max(200).optional(),
  // Client-side render timestamp (ms epoch) for the time trap.
  startedAt: z.number().optional(),
})

// Best-effort in-memory limiter. Resets when the worker recycles, which is
// acceptable for a low-volume contact form (no DB table by design).
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return false
}

// Cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Get-or-create the unsubscribe token for the fixed support recipient.
// The provider requires unsubscribe_token on every transactional send.
async function getUnsubscribeToken(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const normalized = email.toLowerCase()

  const { data: existing, error: lookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalized)
    .maybeSingle()

  if (lookupError) {
    console.error('Unsubscribe token lookup failed', { error: lookupError })
    return null
  }
  if (existing?.token) return existing.token as string

  const { error: upsertError } = await supabase
    .from('email_unsubscribe_tokens')
    .upsert(
      { token: generateToken(), email: normalized },
      { onConflict: 'email', ignoreDuplicates: true },
    )
  if (upsertError) {
    console.error('Unsubscribe token create failed', { error: upsertError })
    return null
  }

  // Re-read: a concurrent insert may have won the upsert race.
  const { data: stored, error: reReadError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalized)
    .maybeSingle()

  if (reReadError || !stored?.token) {
    console.error('Unsubscribe token read-back failed', { error: reReadError })
    return null
  }
  return stored.token as string
}


export const Route = createFileRoute('/api/public/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env['VITE_SUPABASE_URL']
        const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: 'server_error' }, { status: 500 })
        }

        let parsed
        try {
          parsed = contactSchema.safeParse(await request.json())
        } catch {
          return Response.json({ error: 'invalid_request' }, { status: 400 })
        }
        if (!parsed.success) {
          return Response.json({ error: 'invalid_request' }, { status: 400 })
        }
        const { name, email, message, locale, website, startedAt } = parsed.data

        // Honeypot — silently pretend success, send nothing.
        if (website && website.trim() !== '') {
          return Response.json({ success: true })
        }
        // Time trap — same silent success.
        if (typeof startedAt === 'number' && Date.now() - startedAt < MIN_FILL_MS) {
          return Response.json({ success: true })
        }

        const ip =
          request.headers.get('cf-connecting-ip') ??
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          'unknown'
        if (rateLimited(ip)) {
          return Response.json({ error: 'rate_limited' }, { status: 429 })
        }

        const templateData = { name, email, message, locale }
        const element = React.createElement(contactTemplate.component, templateData)
        const html = await render(element)
        const text = await render(element, { plainText: true })
        const subject =
          typeof contactTemplate.subject === 'function'
            ? contactTemplate.subject(templateData)
            : contactTemplate.subject

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const messageId = crypto.randomUUID()

        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: TEMPLATE_NAME,
          recipient_email: CONTACT_RECIPIENT,
          status: 'pending',
        })

        const { error } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: CONTACT_RECIPIENT,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            reply_to: email,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text,
            purpose: 'transactional',
            label: TEMPLATE_NAME,
            idempotency_key: messageId,
            queued_at: new Date().toISOString(),
          },
        })

        if (error) {
          console.error('Failed to enqueue contact email', { error })
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: TEMPLATE_NAME,
            recipient_email: CONTACT_RECIPIENT,
            status: 'failed',
            error_message: 'Failed to enqueue contact email',
          })
          return Response.json({ error: 'send_failed' }, { status: 500 })
        }

        return Response.json({ success: true })
      },
    },
  },
})
