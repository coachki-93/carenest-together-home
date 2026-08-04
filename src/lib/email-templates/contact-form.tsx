import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

/** Fixed recipient — the Tillsa support inbox. Never caller-controllable. */
export const CONTACT_RECIPIENT = 'support@tillsa.app'

interface Props {
  name?: string
  email?: string
  message?: string
  locale?: string
}

const ContactFormEmail = ({ name, email, message, locale }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New contact message from ${name || 'a visitor'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>New contact message</Heading>
        <Text style={muted}>Sent from the Tillsa contact form.</Text>

        <Section style={card}>
          <Text style={label}>From</Text>
          <Text style={value}>{name || 'Unknown'}</Text>

          <Text style={label}>Email</Text>
          <Text style={value}>{email || 'Unknown'}</Text>

          {locale ? (
            <>
              <Text style={label}>Language</Text>
              <Text style={value}>{locale}</Text>
            </>
          ) : null}
        </Section>

        <Hr style={hr} />

        <Text style={label}>Message</Text>
        <Text style={body}>{message || '(empty)'}</Text>

        <Hr style={hr} />
        <Text style={muted}>Reply directly to this email to answer the sender.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactFormEmail,
  subject: (data: Record<string, unknown>) =>
    `New contact message from ${(data['name'] as string) || 'a visitor'}`,
  displayName: 'Contact form message',
  to: CONTACT_RECIPIENT,
  previewData: {
    name: 'Anna Lindqvist',
    email: 'anna@example.com',
    message: 'Hi! I have a question about using Tillsa with our care team.',
    locale: 'sv',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  color: '#1f2430',
}
const container = { padding: '28px 26px', maxWidth: '580px' }
const heading = { fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }
const muted = { fontSize: '13px', color: '#6b7280', margin: '0 0 18px' }
const card = {
  backgroundColor: '#f6f7f9',
  border: '1px solid #e6e8ec',
  borderRadius: '12px',
  padding: '16px 18px',
}
const label = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: '#7a8394',
  margin: '10px 0 2px',
}
const value = { fontSize: '15px', margin: '0', color: '#1f2430' }
const body = {
  fontSize: '15px',
  lineHeight: '1.65',
  whiteSpace: 'pre-wrap' as const,
  margin: '4px 0 0',
}
const hr = { borderColor: '#e6e8ec', margin: '22px 0' }
