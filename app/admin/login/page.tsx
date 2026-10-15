import Link from "next/link";
import { signIn } from "@/app/admin/actions";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="admin-shell login-shell">
      <section className="login-panel">
        <Link href="/" className="admin-back">
          ← Volver a la tienda
        </Link>
        <div className="login-kicker">
          <span className="brand-mark">TN</span>
          <span>área privada</span>
        </div>
        <span className="section-number">TN / ADMIN</span>
        <h1>
          Entrar a<br />
          <em>cocina.</em>
        </h1>
        <p>Acceso privado para administrar la carta y los pedidos.</p>
        <form action={signIn} className="login-form">
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              defaultValue="admin@admin.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {params.error && (
            <p className="form-status" role="alert">
              {params.error}
            </p>
          )}
          <button className="primary-action wide" type="submit">
            Entrar <span>↗</span>
          </button>
        </form>
      </section>
    </main>
  );
}
