import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Users, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/carenest/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareNest — Care, together" },
      {
        name: "description",
        content:
          "A warm, calm care coordination app for families with medically complex children and the caregivers who support them.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-8 pt-8 flex items-center justify-between">
        <Logo size={44} withWordmark />
        <div className="hidden sm:flex items-center gap-2">
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/auth/login">Log in</Link>
          </Button>
          <Button asChild className="rounded-full px-6">
            <Link to="/auth/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="flex-1 grid lg:grid-cols-2 gap-10 items-center px-8 lg:px-16 py-12 max-w-7xl mx-auto w-full">
        <div className="space-y-7 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-lavender px-4 py-1.5 text-xs font-semibold text-primary">
            <Heart className="size-3.5 fill-current" /> Care, together
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
            A calm home for{" "}
            <span className="text-primary">your child's care team</span>.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
            Coordinate medications, vitals, feeds and handovers in one warm,
            tablet-friendly space — so every caregiver knows exactly what your
            child needs, when.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Button asChild size="lg" className="rounded-full px-8 h-14 text-base">
              <Link to="/auth/signup">Create a family account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full px-8 h-14 text-base border-2"
            >
              <Link to="/invite">I have an invite code</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>

        <div className="relative">
          <div className="card-soft p-8 space-y-6 rotate-1">
            <FeatureRow
              icon={<Heart className="size-5" />}
              title="Built around your child"
              body="One clear schedule of meds, feeds, vitals and care tasks."
            />
            <FeatureRow
              icon={<Users className="size-5" />}
              title="Your whole care team"
              body="Invite caregivers, hand over shifts, leave notes that don't get lost."
            />
            <FeatureRow
              icon={<ShieldCheck className="size-5" />}
              title="Private and secure"
              body="Your child's information stays with the people you trust."
            />
          </div>
          <div className="absolute -z-10 -inset-6 bg-gradient-to-br from-lavender to-primary-soft rounded-[3rem] blur-2xl opacity-60" />
        </div>
      </section>
    </main>
  );
}

function FeatureRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="rounded-2xl bg-primary-soft text-primary p-3 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{body}</p>
      </div>
    </div>
  );
}
