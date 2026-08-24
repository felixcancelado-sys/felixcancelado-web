import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type DashboardData = {
  ordersCount: number;
  totalSold: number;
  totalPaid: number;
  pending: number;
  unpaidCount: number;
};

const API_BASE_URL = import.meta.env.VITE_ORDERS_API_URL || "";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function PanelPage() {
  const [email, setEmail] = useState("felixcancelado@gmail.com");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("orders_panel_token") || "");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isConfigured = useMemo(() => API_BASE_URL.length > 0, []);

  async function loadDashboard(activeToken: string) {
    const response = await fetch(`${API_BASE_URL}/api/panel/dashboard`, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar el panel.");
    }

    const data = (await response.json()) as DashboardData;
    setDashboard(data);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      if (!isConfigured) {
        throw new Error("Falta configurar la URL de la API.");
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("No se pudo iniciar sesion.");
      }

      const data = (await response.json()) as { token: string };
      localStorage.setItem("orders_panel_token", data.token);
      setToken(data.token);
      await loadDashboard(data.token);
      setMessage("Ingreso correcto.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al ingresar.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    setMessage("");
    setIsLoading(true);

    try {
      await loadDashboard(token);
      setMessage("Panel actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al actualizar.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("orders_panel_token");
    setToken("");
    setDashboard(null);
    setPassword("");
    setMessage("Sesion cerrada.");
  }

  return (
    <div className="panel-shell">
      <main className="panel-card">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Félix Cancelado</p>
            <h1>Panel</h1>
            <p>Órdenes, pendientes y contactos.</p>
          </div>

          <a className="panel-home-link" href="#inicio">
            Volver
          </a>
        </div>

        {!token ? (
          <form className="panel-login" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={email}
                autoComplete="username"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label>
              Clave
              <input
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Ingresando..." : "Entrar al panel"}
            </button>
          </form>
        ) : (
          <section className="panel-dashboard">
            <div className="panel-actions">
              <button type="button" onClick={handleRefresh} disabled={isLoading}>
                {isLoading ? "Actualizando..." : "Actualizar"}
              </button>

              <button type="button" className="panel-secondary-button" onClick={handleLogout}>
                Salir
              </button>
            </div>

            {!dashboard ? (
              <div className="panel-empty">
                <p>Ingreso correcto. Actualiza el panel para ver los datos.</p>
              </div>
            ) : (
              <div className="panel-metrics">
                <article>
                  <span>Órdenes</span>
                  <strong>{dashboard.ordersCount}</strong>
                </article>

                <article>
                  <span>Total vendido</span>
                  <strong>{formatMoney(dashboard.totalSold)}</strong>
                </article>

                <article>
                  <span>Total cobrado</span>
                  <strong>{formatMoney(dashboard.totalPaid)}</strong>
                </article>

                <article>
                  <span>Pendiente</span>
                  <strong>{formatMoney(dashboard.pending)}</strong>
                </article>

                <article>
                  <span>Sin pagar</span>
                  <strong>{dashboard.unpaidCount}</strong>
                </article>
              </div>
            )}

            <div className="panel-next">
              <h2>Próximo paso</h2>
              <p>
                Crear módulos de Contactos, Órdenes, Pendientes, Reportes y Configuración.
              </p>
              <p>
                La primera orden real debe conservar el consecutivo #682.
              </p>
            </div>
          </section>
        )}

        {message ? <p className="panel-message">{message}</p> : null}
      </main>
    </div>
  );
}

