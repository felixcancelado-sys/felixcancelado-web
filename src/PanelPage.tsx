import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type DashboardData = {
  ordersCount: number;
  totalSold: number;
  totalPaid: number;
  pending: number;
  unpaidCount: number;
};

type Contact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  company?: string | null;
  status?: string;
};

type PanelSection = "dashboard" | "contacts";

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
  const [section, setSection] = useState<PanelSection>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    company: "",
    notes: "",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isConfigured = useMemo(() => API_BASE_URL.length > 0, []);

  async function apiFetch(path: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error("No se pudo completar la solicitud.");
    }

    return response;
  }

  async function loadDashboard(activeToken = token) {
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

  async function loadContacts() {
    const response = await apiFetch("/api/panel/contacts");
    const data = (await response.json()) as Contact[];
    setContacts(data);
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
      if (section === "dashboard") {
        await loadDashboard();
      }

      if (section === "contacts") {
        await loadContacts();
      }

      setMessage("Panel actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al actualizar.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      if (!contactForm.firstName.trim()) {
        throw new Error("El nombre es obligatorio.");
      }

      await apiFetch("/api/panel/contacts", {
        method: "POST",
        body: JSON.stringify({
          firstName: contactForm.firstName.trim(),
          lastName: contactForm.lastName.trim() || undefined,
          email: contactForm.email.trim() || undefined,
          phone: contactForm.phone.trim() || undefined,
          country: contactForm.country.trim() || undefined,
          city: contactForm.city.trim() || undefined,
          company: contactForm.company.trim() || undefined,
          notes: contactForm.notes.trim() || undefined,
        }),
      });

      setContactForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        country: "",
        city: "",
        company: "",
        notes: "",
      });

      await loadContacts();
      setMessage("Contacto creado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al crear contacto.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("orders_panel_token");
    setToken("");
    setDashboard(null);
    setContacts([]);
    setPassword("");
    setMessage("Sesion cerrada.");
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    if (section === "dashboard" && !dashboard) {
      loadDashboard().catch(() => setMessage("No se pudo cargar el panel."));
    }

    if (section === "contacts") {
      loadContacts().catch(() => setMessage("No se pudieron cargar los contactos."));
    }
  }, [section, token]);

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
            <nav className="panel-tabs" aria-label="Secciones del panel">
              <button
                type="button"
                className={section === "dashboard" ? "panel-tab-active" : ""}
                onClick={() => setSection("dashboard")}
              >
                Dashboard
              </button>

              <button
                type="button"
                className={section === "contacts" ? "panel-tab-active" : ""}
                onClick={() => setSection("contacts")}
              >
                Contactos
              </button>

              <button type="button" disabled>
                Órdenes
              </button>

              <button type="button" disabled>
                Pendientes
              </button>

              <button type="button" disabled>
                Reportes
              </button>

              <button type="button" disabled>
                Configuración
              </button>
            </nav>

            <div className="panel-actions">
              <button type="button" onClick={handleRefresh} disabled={isLoading}>
                {isLoading ? "Actualizando..." : "Actualizar"}
              </button>

              <button type="button" className="panel-secondary-button" onClick={handleLogout}>
                Salir
              </button>
            </div>

            {section === "dashboard" ? (
              <>
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
              </>
            ) : null}

            {section === "contacts" ? (
              <section className="panel-contacts">
                <div className="panel-section-title">
                  <div>
                    <h2>Contactos</h2>
                    <p>Base privada para clientes, pendientes y órdenes.</p>
                  </div>

                  <strong>{contacts.length} contacto(s)</strong>
                </div>

                <form className="panel-contact-form" onSubmit={handleCreateContact}>
                  <label>
                    Nombre *
                    <input
                      value={contactForm.firstName}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          firstName: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Apellido
                    <input
                      value={contactForm.lastName}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          lastName: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Email
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Teléfono
                    <input
                      value={contactForm.phone}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    País
                    <input
                      value={contactForm.country}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          country: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Ciudad
                    <input
                      value={contactForm.city}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Empresa
                    <input
                      value={contactForm.company}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          company: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="panel-contact-notes">
                    Notas
                    <textarea
                      value={contactForm.notes}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button type="submit" disabled={isLoading}>
                    {isLoading ? "Guardando..." : "Crear contacto"}
                  </button>
                </form>

                <div className="panel-contact-list">
                  {contacts.length === 0 ? (
                    <div className="panel-empty">
                      <p>Aún no hay contactos cargados.</p>
                    </div>
                  ) : (
                    contacts.map((contact) => (
                      <article key={contact.id} className="panel-contact-item">
                        <div>
                          <strong>
                            {contact.firstName} {contact.lastName || ""}
                          </strong>
                          <span>{contact.email || "Sin email"}</span>
                        </div>

                        <div>
                          <span>{contact.company || "Sin empresa"}</span>
                          <span>
                            {[contact.city, contact.country].filter(Boolean).join(", ") ||
                              "Sin ubicación"}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            ) : null}
          </section>
        )}

        {message ? <p className="panel-message">{message}</p> : null}
      </main>
    </div>
  );
}
