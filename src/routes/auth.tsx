import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Logo } from "@/components/carenest/Logo";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-8 pt-6">
        <Link to="/" className="inline-block">
          <Logo size={40} withWordmark />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
