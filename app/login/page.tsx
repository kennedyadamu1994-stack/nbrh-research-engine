import { redirect } from "next/navigation";
import { getValidAdminSession } from "@/lib/auth/guard";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  // Already signed in? Skip the form and go straight to the status page.
  const session = await getValidAdminSession();
  if (session) redirect("/");

  return (
    <main className="splash">
      <div className="splash-content">
        <p className="eyebrow">The NBRH</p>
        <h1>
          Research <em>Engine</em>
        </h1>
        <p className="muted">Admin sign in</p>
        <LoginForm />
      </div>
    </main>
  );
}
