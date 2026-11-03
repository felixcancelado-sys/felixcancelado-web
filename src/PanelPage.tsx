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

type OrderItemData = {
  id?: string;

  description: string;
  detail?: string | null;

  billingMode?: "HOURS" | "SERVICE";

  quantity: string | number;
  unitPrice: string | number;

  discountType?: DiscountType;
  discountValue?: string | number;
  discountAmount?: string | number;

  total: string | number;
  position?: number;
};

type OrderFormItem = {
  key: string;

  description: string;
  detail: string;

  billingMode: "HOURS" | "SERVICE";

  quantity: string;
  unitPrice: string;

  discountType: DiscountType;
  discountValue: string;
};
type Order = {
  id: string;
  number: number;
  contactId: string;
  items?: OrderItemData[];
  description: string;
  detail?: string | null;
  status: string;
  currency: string;
  total: string | number;
  subtotal?: string | number;
  discount?: string | number;
  discountType?: DiscountType;
  discountValue?: string | number;
  issueDate: string;
  dueDate?: string | null;
  document?: {
    fileName: string;
  } | null;
  hours?: string | number | null;
  rate?: string | number | null;
  quantity?: string | number | null;
  internalNotes?: string | null;
  clientNotes?: string | null;
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
type ContactView = "create" | "list" | "edit";
type OrderView = "create" | "list";
type DiscountType = "FIXED" | "PERCENT";
type PaymentRegion = "argentina" | "colombia" | "world";
type DashboardView = "aggregate" | "monthly";

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
  const [dashboardView, setDashboardView] = useState<DashboardView>("aggregate");
  const [dashboardMonth, setDashboardMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

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

  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

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
    discountType: "FIXED" as DiscountType,
    clientNotes: "",
    internalNotes: "",
  });

  const [orderItems, setOrderItems] = useState<OrderFormItem[]>([
    {
      key: "item-1",
      description: "",
      detail: "",
      billingMode: "HOURS",
      quantity: "",
      unitPrice: "",
      discountType: "FIXED",
      discountValue: "0",
    },
  ]);

  const [orderDocument, setOrderDocument] = useState<File | null>(null);
  const [paymentRegion, setPaymentRegion] = useState<PaymentRegion>("argentina");
  const [contactSearch, setContactSearch] = useState("");
  const [orderContactSearch, setOrderContactSearch] = useState("");

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isConfigured = useMemo(() => API_BASE_URL.length > 0, []);

  function getItemAmounts(item: OrderFormItem) {
    const quantity =
      item.billingMode === "SERVICE"
        ? 1
        : optionalNumber(item.quantity) || 0;

    const unitPrice =
      optionalNumber(item.unitPrice) || 0;

    const gross =
      quantity * unitPrice;

    const discountValue =
      optionalNumber(item.discountValue) || 0;

    let discountAmount = 0;

    if (item.discountType === "PERCENT") {
      const percent = Math.min(
        Math.max(discountValue, 0),
        100
      );

      discountAmount =
        gross * (percent / 100);
    } else {
      discountAmount =
        Math.max(discountValue, 0);
    }

    discountAmount =
      Math.min(discountAmount, gross);

    const total =
      Math.max(
        gross - discountAmount,
        0
      );

    return {
      quantity,
      unitPrice,
      gross,
      discountAmount,
      total,
    };
  }


  const estimatedDiscount = useMemo(() => {
    return orderItems.reduce(
      (sum, item) =>
        sum +
        getItemAmounts(item).discountAmount,
      0
    );
  }, [orderItems]);


  const estimatedSubtotal = useMemo(() => {
    return orderItems.reduce(
      (sum, item) =>
        sum +
        getItemAmounts(item).total,
      0
    );
  }, [orderItems]);


  const estimatedTotal =
    estimatedSubtotal;

  const monthlyDashboard = useMemo<DashboardData>(() => {
    const monthOrders = orders.filter((order) => {
      return (
        order.issueDate?.slice(0, 7) === dashboardMonth &&
        order.status !== "CANCELLED"
      );
    });

    const totalSold = monthOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const totalPaid = monthOrders
      .filter((order) => order.status === "PAID")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    const unpaidOrders = monthOrders.filter(
      (order) => order.status !== "PAID"
    );

    const pending = unpaidOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    return {
      ordersCount: monthOrders.length,
      totalSold,
      totalPaid,
      pending,
      unpaidCount: unpaidOrders.length,
    };
  }, [orders, dashboardMonth]);

  const dashboardMonthLabel = useMemo(() => {
    const [year, month] = dashboardMonth.split("-").map(Number);

    return new Intl.DateTimeFormat("es-AR", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, 1));
  }, [dashboardMonth]);

  const activeDashboard =
    dashboardView === "monthly" ? monthlyDashboard : dashboard;


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
        await Promise.all([
          loadDashboard(),
          loadOrders(),
        ]);
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


  function resetContactForm() {
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
  }

  function beginEditContact(contact: Contact) {
    setEditingContactId(contact.id);

    setContactForm({
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      country: contact.country || "",
      city: contact.city || "",
      company: contact.company || "",
      notes: contact.notes || "",
    });

    setContactView("edit");
    setMessage("");
  }

  function cancelEditContact() {
    setEditingContactId(null);
    resetContactForm();
    setContactView("list");
  }

  async function handleUpdateContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      if (!editingContactId) {
        throw new Error("No hay un contacto seleccionado.");
      }

      if (!contactForm.firstName.trim()) {
        throw new Error("El nombre es obligatorio.");
      }

      await apiFetch(`/api/panel/contacts/${editingContactId}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: contactForm.firstName.trim(),
          lastName: contactForm.lastName.trim(),
          email: contactForm.email.trim(),
          phone: contactForm.phone.trim(),
          country: contactForm.country.trim(),
          city: contactForm.city.trim(),
          company: contactForm.company.trim(),
          notes: contactForm.notes.trim(),
        }),
      });

      await loadContacts();

      setEditingContactId(null);
      resetContactForm();
      setContactView("list");
      setMessage("Contacto actualizado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Error al actualizar contacto."
      );
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

      resetContactForm();
      setEditingContactId(null);

      await loadContacts();
      setContactView("list");
      setMessage("Contacto creado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al crear contacto.");
    } finally {
      setIsLoading(false);
    }
  }
  function createEmptyOrderItem(): OrderFormItem {
    return {
      key: `${Date.now()}-${Math.random()}`,
      description: "",
      detail: "",
      billingMode: "HOURS",
      quantity: "",
      unitPrice: "",
      discountType: "FIXED",
      discountValue: "0",
    };
  }


  function resetOrderForm() {
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
      discountType: "FIXED" as DiscountType,
      clientNotes: "",
      internalNotes: "",
    });

    setOrderItems([
      createEmptyOrderItem(),
    ]);

    setOrderDocument(null);
    setPaymentRegion("argentina");
    setOrderContactSearch("");
    setEditingOrderId(null);
  }


  function addOrderItem() {
    setOrderItems((current) => [
      ...current,
      createEmptyOrderItem(),
    ]);
  }


  function updateOrderItem(
    key: string,
    field: keyof Omit<OrderFormItem, "key">,
    value: string
  ) {
    setOrderItems((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }


  function removeOrderItem(key: string) {
    setOrderItems((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter(
        (item) =>
          item.key !== key
      );
    });
  }


  function validateOrderItems() {
    if (orderItems.length === 0) {
      throw new Error(
        "La orden debe tener al menos un servicio."
      );
    }

    orderItems.forEach(
      (item, index) => {
        const amounts =
          getItemAmounts(item);

        if (!item.description.trim()) {
          throw new Error(
            `Completa la descripción del servicio ${index + 1}.`
          );
        }

        if (
          item.billingMode === "HOURS" &&
          amounts.quantity <= 0
        ) {
          throw new Error(
            `Completa las horas del servicio ${index + 1}.`
          );
        }

        if (amounts.unitPrice <= 0) {
          throw new Error(
            `Completa el valor del servicio ${index + 1}.`
          );
        }

        if (amounts.total <= 0) {
          throw new Error(
            `El total del servicio ${index + 1} debe ser mayor a cero.`
          );
        }
      }
    );
  }


  function buildOrderItemsPayload() {
    return orderItems.map(
      (item) => {
        const amounts =
          getItemAmounts(item);

        return {
          description:
            item.description.trim(),

          detail:
            item.detail.trim() ||
            undefined,

          billingMode:
            item.billingMode,

          quantity:
            amounts.quantity,

          unitPrice:
            amounts.unitPrice,

          discountType:
            item.discountType,

          discountValue:
            optionalNumber(
              item.discountValue
            ) || 0,

          discountAmount:
            amounts.discountAmount,

          total:
            amounts.total,
        };
      }
    );
  }


  function beginEditOrder(order: Order) {
    setEditingOrderId(order.id);

    const storedItems =
      order.items || [];

    if (storedItems.length > 0) {

      setOrderItems(
        storedItems.map(
          (item, index) => ({
            key:
              item.id ||
              `existing-${order.id}-${index}`,

            description:
              item.description || "",

            detail:
              item.detail || "",

            billingMode:
              item.billingMode === "SERVICE"
                ? "SERVICE"
                : "HOURS",

            quantity:
              String(
                item.quantity ?? 1
              ),

            unitPrice:
              String(
                item.unitPrice ?? ""
              ),

            discountType:
              item.discountType === "PERCENT"
                ? "PERCENT"
                : "FIXED",

            discountValue:
              String(
                item.discountValue ?? 0
              ),
          })
        )
      );

    } else {

      const legacyHours =
        Number(order.hours || 0);

      const legacyRate =
        Number(order.rate || 0);

      const isHours =
        legacyHours > 0 &&
        legacyRate > 0;

      setOrderItems([
        {
          key:
            `legacy-${order.id}`,

          description:
            order.description || "",

          detail:
            order.detail || "",

          billingMode:
            isHours
              ? "HOURS"
              : "SERVICE",

          quantity:
            String(
              isHours
                ? legacyHours
                : 1
            ),

          unitPrice:
            String(
              isHours
                ? legacyRate
                : order.subtotal ??
                  order.total ??
                  ""
            ),

          discountType:
            order.discountType === "PERCENT"
              ? "PERCENT"
              : "FIXED",

          discountValue:
            String(
              Number(
                order.discountValue || 0
              ) > 0
                ? order.discountValue
                : order.discount || 0
            ),
        },
      ]);
    }


    setOrderForm({
      contactId:
        order.contactId,

      dueDate:
        order.dueDate
          ? order.dueDate.slice(0, 10)
          : "",

      status:
        order.status,

      description:
        order.description || "",

      detail:
        order.detail || "",

      hours: "",
      rate: "",
      serviceTotal: "",

      discount: "0",
      discountType: "FIXED",

      clientNotes:
        order.clientNotes || "",

      internalNotes:
        order.internalNotes || "",
    });


    setPaymentRegion(
      guessPaymentRegion(
        order.contact?.country || ""
      )
    );

    setOrderDocument(null);

    if (order.contact) {
      setOrderContactSearch(
        `${order.contact.firstName} ${order.contact.lastName || ""} ${order.contact.email || ""}`.trim()
      );
    } else {
      setOrderContactSearch("");
    }

    setOrderView("create");

    setMessage(
      `Editando orden #${order.number}.`
    );

    setTimeout(() => {
      document
        .querySelector(".panel-order-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 0);
  }

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsLoading(true);

    try {

      if (!orderForm.contactId) {
        throw new Error(
          "Selecciona un contacto."
        );
      }

      validateOrderItems();

      if (estimatedTotal <= 0) {
        throw new Error(
          "La orden debe tener un total mayor a cero."
        );
      }

      const itemsPayload =
        buildOrderItemsPayload();

      const firstItem =
        itemsPayload[0];


      const response =
        await apiFetch(
          "/api/panel/orders",
          {
            method: "POST",

            body: JSON.stringify({
              contactId:
                orderForm.contactId,

              dueDate:
                orderForm.dueDate ||
                undefined,

              status:
                orderForm.status,

              currency:
                "ARS",

              // Compatibilidad con órdenes viejas
              description:
                firstItem.description,

              detail:
                firstItem.detail,

              hours:
                firstItem.billingMode === "HOURS"
                  ? firstItem.quantity
                  : undefined,

              rate:
                firstItem.billingMode === "HOURS"
                  ? firstItem.unitPrice
                  : undefined,

              quantity:
                firstItem.quantity,

              // El descuento ya vive en cada servicio.
              subtotal:
                estimatedSubtotal,

              discount:
                0,

              discountType:
                "FIXED",

              discountValue:
                0,

              total:
                estimatedTotal,

              clientNotes:
                orderForm.clientNotes.trim() ||
                undefined,

              items:
                itemsPayload,

              internalNotes: [
                orderForm.internalNotes.trim(),
                `Pago: ${selectedPaymentDetails.label}`,
                ...selectedPaymentDetails.lines,
              ]
                .filter(Boolean)
                .join("\n"),
            }),
          }
        );


      const createdOrder =
        (await response.json()) as {
          id?: string;
        };


      if (orderDocument) {
        if (!createdOrder.id) {
          throw new Error(
            "La orden fue creada, pero no se pudo identificar para adjuntar el PDF."
          );
        }

        await uploadOrderDocument(
          createdOrder.id,
          orderDocument
        );
      }


      resetOrderForm();

      await Promise.all([
        loadDashboard(),
        loadOrders(),
        loadPendingOrders(),
      ]);

      setOrderView("list");

      setMessage(
        orderDocument
          ? "Orden creada con PDF adjunto."
          : "Orden creada."
      );

    } catch (error) {

      setMessage(
        error instanceof Error
          ? error.message
          : "Error al crear orden."
      );

    } finally {

      setIsLoading(false);
    }
  }
  async function handleUpdateOrder(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsLoading(true);

    try {

      if (!editingOrderId) {
        throw new Error(
          "No se pudo identificar la orden."
        );
      }

      if (!orderForm.contactId) {
        throw new Error(
          "Selecciona un contacto."
        );
      }

      validateOrderItems();

      if (estimatedTotal <= 0) {
        throw new Error(
          "La orden debe tener un total mayor a cero."
        );
      }


      const currentOrder =
        orders.find(
          (order) =>
            order.id === editingOrderId
        );


      const itemsPayload =
        buildOrderItemsPayload();

      const firstItem =
        itemsPayload[0];


      await apiFetch(
        `/api/panel/orders/${editingOrderId}`,
        {
          method: "PATCH",

          body: JSON.stringify({
            contactId:
              orderForm.contactId,

            dueDate:
              orderForm.dueDate ||
              null,

            status:
              orderForm.status,

            currency:
              "ARS",

            description:
              firstItem.description,

            detail:
              firstItem.detail ||
              null,

            hours:
              firstItem.billingMode === "HOURS"
                ? firstItem.quantity
                : null,

            rate:
              firstItem.billingMode === "HOURS"
                ? firstItem.unitPrice
                : null,

            quantity:
              firstItem.quantity,

            subtotal:
              estimatedSubtotal,

            discount:
              0,

            discountType:
              "FIXED",

            discountValue:
              0,

            total:
              estimatedTotal,

            clientNotes:
              orderForm.clientNotes.trim() ||
              null,

            items:
              itemsPayload,

            internalNotes: [
              orderForm.internalNotes.trim(),
              `Pago: ${selectedPaymentDetails.label}`,
              ...selectedPaymentDetails.lines,
            ]
              .filter(Boolean)
              .join("\n"),
          }),
        }
      );


      if (orderDocument) {
        await uploadOrderDocument(
          editingOrderId,
          orderDocument
        );
      }


      await Promise.all([
        loadDashboard(),
        loadOrders(),
        loadPendingOrders(),
      ]);


      const orderNumber =
        currentOrder?.number;


      resetOrderForm();
      setOrderView("list");


      setMessage(
        orderNumber
          ? `Orden #${orderNumber} actualizada correctamente.`
          : "Orden actualizada correctamente."
      );

    } catch (error) {

      setMessage(
        error instanceof Error
          ? error.message
          : "Error al actualizar la orden."
      );

    } finally {

      setIsLoading(false);
    }
  }
  async function handleDeleteOrder(order: Order) {
    const confirmation = window.prompt(
      `Para eliminar definitivamente la orden #${order.number}, escribi ${order.number}.`
    );

    if (confirmation === null) {
      return;
    }

    if (confirmation.trim() !== String(order.number)) {
      setMessage(
        `No se elimino la orden #${order.number}: el numero ingresado no coincide.`
      );
      return;
    }

    setMessage("");
    setIsLoading(true);

    try {
      await apiFetch(
        `/api/panel/orders/${order.id}`,
        {
          method: "DELETE",
        }
      );

      if (editingOrderId === order.id) {
        resetOrderForm();
      }

      await Promise.all([
        loadDashboard(),
        loadOrders(),
        loadPendingOrders(),
      ]);

      setOrderView("list");

      setMessage(
        `Orden #${order.number} eliminada definitivamente.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la orden."
      );
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
    const customer =
      getOrderCustomerName(order);

    const customerLocation =
      getOrderCustomerLocation(order);

    const payment =
      getOrderPaymentDetails(order);


    const issueDate =
      order.issueDate
        ? new Date(
            order.issueDate
          ).toLocaleDateString("es-AR")
        : "";


    const dueDate =
      order.dueDate
        ? new Date(
            order.dueDate
          ).toLocaleDateString("es-AR")
        : "Sin vencimiento";


    const legacySubtotal =
      Number(
        order.subtotal ||
        order.total ||
        0
      );


    const legacyQuantity =
      Number(
        order.quantity ||
        order.hours ||
        1
      ) || 1;


    const legacyUnitPrice =
      Number(order.rate || 0) ||
      (
        legacyQuantity > 0
          ? legacySubtotal /
            legacyQuantity
          : legacySubtotal
      );


    const displayItems: OrderItemData[] =
      order.items &&
      order.items.length > 0
        ? order.items
        : [
            {
              description:
                order.description ||
                "Servicio",

              detail:
                order.detail || "",

              billingMode:
                Number(
                  order.hours || 0
                ) > 0
                  ? "HOURS"
                  : "SERVICE",

              quantity:
                legacyQuantity,

              unitPrice:
                legacyUnitPrice,

              discountType:
                order.discountType ||
                "FIXED",

              discountValue:
                order.discountValue ||
                0,

              discountAmount:
                order.discount ||
                0,

              total:
                Number(
                  order.total || 0
                ),
            },
          ];


    const itemGross = (
      item: OrderItemData
    ) => {
      const quantity =
        item.billingMode === "SERVICE"
          ? 1
          : Number(
              item.quantity || 0
            );

      return (
        quantity *
        Number(
          item.unitPrice || 0
        )
      );
    };


    const grossSubtotal =
      displayItems.reduce(
        (sum, item) =>
          sum + itemGross(item),
        0
      );


    const totalDiscount =
      displayItems.reduce(
        (sum, item) =>
          sum +
          Number(
            item.discountAmount || 0
          ),
        0
      );


    const total =
      Number(
        order.total || 0
      );


    const hasClientNotes =
      Boolean(
        order.clientNotes?.trim()
      );


    const rowHeight = 112;

    const servicesTop = 450;

    const servicesHeight =
      83 +
      displayItems.length *
        rowHeight;


    const afterServices =
      servicesTop +
      servicesHeight +
      30;


    const summaryHeight = 170;


    const observationsHeight =
      hasClientNotes
        ? 155
        : 0;


    const observationsTop =
      afterServices +
      summaryHeight +
      28;


    const paymentTop =
      observationsTop +
      observationsHeight +
      (
        hasClientNotes
          ? 28
          : 0
      );


    const paymentHeight = 125;


    const height =
      paymentTop +
      paymentHeight +
      85;


    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = 1080;
    canvas.height = height;


    const context =
      canvas.getContext("2d");


    if (!context) {
      throw new Error(
        "No se pudo generar la orden."
      );
    }


    const logo =
      await loadLogoImage();


    // Fondo
    context.fillStyle =
      "#f1f5f9";

    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    // Hoja
    context.fillStyle =
      "#ffffff";

    context.beginPath();

    context.roundRect(
      55,
      55,
      970,
      height - 110,
      34
    );

    context.fill();


    // Linea superior
    context.fillStyle =
      "#0f9f8f";

    context.beginPath();

    context.roundRect(
      55,
      55,
      970,
      14,
      8
    );

    context.fill();


    // Logo
    if (logo) {
      context.drawImage(
        logo,
        95,
        105,
        82,
        82
      );
    }


    context.fillStyle =
      "#0f766e";

    context.font =
      "bold 25px Arial";

    context.fillText(
      "FÉLIX CANCELADO",
      logo ? 205 : 95,
      135
    );


    context.fillStyle =
      "#0f172a";

    context.font =
      "bold 64px Arial";

    context.fillText(
      "Orden",
      logo ? 205 : 95,
      205
    );


    // Numero / estado
    context.fillStyle =
      "#f8fafc";

    context.beginPath();

    context.roundRect(
      810,
      95,
      165,
      125,
      24
    );

    context.fill();


    context.fillStyle =
      "#0f172a";

    context.font =
      "bold 38px Arial";

    context.textAlign =
      "center";

    context.fillText(
      `#${order.number}`,
      892,
      145
    );


    context.fillStyle =
      order.status === "PAID"
        ? "#047857"
        : "#991b1b";

    context.font =
      "21px Arial";

    context.fillText(
      formatOrderStatus(
        order.status
      ),
      892,
      190
    );


    context.textAlign =
      "left";


    // Separador
    context.strokeStyle =
      "#e2e8f0";

    context.lineWidth = 2;

    context.beginPath();

    context.moveTo(
      95,
      260
    );

    context.lineTo(
      985,
      260
    );

    context.stroke();


    // Cliente / fechas
    context.fillStyle =
      "#f8fafc";

    context.beginPath();

    context.roundRect(
      95,
      290,
      890,
      115,
      20
    );

    context.fill();


    context.fillStyle =
      "#64748b";

    context.font =
      "bold 18px Arial";

    context.fillText(
      "CLIENTE",
      125,
      325
    );


    context.fillStyle =
      "#0f172a";

    context.font =
      "bold 26px Arial";


    formatCanvasText(
      context,
      customer,
      125,
      360,
      360,
      30,
      1
    );


    context.font =
      "17px Arial";

    context.fillStyle =
      "#475569";


    const customerMeta = [
      order.contact?.email,
      customerLocation,
    ]
      .filter(Boolean)
      .join(" · ");


    formatCanvasText(
      context,
      customerMeta,
      125,
      390,
      390,
      22,
      1
    );


    context.fillStyle =
      "#64748b";

    context.font =
      "bold 18px Arial";

    context.fillText(
      "FECHAS",
      600,
      325
    );


    context.fillStyle =
      "#0f172a";

    context.font =
      "19px Arial";

    context.fillText(
      `Emisión: ${issueDate}`,
      600,
      360
    );

    context.fillText(
      `Vence: ${dueDate}`,
      600,
      390
    );


    // ============================================
    // SERVICIOS
    // ============================================

    context.fillStyle =
      "#0f766e";

    context.font =
      "bold 31px Arial";

    context.fillText(
      "Servicios",
      95,
      servicesTop
    );


    const tableTop =
      servicesTop + 35;


    context.fillStyle =
      "#e7f7f2";

    context.beginPath();

    context.roundRect(
      95,
      tableTop,
      890,
      48,
      12
    );

    context.fill();


    context.fillStyle =
      "#0f5e55";

    context.font =
      "bold 16px Arial";


    context.fillText(
      "Servicio / Descripción",
      115,
      tableTop + 31
    );


    context.textAlign =
      "right";


    context.fillText(
      "Horas/Cant.",
      555,
      tableTop + 31
    );


    context.fillText(
      "Valor unit.",
      700,
      tableTop + 31
    );


    context.fillText(
      "Descuento",
      835,
      tableTop + 31
    );


    context.fillText(
      "Total",
      965,
      tableTop + 31
    );


    context.textAlign =
      "left";


    let rowY =
      tableTop + 48;


    displayItems.forEach(
      (item) => {

        context.strokeStyle =
          "#e2e8f0";

        context.lineWidth = 1;

        context.beginPath();

        context.moveTo(
          110,
          rowY + rowHeight
        );

        context.lineTo(
          970,
          rowY + rowHeight
        );

        context.stroke();


        context.fillStyle =
          "#0f172a";

        context.font =
          "bold 20px Arial";


        formatCanvasText(
          context,
          item.description ||
            "Servicio",
          115,
          rowY + 34,
          400,
          24,
          1
        );


        if (item.detail) {

          context.fillStyle =
            "#64748b";

          context.font =
            "15px Arial";


          formatCanvasText(
            context,
            item.detail,
            115,
            rowY + 65,
            400,
            20,
            2
          );
        }


        const itemQuantity =
          item.billingMode ===
          "SERVICE"
            ? 1
            : Number(
                item.quantity || 0
              );


        const itemDiscount =
          Number(
            item.discountAmount || 0
          );


        context.fillStyle =
          "#0f172a";

        context.font =
          "18px Arial";

        context.textAlign =
          "right";


        context.fillText(
          String(itemQuantity),
          555,
          rowY + 46
        );


        context.fillText(
          formatMoney(
            Number(
              item.unitPrice || 0
            )
          ),
          700,
          rowY + 46
        );


        if (itemDiscount > 0) {

          context.fillStyle =
            "#b42318";

          context.font =
            "bold 17px Arial";


          context.fillText(
            `- ${formatMoney(
              itemDiscount
            )}`,
            835,
            rowY + 42
          );


          if (
            item.discountType ===
            "PERCENT"
          ) {

            context.fillStyle =
              "#64748b";

            context.font =
              "14px Arial";


            context.fillText(
              `${Number(
                item.discountValue ||
                  0
              )}%`,
              835,
              rowY + 68
            );
          }

        } else {

          context.fillStyle =
            "#94a3b8";

          context.font =
            "17px Arial";

          context.fillText(
            "—",
            835,
            rowY + 46
          );
        }


        context.fillStyle =
          "#0f172a";

        context.font =
          "bold 19px Arial";


        context.fillText(
          formatMoney(
            Number(
              item.total || 0
            )
          ),
          965,
          rowY + 46
        );


        context.textAlign =
          "left";


        rowY +=
          rowHeight;
      }
    );


    // ============================================
    // RESUMEN
    // ============================================

    const summaryTop =
      afterServices;


    context.fillStyle =
      "#f8fafc";

    context.beginPath();

    context.roundRect(
      565,
      summaryTop,
      420,
      summaryHeight,
      20
    );

    context.fill();


    context.fillStyle =
      "#334155";

    context.font =
      "17px Arial";


    context.fillText(
      "Subtotal de servicios",
      595,
      summaryTop + 40
    );


    context.textAlign =
      "right";


    context.fillText(
      formatMoney(
        grossSubtotal
      ),
      955,
      summaryTop + 40
    );


    context.textAlign =
      "left";


    context.fillText(
      "Descuentos",
      595,
      summaryTop + 74
    );


    context.fillStyle =
      "#b42318";

    context.textAlign =
      "right";


    context.fillText(
      `- ${formatMoney(
        totalDiscount
      )}`,
      955,
      summaryTop + 74
    );


    // Total compacto
    context.fillStyle =
      "#d1fae5";

    context.beginPath();

    context.roundRect(
      585,
      summaryTop + 96,
      380,
      55,
      14
    );

    context.fill();


    context.fillStyle =
      "#0f766e";

    context.font =
      "bold 18px Arial";

    context.textAlign =
      "left";


    context.fillText(
      "Cantidad a transferir",
      605,
      summaryTop + 130
    );


    context.fillStyle =
      "#0f172a";

    context.font =
      "bold 23px Arial";

    context.textAlign =
      "right";


    context.fillText(
      formatMoney(total),
      945,
      summaryTop + 130
    );


    context.textAlign =
      "left";


    // ============================================
    // OBSERVACIONES - ANTES DEL PAGO
    // ============================================

    if (hasClientNotes) {

      context.fillStyle =
        "#fff7ed";

      context.beginPath();

      context.roundRect(
        95,
        observationsTop,
        890,
        observationsHeight,
        18
      );

      context.fill();


      context.fillStyle =
        "#9a3412";

      context.font =
        "bold 19px Arial";

      context.fillText(
        "OBSERVACIONES",
        120,
        observationsTop + 36
      );


      context.fillStyle =
        "#334155";

      context.font =
        "16px Arial";


      formatCanvasText(
        context,
        order.clientNotes || "",
        120,
        observationsTop + 72,
        820,
        23,
        4
      );
    }


    // ============================================
    // DETALLES DE PAGO - ULTIMO Y COMPACTO
    // ============================================

    context.strokeStyle =
      "#e2e8f0";

    context.lineWidth = 1;

    context.beginPath();

    context.moveTo(
      95,
      paymentTop
    );

    context.lineTo(
      985,
      paymentTop
    );

    context.stroke();


    context.fillStyle =
      "#0f766e";

    context.font =
      "bold 18px Arial";

    context.fillText(
      "Detalles de pago",
      105,
      paymentTop + 38
    );


    context.fillStyle =
      "#334155";

    context.font =
      "bold 15px Arial";

    context.fillText(
      payment.label,
      105,
      paymentTop + 70
    );


    const paymentText =
      payment.lines.join(" · ");


    context.fillStyle =
      "#475569";

    context.font =
      "14px Arial";


    formatCanvasText(
      context,
      paymentText,
      280,
      paymentTop + 68,
      675,
      20,
      2
    );


    return canvas;
  }


  async function buildOrderPdfBlob(
    order: Order
  ) {
    const canvas =
      await buildOrderCanvas(order);

    const imageData =
      canvas.toDataURL(
        "image/png"
      );


    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [
        canvas.width,
        canvas.height,
      ],
    });


    pdf.addImage(
      imageData,
      "PNG",
      0,
      0,
      canvas.width,
      canvas.height
    );


    return pdf.output("blob");
  }


  async function buildOrderPdfFile(
    order: Order
  ) {
    const blob =
      await buildOrderPdfBlob(
        order
      );


    return new File(
      [blob],
      `orden-${order.number}.pdf`,
      {
        type:
          "application/pdf",
      }
    );
  }


  async function downloadOrderPdf(
    order: Order
  ) {
    try {

      const blob =
        await buildOrderPdfBlob(
          order
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          "a"
        );


      link.href = url;

      link.download =
        `orden-${order.number}.pdf`;


      document.body.appendChild(
        link
      );

      link.click();

      link.remove();


      URL.revokeObjectURL(
        url
      );

    } catch (error) {

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el PDF."
      );
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

  async function replaceOrderDocument(order: Order, file: File) {
    setMessage("");
    setIsLoading(true);

    try {
      await uploadOrderDocument(order.id, file);

      await loadOrders();

      if (section === "pending") {
        await loadPendingOrders();
      }

      setMessage(
        `PDF ${order.document?.fileName ? "reemplazado" : "adjuntado"} en la orden #${order.number}.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo adjuntar el PDF."
      );
    } finally {
      setIsLoading(false);
    }
  }
  async function markOrderAsPaid(order: Order) {
    const confirmed = window.confirm(
      `¿Marcar la orden #${order.number} como pagada y enviar confirmación al cliente?`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setIsLoading(true);

    try {
      await apiFetch(`/api/panel/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "PAID",
        }),
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo marcar la orden como pagada."
      );
      setIsLoading(false);
      return;
    }

    let paymentEmailTo: string | null = null;
    let paymentEmailError: string | null = null;

    if (!order.contact?.email) {
      paymentEmailError = "El contacto no tiene email.";
    } else {
      try {
        const response = await apiFetch(
          `/api/panel/orders/${order.id}/payment-received`,
          {
            method: "POST",
          }
        );

        const data = (await response.json()) as {
          ok: boolean;
          emailTo: string;
        };

        paymentEmailTo = data.emailTo;
      } catch (error) {
        paymentEmailError =
          error instanceof Error
            ? error.message
            : "No se pudo enviar la confirmación de pago.";
      }
    }

    try {
      await Promise.all([
        loadPendingOrders(),
        loadOrders(),
        loadDashboard(),
      ]);
    } catch {
      if (paymentEmailError) {
        setMessage(
          `Orden #${order.number} marcada como pagada. ` +
            `No se pudo enviar la confirmación: ${paymentEmailError} ` +
            `Además, no se pudo actualizar el panel automáticamente.`
        );
      } else {
        setMessage(
          `Orden #${order.number} marcada como pagada y confirmación enviada a ` +
            `${paymentEmailTo}. No se pudo actualizar el panel automáticamente.`
        );
      }

      setIsLoading(false);
      return;
    }

    if (paymentEmailError) {
      setMessage(
        `Orden #${order.number} marcada como pagada. ` +
          `No se pudo enviar la confirmación: ${paymentEmailError}`
      );
    } else {
      setMessage(
        `Orden #${order.number} marcada como pagada. ` +
          `Confirmación de pago enviada a ${paymentEmailTo}.`
      );
    }

    setIsLoading(false);
  }
  async function prepareEmailOrder(
    order: Order,
    mode: "send" | "resend"
  ) {
    if (!order.contact?.email) {
      setMessage(
        `La orden #${order.number} no tiene un email de contacto.`
      );

      return;
    }


    setMessage("");
    setIsLoading(true);


    try {

      // 1. Generar exactamente el mismo PDF
      // que se descarga desde la app.
      const pdfFile =
        await buildOrderPdfFile(
          order
        );


      // 2. Guardarlo/reemplazarlo en la orden.
      await uploadOrderDocument(
        order.id,
        pdfFile
      );


      // 3. Enviar email. El backend toma
      // el PDF que acabamos de guardar.
      const response =
        await apiFetch(
          `/api/panel/orders/${order.id}/send`,
          {
            method: "POST",

            body: JSON.stringify({
              type:
                mode === "send"
                  ? "INITIAL"
                  : "RESEND",
            }),
          }
        );


      const data =
        (await response.json()) as {
          ok: boolean;
          emailTo: string;
          includedLegalDocument: boolean;
        };


      if (
        !data.includedLegalDocument
      ) {
        throw new Error(
          "El email se proceso, pero el PDF no quedo incluido."
        );
      }


      const action =
        mode === "send"
          ? "enviada"
          : "reenviada";


      setMessage(
        `Orden #${order.number} ${action} a ${data.emailTo} con PDF actualizado adjunto.`
      );


      await Promise.all([
        loadOrders(),
        loadPendingOrders(),
      ]);

    } catch (error) {

      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo generar o enviar la orden por email."
      );

    } finally {

      setIsLoading(false);
    }
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

    if (section === "dashboard") {
      if (!dashboard) {
        loadDashboard().catch(() => setMessage("No se pudo cargar el panel."));
      }

      loadOrders().catch(() => setMessage("No se pudieron cargar las ordenes."));
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
                <div className="panel-subtabs panel-dashboard-subtabs">
                  <button
                    type="button"
                    className={
                      dashboardView === "aggregate"
                        ? "panel-subtab-active"
                        : ""
                    }
                    onClick={() => setDashboardView("aggregate")}
                  >
                    Total acumulado
                  </button>

                  <button
                    type="button"
                    className={
                      dashboardView === "monthly"
                        ? "panel-subtab-active"
                        : ""
                    }
                    onClick={() => setDashboardView("monthly")}
                  >
                    Mes a mes
                  </button>
                </div>

                {dashboardView === "monthly" ? (
                  <div className="panel-month-selector">
                    <label>
                      Consultar mes
                      <input
                        type="month"
                        value={dashboardMonth}
                        onChange={(event) =>
                          setDashboardMonth(event.target.value)
                        }
                      />
                    </label>

                    <strong>{dashboardMonthLabel}</strong>
                  </div>
                ) : null}

                {!activeDashboard ? (
                  <div className="panel-empty">
                    <p>Ingreso correcto. Actualiza el panel para ver los datos.</p>
                  </div>
                ) : (
                  <div className="panel-metrics">
                    <article>
                      <span>Órdenes</span>
                      <strong>{activeDashboard.ordersCount}</strong>
                    </article>

                    <article>
                      <span>Total vendido</span>
                      <strong>{formatMoney(activeDashboard.totalSold)}</strong>
                    </article>

                    <article>
                      <span>Total cobrado</span>
                      <strong>{formatMoney(activeDashboard.totalPaid)}</strong>
                    </article>

                    <article>
                      <span>Pendiente</span>
                      <strong>{formatMoney(activeDashboard.pending)}</strong>
                    </article>

                    <article>
                      <span>Sin pagar</span>
                      <strong>{activeDashboard.unpaidCount}</strong>
                    </article>
                  </div>
                )}
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

                {contactView === "create" || contactView === "edit" ? (
                  <form
                    className="panel-contact-form"
                    onSubmit={
                      contactView === "edit"
                        ? handleUpdateContact
                        : handleCreateContact
                    }
                  >
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
                      {isLoading
                        ? "Guardando..."
                        : contactView === "edit"
                          ? "Guardar cambios"
                          : "Crear contacto"}
                    </button>

                    {contactView === "edit" ? (
                      <button
                        type="button"
                        className="panel-contact-cancel"
                        disabled={isLoading}
                        onClick={cancelEditContact}
                      >
                        Cancelar
                      </button>
                    ) : null}
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

                          <button
                            type="button"
                            className="panel-contact-edit-button"
                            onClick={() => beginEditContact(contact)}
                          >
                            ✎ Editar
                          </button>
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
                    onClick={() => {
                      resetOrderForm();
                      setOrderView("create");
                    }}
                  >
                    {editingOrderId
                        ? `Editar orden #${orders.find(
                            (order) => order.id === editingOrderId
                          )?.number || ""}`
                        : "Crear orden"}
                  </button>

                  <button
                    type="button"
                    className={orderView === "list" ? "panel-subtab-active" : ""}
                    onClick={() => {
                      setEditingOrderId(null);
                      setOrderView("list");
                    }}
                  >
                    Listar órdenes
                  </button>
                </div>

                {orderView === "create" ? (
                  <form
                    className="panel-order-form"
                    onSubmit={
                      editingOrderId
                        ? handleUpdateOrder
                        : handleCreateOrder
                    }
                  >
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
                        {editingOrderId ? (
                          <>
                            <option value="PAID">
                              Pagada
                            </option>
                            <option value="OVERDUE">
                              Vencida
                            </option>
                            <option value="CANCELLED">
                              Cancelada
                            </option>
                          </>
                        ) : null}
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

                    <section className="panel-items-editor">

                      <div className="panel-items-editor-heading">
                        <div>
                          <strong>
                            Servicios
                          </strong>

                          <span>
                            Cada servicio tiene su propio tipo de cobro y descuento.
                          </span>
                        </div>

                        <button
                          type="button"
                          className="panel-add-service-button"
                          onClick={addOrderItem}
                        >
                          + Agregar servicio
                        </button>
                      </div>


                      <div className="panel-items-list">

                        {orderItems.map(
                          (item, index) => {

                            const amounts =
                              getItemAmounts(item);

                            return (
                              <article
                                key={item.key}
                                className="panel-service-card"
                              >

                                <div className="panel-service-card-header">
                                  <strong>
                                    Servicio {index + 1}
                                  </strong>

                                  {orderItems.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeOrderItem(
                                          item.key
                                        )
                                      }
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>


                                <label className="panel-wide-field">
                                  Tipo de cobro

                                  <select
                                    value={item.billingMode}
                                    onChange={(event) =>
                                      updateOrderItem(
                                        item.key,
                                        "billingMode",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="HOURS">
                                      Por horas
                                    </option>

                                    <option value="SERVICE">
                                      Servicio cerrado
                                    </option>
                                  </select>
                                </label>


                                <label className="panel-wide-field">
                                  Descripción *

                                  <input
                                    value={item.description}
                                    placeholder="Ej.: Inglés noviembre 2026"
                                    onChange={(event) =>
                                      updateOrderItem(
                                        item.key,
                                        "description",
                                        event.target.value
                                      )
                                    }
                                  />
                                </label>


                                <label className="panel-wide-field">
                                  Detalle

                                  <textarea
                                    value={item.detail}
                                    placeholder="Ej.: Clases 4, 11, 18 y 25"
                                    onChange={(event) =>
                                      updateOrderItem(
                                        item.key,
                                        "detail",
                                        event.target.value
                                      )
                                    }
                                  />
                                </label>


                                {item.billingMode === "HOURS" ? (
                                  <>
                                    <label>
                                      Horas

                                      <input
                                        inputMode="decimal"
                                        value={item.quantity}
                                        placeholder="4"
                                        onChange={(event) =>
                                          updateOrderItem(
                                            item.key,
                                            "quantity",
                                            event.target.value
                                          )
                                        }
                                      />
                                    </label>


                                    <label>
                                      Valor hora

                                      <input
                                        inputMode="decimal"
                                        value={item.unitPrice}
                                        placeholder="25000"
                                        onChange={(event) =>
                                          updateOrderItem(
                                            item.key,
                                            "unitPrice",
                                            event.target.value
                                          )
                                        }
                                      />
                                    </label>
                                  </>
                                ) : (
                                  <label className="panel-wide-field">
                                    Valor del servicio

                                    <input
                                      inputMode="decimal"
                                      value={item.unitPrice}
                                      placeholder="180000"
                                      onChange={(event) =>
                                        updateOrderItem(
                                          item.key,
                                          "unitPrice",
                                          event.target.value
                                        )
                                      }
                                    />
                                  </label>
                                )}


                                <div className="panel-service-discount-fields">

                                  <label>
                                    Tipo de descuento

                                    <select
                                      value={item.discountType}
                                      onChange={(event) =>
                                        updateOrderItem(
                                          item.key,
                                          "discountType",
                                          event.target.value
                                        )
                                      }
                                    >
                                      <option value="FIXED">
                                        $ Monto fijo
                                      </option>

                                      <option value="PERCENT">
                                        % Porcentaje
                                      </option>
                                    </select>
                                  </label>


                                  <label>
                                    {item.discountType === "PERCENT"
                                      ? "Porcentaje"
                                      : "Monto del descuento"}

                                    <input
                                      inputMode="decimal"
                                      value={item.discountValue}
                                      placeholder={
                                        item.discountType === "PERCENT"
                                          ? "10"
                                          : "20000"
                                      }
                                      onChange={(event) =>
                                        updateOrderItem(
                                          item.key,
                                          "discountValue",
                                          event.target.value
                                        )
                                      }
                                    />
                                  </label>

                                </div>


                                <div className="panel-service-calculation">

                                  <div>
                                    <span>
                                      Importe
                                    </span>

                                    <strong>
                                      {formatMoney(
                                        amounts.gross
                                      )}
                                    </strong>
                                  </div>


                                  <div className="panel-service-discount-total">
                                    <span>
                                      Descuento
                                    </span>

                                    <strong>
                                      - {formatMoney(
                                        amounts.discountAmount
                                      )}
                                    </strong>
                                  </div>


                                  <div className="panel-service-net-total">
                                    <span>
                                      Total servicio
                                    </span>

                                    <strong>
                                      {formatMoney(
                                        amounts.total
                                      )}
                                    </strong>
                                  </div>

                                </div>

                              </article>
                            );
                          }
                        )}

                      </div>

                    </section>
                    <label className="panel-wide-field">
                      Observaciones para el cliente
                      <textarea
                        value={orderForm.clientNotes}
                        placeholder="Ej.: A partir de septiembre, el valor de la hora se incrementa en $2.000."
                        onChange={(event) =>
                          setOrderForm((current) => ({
                            ...current,
                            clientNotes: event.target.value,
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

                      {editingOrderId
                        ? "Reemplazar documento legal PDF"
                        : "Adjuntar documento legal PDF"}
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

                      <span>
                        {orderForm.discountType === "PERCENT"
                          ? `Descuento ${orderForm.discount || 0}%`
                          : "Descuento"}
                      </span>
                      <strong>- {formatMoney(estimatedDiscount)}</strong>

                      <span>Total estimado</span>
                      <strong>{formatMoney(estimatedTotal)}</strong>
                    </div>

                    <button type="submit" disabled={isLoading}>
                      {isLoading
                        ? "Guardando..."
                        : editingOrderId
                          ? "Guardar cambios"
                          : "Guardar orden"}
                    </button>

                    {editingOrderId ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          resetOrderForm();
                          setOrderView("list");
                        }}
                      >
                        Cancelar edici?n
                      </button>
                    ) : null}
                  </form>
                ) : null}

                {orderView === "list" ? (
                  <div className="panel-order-table-wrap">
                    {orders.length === 0 ? (
                      <div className="panel-empty">
                        <p>Aún no hay órdenes creadas.</p>
                      </div>
                    ) : (
                      <table className="panel-order-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Cliente</th>
                            <th>Servicio</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Emisión</th>
                            <th>Vence</th>
                            <th>PDF</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>

                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.id}>
                              <td className="panel-order-number">
                                #{order.number}
                              </td>

                              <td className="panel-order-customer-cell">
                                <strong>
                                  {order.contact
                                    ? `${order.contact.firstName} ${order.contact.lastName || ""}`.trim()
                                    : "Sin contacto"}
                                </strong>

                                <small>
                                  {order.contact?.email || "Sin email"}
                                </small>
                              </td>

                              <td
                                className="panel-order-service-cell"
                                title={order.description}
                              >
                                {order.description}
                              </td>

                              <td className="panel-order-money-cell">
                                {formatMoney(Number(order.total))}
                              </td>

                              <td>
                                <span
                                  className={`panel-order-status panel-order-status-${order.status.toLowerCase()}`}
                                >
                                  {formatOrderStatus(order.status)}
                                </span>
                              </td>

                              <td>
                                {order.issueDate
                                  ? new Date(order.issueDate).toLocaleDateString("es-AR")
                                  : "—"}
                              </td>

                              <td>
                                {order.dueDate
                                  ? new Date(order.dueDate).toLocaleDateString("es-AR")
                                  : "—"}
                              </td>

                              <td className="panel-order-pdf-cell">
                                {order.document?.fileName ? "Sí" : "—"}
                              </td>

                              <td>
                                <div className="panel-order-table-actions">
                                  <button
                                    type="button"
                                    className="panel-table-action"
                                    title="Descargar PDF"
                                    onClick={() => downloadOrderPdf(order)}
                                  >
                                    PDF
                                  </button>

                                  <button
                                    type="button"
                                    className="panel-table-action"
                                    title="Descargar imagen"
                                    onClick={() => downloadOrderImage(order)}
                                  >
                                    IMG
                                  </button>

                                  <label
                                    className="panel-table-action"
                                    title={
                                      order.document?.fileName
                                        ? "Reemplazar PDF"
                                        : "Adjuntar PDF"
                                    }
                                  >
                                    {order.document?.fileName
                                      ? "Cambiar"
                                      : "Adjuntar"}

                                    <input
                                      type="file"
                                      accept="application/pdf"
                                      style={{ display: "none" }}
                                      disabled={isLoading}
                                      onChange={async (event) => {
                                        const file = event.target.files?.[0];

                                        if (!file) {
                                          return;
                                        }

                                        await replaceOrderDocument(order, file);
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    className="panel-table-action"
                                    title="Enviar por email"
                                    disabled={isLoading}
                                    onClick={() =>
                                      prepareEmailOrder(order, "send")
                                    }
                                  >
                                    Email
                                  </button>

                                  <button
                                    type="button"
                                    className="panel-table-action"
                                    title="Editar orden"
                                    disabled={isLoading}
                                    onClick={() =>
                                      beginEditOrder(order)
                                    }
                                  >
                                    Editar
                                  </button>

                                  <button
                                    type="button"
                                    className="panel-table-action panel-table-action-danger"
                                    title="Eliminar orden"
                                    disabled={isLoading}
                                    onClick={() =>
                                      handleDeleteOrder(order)
                                    }
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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

                          <div className="panel-order-actions-row">
                            <button
                              type="button"
                              className="panel-small-action"
                              disabled={isLoading}
                              onClick={() => prepareEmailOrder(order, "resend")}
                            >
                              Reenviar orden
                            </button>

                            <button
                              type="button"
                              className="panel-small-action"
                              disabled={isLoading}
                              onClick={() => markOrderAsPaid(order)}
                            >
                              Marcar como pagada
                            </button>
                          </div>
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
