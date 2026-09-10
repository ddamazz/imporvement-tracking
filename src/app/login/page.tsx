import { redirect } from "next/navigation";
import { hasSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Trakker — Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await hasSession()) {
    redirect("/");
  }

  const { next } = await props.searchParams;
  const target = typeof next === "string" ? next : "/";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-text text-lg font-semibold text-bg">
            T
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Trakker</h1>
          <p className="mt-1 text-sm text-muted">
            Enter the shared password to continue.
          </p>
        </div>
        <LoginForm next={target} />
      </div>
    </main>
  );
}
