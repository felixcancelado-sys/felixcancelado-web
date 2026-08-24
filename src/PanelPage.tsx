import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { jsPDF } from "jspdf";

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
  notes?: string | null;
  status?: string;
};

type Order = {
  id: string;
  number: number;
  description: string;
  detail?: string | null;
  status: string;
  currency: string;
  total: string | number;
  subtotal?: string | number;
  discount?: string | number;
  issueDate: string;
  dueDate?: string | null;
  document?: {
    fileName: string;
  } | null;
  hours?: string | number | null;
  rate?: string | number | null;
  quantity?: string | number | null;
  internalNotes?: string | null;
  contact?: {
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    country?: string | null;
    city?: string | null;
    company?: string | null;
  };
};

type PanelSection = "dashboard" | "contacts" | "orders" | "pending";
type ContactView = "create" | "list";
type OrderView = "create" | "list";
type BillingMode = "hours" | "service";
type PaymentRegion = "argentina" | "colombia" | "world";

const API_BASE_URL = import.meta.env.VITE_ORDERS_API_URL || "";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function optionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const normalizedValue = value.replace(",", ".");
  const numberValue = Number(normalizedValue);

  if (Number.isNaN(numberValue)) {
    return undefined;
  }

  return numberValue;
}

function formatOrderStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Borrador",
    SENT: "Enviada",
    UNPAID: "Sin pagar",
    PAID: "Pagada",
    OVERDUE: "Vencida",
    CANCELLED: "Cancelada",
  };

  return labels[status] || status;
}
function getPaymentDetailsByRegion(region: PaymentRegion) {
  if (region === "argentina") {
    return {
      label: "Argentina · BBVA",
      lines: [
        "Alias: PROFE.FELIX.CANCELAD",
        "CBU: 0170006040000005422924",
        "Cuenta: 6-54229/2",
        "Tipo: Caja de Ahorros",
      ],
    };
  }

  if (region === "colombia") {
    return {
      label: "Colombia · Llave Nu",
      lines: ["Llave Nu: @FCJ615"],
    };
  }

  return {
    label: "Resto del mundo · PayPal",
    lines: ["PayPal: felixcancelado@gmail.com"],
  };
}

function guessPaymentRegion(country?: string | null): PaymentRegion {
  const normalizedCountry = (country || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (normalizedCountry.includes("argentina")) {
    return "argentina";
  }

  if (normalizedCountry.includes("colombia")) {
    return "colombia";
  }

  return "world";
}









export function PanelPage() {
  const [email, setEmail] = useState("felixcancelado@gmail.com");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("orders_panel_token") || "");

  const [section, setSection] = useState<PanelSection>("dashboard");
  const [contactView, setContactView] = useState<ContactView>("create");
  const [orderView, setOrderView] = useState<OrderView>("create");

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

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

  const [orderForm, setOrderForm] = useState({
    contactId: "",
    dueDate: "",
    status: "DRAFT",
    description: "",
    detail: "",
    hours: "",
    rate: "",
    serviceTotal: "",
    discount: "0",
    internalNotes: "",
  });

  const [orderDocument, setOrderDocument] = useState<File | null>(null);
  const [billingMode, setBillingMode] = useState<BillingMode>("hours");
  const [paymentRegion, setPaymentRegion] = useState<PaymentRegion>("argentina");
  const [contactSearch, setContactSearch] = useState("");
  const [orderContactSearch, setOrderContactSearch] = useState("");

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isConfigured = useMemo(() => API_BASE_URL.length > 0, []);

  const estimatedSubtotal = useMemo(() => {
    if (billingMode === "service") {
      return optionalNumber(orderForm.serviceTotal) || 0;
    }

    const hours = optionalNumber(orderForm.hours) || 0;
    const rate = optionalNumber(orderForm.rate) || 0;
    return hours * rate;
  }, [billingMode, orderForm.hours, orderForm.rate, orderForm.serviceTotal]);

  const estimatedDiscount = useMemo(() => {
    return optionalNumber(orderForm.discount) || 0;
  }, [orderForm.discount]);

  const estimatedTotal = Math.max(estimatedSubtotal - estimatedDiscount, 0);


  const selectedPaymentDetails = useMemo(() => {
    return getPaymentDetailsByRegion(paymentRegion);
  }, [paymentRegion]);

  const filteredContacts = useMemo(() => {
    const query = contactSearch.toLowerCase().trim();

    if (!query) {
      return contacts;
    }

    return contacts.filter((contact) => {
      const text = [
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone,
        contact.company,
        contact.city,
        contact.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [contacts, contactSearch]);

  const filteredOrderContacts = useMemo(() => {
    const query = orderContactSearch.toLowerCase().trim();

    if (!query) {
      return [];
    }

    return contacts
      .filter((contact) => {
        const text = [
          contact.firstName,
          contact.lastName,
          contact.email,
          contact.company,
          contact.city,
          contact.country,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(query);
      })
      .slice(0, 40);
  }, [contacts, orderContactSearch]);

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
      let errorMessage = "No se pudo completar la solicitud.";

      try {
        const errorData = await response.json();
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Keep default message.
      }

      throw new Error(errorMessage);
    }

    return response;
  }

  async function uploadOrderDocument(orderId: string, file: File) {
    const formData = new FormData();
    formData.append("document", file);

    const response = await fetch(`${API_BASE_URL}/api/panel/orders/${orderId}/document`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = "La orden fue creada, pero no se pudo adjuntar el PDF.";

      try {
        const errorData = await response.json();
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Keep default message.
      }

      throw new Error(errorMessage);
    }
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

  async function loadOrders() {
    const response = await apiFetch("/api/panel/orders");
    const data = (await response.json()) as Order[];
    setOrders(data);
  }

  async function loadPendingOrders() {
    const response = await apiFetch("/api/panel/orders/pending");
    const data = (await response.json()) as Order[];
    setPendingOrders(data);
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

      if (section === "orders") {
        await loadContacts();
        await loadOrders();
      }

      if (section === "pending") {
        await loadPendingOrders();
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
      setContactView("list");
      setMessage("Contacto creado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al crear contacto.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      if (!orderForm.contactId) {
        throw new Error("Selecciona un contacto.");
      }

      if (!orderForm.description.trim()) {
        throw new Error("La descripcion es obligatoria.");
      }

      if (estimatedTotal <= 0) {
        throw new Error("La orden debe tener un total mayor a cero.");
      }

      const response = await apiFetch("/api/panel/orders", {
        method: "POST",
        body: JSON.stringify({
          contactId: orderForm.contactId,
          dueDate: orderForm.dueDate || undefined,
          status: orderForm.status,
          currency: "ARS",
          description: orderForm.description.trim(),
          detail: orderForm.detail.trim() || undefined,
          hours: billingMode === "hours" ? optionalNumber(orderForm.hours) : undefined,
          rate: billingMode === "hours" ? optionalNumber(orderForm.rate) : undefined,
          quantity: billingMode === "hours" ? optionalNumber(orderForm.hours) : 1,
          subtotal: estimatedSubtotal,
          discount: optionalNumber(orderForm.discount) || 0,
          total: estimatedTotal,
          internalNotes: [
            orderForm.internalNotes.trim(),
            `Tipo de cobro: ${billingMode === "hours" ? "Por horas" : "Servicio cerrado"}`,
            `Pago: ${selectedPaymentDetails.label}`,
            ...selectedPaymentDetails.lines,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });

      const createdOrder = (await response.json()) as { id?: string };

      if (orderDocument) {
        if (!createdOrder.id) {
          throw new Error("La orden fue creada, pero no se pudo identificar para adjuntar el PDF.");
        }

        await uploadOrderDocument(createdOrder.id, orderDocument);
      }

      setOrderForm({
        contactId: "",
        dueDate: "",
        status: "DRAFT",
        description: "",
        detail: "",
        hours: "",
        rate: "",
        serviceTotal: "",
        discount: "0",
        internalNotes: "",
      });

      setOrderDocument(null);
      setBillingMode("hours");
      setPaymentRegion("argentina");
      setOrderContactSearch("");

      await loadDashboard();
      await loadOrders();
      setOrderView("list");
      setMessage(orderDocument ? "Orden creada con PDF adjunto." : "Orden creada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al crear orden.");
    } finally {
      setIsLoading(false);
    }
  }










  function getOrderPaymentDetails(order: Order) {
    const region = guessPaymentRegion(order.contact?.country || "");
    return getPaymentDetailsByRegion(region);
  }

  function getOrderCustomerName(order: Order) {
    if (!order.contact) {
      return "Cliente sin contacto";
    }

    return `${order.contact.firstName} ${order.contact.lastName || ""}`.trim();
  }

  function getOrderCustomerLocation(order: Order) {
    return [order.contact?.city, order.contact?.country].filter(Boolean).join(", ");
  }

  function formatCanvasText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines = 4
  ) {
    const words = String(text || "").split(" ");
    const lines: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = context.measureText(testLine).width;

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    lines.slice(0, maxLines).forEach((line, index) => {
      context.fillText(line, x, y + index * lineHeight);
    });

    return y + Math.min(lines.length, maxLines) * lineHeight;
  }

  function loadLogoImage() {
    return new Promise<HTMLImageElement | null>((resolve) => {
      const logo = new Image();
      logo.onload = () => resolve(logo);
      logo.onerror = () => resolve(null);
      logo.src = "/logo-felix.png";
    });
  }

  async function buildOrderCanvas(order: Order) {
    const customer = getOrderCustomerName(order);
    const customerLocation = getOrderCustomerLocation(order);
    const payment = getOrderPaymentDetails(order);
    const issueDate = order.issueDate
      ? new Date(order.issueDate).toLocaleDateString("es-AR")
      : "";
    const dueDate = order.dueDate
      ? new Date(order.dueDate).toLocaleDateString("es-AR")
      : "Sin vencimiento";

    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = 1450;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo generar la orden.");
    }

    canvas.width = width;
    canvas.height = height;

    const logo = await loadLogoImage();

    context.fillStyle = "#f1f5f9";
    context.fillRect(0, 0, width, height);

    context.fillStyle = "#ffffff";
    context.beginPath();
    context.roundRect(70, 70, 940, 1310, 34);
    context.fill();

    if (logo) {
      context.drawImage(logo, 115, 115, 86, 86);
    }

    context.fillStyle = "#0f766e";
    context.font = "bold 26px Arial";
    context.fillText("FÉLIX CANCELADO", logo ? 225 : 115, 148);

    context.fillStyle = "#0f172a";
    context.font = "bold 72px Arial";
    context.fillText("Orden", logo ? 225 : 115, 232);

    context.font = "bold 34px Arial";
    context.fillText(`#${order.number}`, 820, 148);

    context.font = "24px Arial";
    context.fillText(formatOrderStatus(order.status), 780, 190);

    context.strokeStyle = "#e2e8f0";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(115, 300);
    context.lineTo(965, 300);
    context.stroke();

    context.fillStyle = "#64748b";
    context.font = "bold 22px Arial";
    context.fillText("CLIENTE", 115, 365);

    context.fillStyle = "#0f172a";
    context.font = "bold 34px Arial";
    formatCanvasText(context, customer, 115, 412, 780, 40, 2);

    context.font = "24px Arial";
    let customerY = 470;
    if (order.contact?.email) {
      context.fillText(order.contact.email, 115, customerY);
      customerY += 36;
    }

    if (customerLocation) {
      context.fillText(customerLocation, 115, customerY);
    }

    context.fillStyle = "#64748b";
    context.font = "bold 22px Arial";
    context.fillText("FECHAS", 650, 365);

    context.fillStyle = "#0f172a";
    context.font = "24px Arial";
    context.fillText(`Emisión: ${issueDate}`, 650, 412);
    context.fillText(`Vence: ${dueDate}`, 650, 450);

    context.fillStyle = "#f8fafc";
    context.beginPath();
    context.roundRect(115, 560, 850, 300, 26);
    context.fill();

    context.strokeStyle = "#e2e8f0";
    context.lineWidth = 2;
    context.strokeRect(115, 560, 850, 300);

    context.fillStyle = "#64748b";
    context.font = "bold 22px Arial";
    context.fillText("SERVICIO / DESCRIPCIÓN", 150, 620);

    context.fillStyle = "#0f172a";
    context.font = "bold 34px Arial";
    let y = formatCanvasText(context, order.description || "Servicio", 150, 675, 760, 42, 3);

    if (order.detail) {
      context.fillStyle = "#334155";
      context.font = "24px Arial";
      y = formatCanvasText(context, order.detail, 150, y + 22, 760, 34, 5);
    }

    const subtotal = Number(order.subtotal || order.total || 0);
    const discount = Number(order.discount || 0);
    const total = Number(order.total || 0);

    context.fillStyle = "#f8fafc";
    context.beginPath();
    context.roundRect(115, 900, 850, 180, 26);
    context.fill();

    context.fillStyle = "#64748b";
    context.font = "bold 22px Arial";
    context.fillText("RESUMEN", 150, 955);

    context.fillStyle = "#0f172a";
    context.font = "24px Arial";
    context.fillText("Subtotal", 150, 1005);
    context.fillText(formatMoney(subtotal), 760, 1005);

    context.fillText("Descuento", 150, 1045);
    context.fillText(formatMoney(discount), 760, 1045);

    context.fillStyle = "#0f766e";
    context.font = "bold 54px Arial";
    context.fillText(`Total: ${formatMoney(total)}`, 150, 1145);

    context.fillStyle = "#ecfeff";
    context.beginPath();
    context.roundRect(115, 1210, 850, 125, 26);
    context.fill();

    context.fillStyle = "#0f172a";
    context.font = "bold 28px Arial";
    context.fillText(payment.label, 150, 1260);

    context.font = "22px Arial";
    payment.lines.forEach((line: string, index: number) => {
      context.fillText(line, 150, 1300 + index * 30);
    });

    return canvas;
  }

  async function downloadOrderPdf(order: Order) {
    try {
      const canvas = await buildOrderCanvas(order);
      const imageData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`orden-${order.number}.pdf`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo descargar el PDF.");
    }
  }

  async function downloadOrderImage(order: Order) {
    try {
      const canvas = await buildOrderCanvas(order);
      const link = document.createElement("a");
      link.download = `orden-${order.number}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo descargar la imagen.");
    }
  }

  function prepareEmailOrder(order: Order, mode: "send" | "resend") {
    const hasAttachment = Boolean(order.document?.fileName);
    const action = mode === "send" ? "Envío" : "Reenvío";

    setMessage(
      `${action} preparado para la orden #${order.number} ${
        hasAttachment ? "con adjunto." : "sin adjunto."
      } Falta conectar el envío real por email.`
    );
  }


  function handleLogout() {
    localStorage.removeItem("orders_panel_token");
    setToken("");
    setDashboard(null);
    setContacts([]);
    setOrders([]);
    setPendingOrders([]);
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

    if (section === "contacts" && contactView === "list") {
      loadContacts().catch(() => setMessage("No se pudieron cargar los contactos."));
    }

    if (section === "orders") {
      loadContacts().catch(() => setMessage("No se pudieron cargar los contactos."));
      loadOrders().catch(() => setMessage("No se pudieron cargar las ordenes."));
    }

    if (section === "pending") {
      loadPendingOrders().catch(() => setMessage("No se pudieron cargar los pendientes."));
    }
  }, [section, contactView, orderView, token]);

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

              <button
                type="button"
                className={section === "orders" ? "panel-tab-active" : ""}
                onClick={() => setSection("orders")}
              >
                Órdenes
              </button>

              <button
                type="button"
                className={section === "pending" ? "panel-tab-active" : ""}
                onClick={() => setSection("pending")}
              >
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

                <div className="panel-subtabs">
                  <button
                    type="button"
                    className={contactView === "create" ? "panel-subtab-active" : ""}
                    onClick={() => setContactView("create")}
                  >
                    Crear contacto
                  </button>

                  <button
                    type="button"
                    className={contactView === "list" ? "panel-subtab-active" : ""}
                    onClick={() => setContactView("list")}
                  >
                    Listar contactos
                  </button>
                </div>

                {contactView === "create" ? (
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
                ) : null}

                {contactView === "list" ? (
                  <div className="panel-contact-list">
                    <label className="panel-search-field">
                      Buscar contacto
                      <input
                        value={contactSearch}
                        placeholder="Nombre, email, empresa, ciudad o país"
                        onChange={(event) => setContactSearch(event.target.value)}
                      />
                    </label>

                    {filteredContacts.length === 0 ? (
                      <div className="panel-empty">
                        <p>Aún no hay contactos cargados.</p>
                      </div>
                    ) : (
                      filteredContacts.map((contact) => (
                        <article key={contact.id} className="panel-contact-item">
                          <div>
                            <strong>
                              {contact.firstName} {contact.lastName || ""}
                            </strong>
                            <span>{contact.email || "Sin email"}</span>
                            <span>{contact.phone || "Sin teléfono"}</span>
                          </div>

                          <div>
                            <span>{contact.company || "Sin empresa"}</span>
                            <span>
                              {[contact.city, contact.country].filter(Boolean).join(", ") ||
                                "Sin ubicación"}
                            </span>
                            <span>{contact.notes || "Sin notas"}</span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            ) : null}

            {section === "orders" ? (
              <section className="panel-orders">
                <div className="panel-section-title">
                  <div>
                    <h2>Órdenes</h2>
                    <p>Crear, revisar y preparar órdenes para envío.</p>
                  </div>

                  <strong>{orders.length} orden(es)</strong>
                </div>

                <div className="panel-subtabs">
                  <button
                    type="button"
                    className={orderView === "create" ? "panel-subtab-active" : ""}
                    onClick={() => setOrderView("create")}
                  >
                    Crear orden
                  </button>

                  <button
                    type="button"
                    className={orderView === "list" ? "panel-subtab-active" : ""}
                    onClick={() => setOrderView("list")}
                  >
                    Listar órdenes
                  </button>
                </div>

                {orderView === "create" ? (
                  <form className="panel-order-form" onSubmit={handleCreateOrder}>
                    <div className="panel-wide-field panel-contact-picker">
                      <label>
                        Buscar contacto *
                        <input
                          value={orderContactSearch}
                          placeholder="Escribe nombre, email, empresa o pais"
                          onChange={(event) => setOrderContactSearch(event.target.value)}
                        />
                      </label>

                      <div className="panel-contact-picker-list">
                        {!orderContactSearch.trim() ? (
                          <span>Escribe para buscar un contacto.</span>
                        ) : filteredOrderContacts.length === 0 ? (
                          <span>No hay contactos para esa búsqueda.</span>
                        ) : (
                          filteredOrderContacts.map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              className={
                                orderForm.contactId === contact.id
                                  ? "panel-contact-picker-active"
                                  : ""
                              }
                              onClick={() => {
                                setOrderForm((current) => ({
                                  ...current,
                                  contactId: contact.id,
                                }));

                                setOrderContactSearch(
                                  `${contact.firstName} ${contact.lastName || ""} ${contact.email || ""}`.trim()
                                );

                                setPaymentRegion(guessPaymentRegion(contact.country));
                              }}
                            >
                              <strong>
                                {contact.firstName} {contact.lastName || ""}
                              </strong>
                              <small>{contact.email || "Sin email"}</small>
                              <small>{[contact.city, contact.country].filter(Boolean).join(", ")}</small>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="panel-payment-card panel-wide-field">
                      <label>
                        Destino / medio de pago
                        <select
                          value={paymentRegion}
                          onChange={(event) =>
                            setPaymentRegion(event.target.value as PaymentRegion)
                          }
                        >
                          <option value="argentina">Argentina · BBVA</option>
                          <option value="colombia">Colombia · Llave Nu</option>
                          <option value="world">Resto del mundo · PayPal</option>
                        </select>
                      </label>

                      <div className="panel-payment-lines">
                        <span>Datos de pago</span>
                        <strong>{selectedPaymentDetails.label}</strong>
                        {selectedPaymentDetails.lines.map((line: string) => (
                          <small key={line}>{line}</small>
                        ))}
                      </div>
                    </div>

                    <label>
                      Estado
                      <select
                        value={orderForm.status}
                        onChange={(event) =>
                          setOrderForm((current) => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
                      >
                        <option value="DRAFT">Borrador</option>
                        <option value="SENT">Enviada</option>
                        <option value="UNPAID">Sin pagar</option>
                      </select>
                    </label>

                    <label>
                      Vencimiento
                      <input
                        type="date"
                        value={orderForm.dueDate}
                        onChange={(event) =>
                          setOrderForm((current) => ({
                            ...current,
                            dueDate: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="panel-wide-field">
                      Tipo de cobro
                      <select
                        value={billingMode}
                        onChange={(event) =>
                          setBillingMode(event.target.value as BillingMode)
                        }
                      >
                        <option value="hours">Por horas</option>
                        <option value="service">Servicio cerrado</option>
                      </select>
                    </label>

                    <label className="panel-wide-field">
                      Descripción *
                      <input
                        value={orderForm.description}
                        placeholder="Ejemplo: Agosto"
                        onChange={(event) =>
                          setOrderForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="panel-wide-field">
                      Detalle
                      <textarea
                        value={orderForm.detail}
                        placeholder="Ejemplo: 4, 11, 18, 25"
                        onChange={(event) =>
                          setOrderForm((current) => ({
                            ...current,
                            detail: event.target.value,
                          }))
                        }
                      />
                    </label>

                    {billingMode === "hours" ? (
                      <>
                        <label>
                          Horas
                          <input
                            inputMode="decimal"
                            value={orderForm.hours}
                            placeholder="4"
                            onChange={(event) =>
                              setOrderForm((current) => ({
                                ...current,
                                hours: event.target.value,
                              }))
                            }
                          />
                        </label>

                        <label>
                          Valor hora
                          <input
                            inputMode="decimal"
                            value={orderForm.rate}
                            placeholder="22950"
                            onChange={(event) =>
                              setOrderForm((current) => ({
                                ...current,
                                rate: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </>
                    ) : (
                      <label className="panel-wide-field">
                        Valor del servicio
                        <input
                          inputMode="decimal"
                          value={orderForm.serviceTotal}
                          placeholder="91800"
                          onChange={(event) =>
                            setOrderForm((current) => ({
                              ...current,
                              serviceTotal: event.target.value,
                            }))
                          }
                        />
                      </label>
                    )}

                    <label>
                      Descuento
                      <input
                        inputMode="decimal"
                        value={orderForm.discount}
                        onChange={(event) =>
                          setOrderForm((current) => ({
                            ...current,
                            discount: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="panel-wide-field">
                      Notas internas
                      <textarea
                        value={orderForm.internalNotes}
                        placeholder="Notas privadas. No aparecen en la orden."
                        onChange={(event) =>
                          setOrderForm((current) => ({
                            ...current,
                            internalNotes: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="panel-wide-field">
                      Adjuntar documento legal PDF
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setOrderDocument(file);
                        }}
                      />
                    </label>

                    <div className="panel-order-total">
                      <span>Subtotal estimado</span>
                      <strong>{formatMoney(estimatedSubtotal)}</strong>

                      <span>Descuento</span>
                      <strong>{formatMoney(estimatedDiscount)}</strong>

                      <span>Total estimado</span>
                      <strong>{formatMoney(estimatedTotal)}</strong>
                    </div>

                    <button type="submit" disabled={isLoading}>
                      {isLoading ? "Guardando..." : "Guardar orden"}
                    </button>
                  </form>
                ) : null}

                {orderView === "list" ? (
                  <div className="panel-order-list">
                    {orders.length === 0 ? (
                      <div className="panel-empty">
                        <p>Aún no hay órdenes creadas. La primera orden real será la #682.</p>
                      </div>
                    ) : (
                      orders.map((order) => (
                        <article key={order.id} className="panel-order-item">
                          <div>
                            <strong>Orden #{order.number}</strong>
                            <span>{order.description}</span>
                            <span>
                              {order.contact
                                ? `${order.contact.firstName} ${
                                    order.contact.lastName || ""
                                  } - ${order.contact.email || "sin email"}`
                                : "Sin contacto"}
                            </span>
                          </div>

                          <div>
                            <strong>{formatMoney(Number(order.total))}</strong>
                            <span>{formatOrderStatus(order.status)}</span>
                            <span>
                              {order.document?.fileName
                                ? `PDF adjunto: ${order.document.fileName}`
                                : "Sin PDF adjunto"}
                            </span>
                            <span>
                              {order.dueDate
                                ? `Vence: ${new Date(order.dueDate).toLocaleDateString("es-AR")}`
                                : "Sin vencimiento"}
                            </span>

                            <div className="panel-order-actions-row">
                              <button
                                type="button"
                                className="panel-small-action"
                                onClick={() => downloadOrderPdf(order)}
                              >
                                Descargar PDF
                              </button>

                              <button
                                type="button"
                                className="panel-small-action"
                                onClick={() => downloadOrderImage(order)}
                              >
                                Descargar imagen
                              </button>

                              <button
                                type="button"
                                className="panel-small-action"
                                onClick={() => prepareEmailOrder(order, "send")}
                              >
                                Enviar email
                              </button>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            ) : null}

            {section === "pending" ? (
              <section className="panel-orders">
                <div className="panel-section-title">
                  <div>
                    <h2>Pendientes</h2>
                    <p>Órdenes enviadas, sin pagar o vencidas.</p>
                  </div>

                  <strong>{pendingOrders.length} pendiente(s)</strong>
                </div>

                <div className="panel-order-list">
                  {pendingOrders.length === 0 ? (
                    <div className="panel-empty">
                      <p>No hay órdenes pendientes por cobrar.</p>
                    </div>
                  ) : (
                    pendingOrders.map((order) => (
                      <article key={order.id} className="panel-order-item">
                        <div>
                          <strong>Orden #{order.number}</strong>
                          <span>{order.contact?.email || "Sin email"}</span>
                        </div>

                        <div>
                          <strong>{formatMoney(Number(order.total))}</strong>
                          <span>{formatOrderStatus(order.status)}</span>

                          <button
                            type="button"
                            className="panel-small-action"
                            onClick={() => prepareEmailOrder(order, "resend")}
                          >
                            Reenviar orden
                          </button>
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
