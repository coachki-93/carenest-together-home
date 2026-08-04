import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const serif = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  letterSpacing: "-0.025em",
} as const;

type Status = "idle" | "sending" | "success" | "error";

/**
 * Contact form card — shared by /contact and /support.
 *
 * The submit path is unchanged and deliberately narrow: it POSTs to the
 * open-relay-proof /api/public/contact endpoint, carries the honeypot
 * ("website") and the client render timestamp for the server-side time trap,
 * and never chooses a recipient or template. Do not widen it.
 */
export function ContactForm({ idPrefix = "contact" }: { idPrefix?: string }) {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorText, setErrorText] = useState("");
  const startedAt = useRef<number>(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next["name"] = t("marketing.contact.errorName");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next["email"] = t("marketing.contact.errorEmail");
    if (message.trim().length < 10)
      next["message"] = t("marketing.contact.errorMessage");
    else if (message.trim().length > 5000)
      next["message"] = t("marketing.contact.errorMessageLong");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    setErrorText("");
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          locale: i18n.language === "sv" ? "sv" : "en",
          website,
          startedAt: startedAt.current,
        }),
      });
      if (res.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
        return;
      }
      setErrorText(
        res.status === 429
          ? t("marketing.contact.rateLimited")
          : t("marketing.contact.errorBody"),
      );
      setStatus("error");
    } catch {
      setErrorText(t("marketing.contact.errorBody"));
      setStatus("error");
    }
  }

  return (
    <div className="mk-glass rounded-3xl p-6 md:p-8">
      {status === "success" ? (
        <div className="text-center space-y-4 py-4">
          <CheckCircle2
            className="size-10 mx-auto text-marketing-sage"
            strokeWidth={1.6}
          />
          <h2 className="text-marketing-ink text-xl" style={serif}>
            {t("marketing.contact.successTitle")}
          </h2>
          <p className="text-marketing-muted text-sm leading-relaxed">
            {t("marketing.contact.successBody")}
          </p>
          <Button variant="outline" onClick={() => setStatus("idle")}>
            {t("marketing.contact.successAgain")}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-name`}>
              {t("marketing.contact.nameLabel")}
            </Label>
            <Input
              id={`${idPrefix}-name`}
              value={name}
              maxLength={100}
              autoComplete="name"
              placeholder={t("marketing.contact.namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
            {errors["name"] && (
              <p className="text-xs text-destructive">{errors["name"]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-email`}>
              {t("marketing.contact.emailLabel")}
            </Label>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={email}
              maxLength={255}
              autoComplete="email"
              placeholder={t("marketing.contact.emailPlaceholder")}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors["email"] && (
              <p className="text-xs text-destructive">{errors["email"]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-message`}>
              {t("marketing.contact.messageLabel")}
            </Label>
            <Textarea
              id={`${idPrefix}-message`}
              rows={6}
              value={message}
              maxLength={5000}
              placeholder={t("marketing.contact.messagePlaceholder")}
              onChange={(e) => setMessage(e.target.value)}
            />
            {errors["message"] && (
              <p className="text-xs text-destructive">{errors["message"]}</p>
            )}
          </div>

          {/* Honeypot — hidden from humans, catnip for bots */}
          <div
            aria-hidden
            className="absolute -left-[9999px] size-px overflow-hidden"
          >
            <label htmlFor={`${idPrefix}-website`}>Website</label>
            <input
              id={`${idPrefix}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {status === "error" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-sm font-medium text-destructive">
                {t("marketing.contact.errorTitle")}
              </p>
              <p className="text-xs text-marketing-muted mt-1">{errorText}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={status === "sending"}>
            {status === "sending"
              ? t("marketing.contact.sending")
              : t("marketing.contact.submit")}
          </Button>

          <p className="text-xs text-marketing-muted text-center">
            {t("marketing.contact.privacyNote")}
          </p>
        </form>
      )}
    </div>
  );
}
