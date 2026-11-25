"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  ShoppingBag,
  ShieldCheck,
  LogOut,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Printer,
  Search,
  X,
  Vault,
  Sparkles,
  ChefHat,
  MessageSquarePlus,
  User,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { TicketPrint, formatOrderNumber } from "@/components/TicketPrint";

interface Product {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  stockActual: number;
  stockMinimo: number;
  esMenuDia?: boolean;
  activo: boolean;
  category?: {
    nombre: string;
  };
}

interface CartItem {
  id: string;
  nombre: string;
  price: number;
  quantity: number;
  nota?: string;
}

const ORDER_CHANNELS = [
  { value: "MOSTRADOR", label: "Mostrador" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "TELEFONO", label: "Teléfono" },
  { value: "PEDIDOSYA", label: "PedidosYa" },
  { value: "RAPPI", label: "Rappi" },
] as const;

export default function POSPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("EFECTIVO");
  const [montoPaga, setMontoPaga] = useState<string>("");

  // Datos Take Away del pedido
  const [canal, setCanal] = useState<string>("MOSTRADOR");
  const [clienteNombre, setClienteNombre] = useState<string>("");
  const [clienteTelefono, setClienteTelefono] = useState<string>("");
  const [notasPedido, setNotasPedido] = useState<string>("");
  const [entregaInmediata, setEntregaInmediata] = useState<boolean>(false);
  const [imprimirComanda, setImprimirComanda] = useState<boolean>(true);
  const [activeOrdersCount, setActiveOrdersCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [lastSaleData, setLastSaleData] = useState<{
    ventaId: string;
    numeroPedido?: number;
    fecha: string;
    items: { nombre: string; cantidad: number; precio: number; nota?: string | null }[];
    total: number;
    medioPago: string;
    montoPaga?: number | null;
    vuelto?: number | null;
    canal?: string;
    clienteNombre?: string | null;
    clienteTelefono?: string | null;
    notas?: string | null;
    imprimirComanda?: boolean;
  } | null>(null);

  const userRole = session?.user?.role || session?.user?.rol;
  const isAdminOrSuper = userRole === "ADMIN" || userRole === "SUPERADMIN";

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/productos");
      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "No se pudo cargar el catálogo de productos.",
        });
        return;
      }

      const activeProducts: Product[] = Array.isArray(data.productos)
        ? data.productos.filter((p: Product) => p.activo)
        : [];
      setProducts(activeProducts);

      const cats = Array.from(
        new Set(
          activeProducts
            .map((p) => p.category?.nombre)
            .filter((name): name is string => Boolean(name))
        )
      );
      setCategories(["Todos", ...cats]);
    } catch (err) {
      console.error("Error al cargar catálogo:", err);
      setMessage({
        type: "error",
        text: "Error de conexión al cargar los productos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrdersCount = async () => {
    try {
      const res = await fetch("/api/pedidos?summary=1");
      if (res.ok) {
        const data = await res.json();
        setActiveOrdersCount(Number(data.activosCount || 0));
      }
    } catch {
      // Silencioso en polling secundario
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchActiveOrdersCount();
    const interval = setInterval(fetchActiveOrdersCount, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (
        e.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        setSearchTerm("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addToCart = (product: Product) => {
    if (product.stockActual <= 0) return;
    setMessage(null);

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockActual) return prevCart;
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          id: product.id,
          nombre: product.nombre,
          price: Number(product.precio),
          quantity: 1,
          nota: "",
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const product = products.find((p) => p.id === id);
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (product && newQty > product.stockActual) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateItemNote = (id: string, nota: string) => {
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === id ? { ...item, nota } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setMontoPaga("");
    setEditingNoteId(null);
    setClienteNombre("");
    setClienteTelefono("");
    setNotasPedido("");
    setEntregaInmediata(false);
  };

  const totalAmount = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const parsedMontoPaga =
    paymentMethod === "EFECTIVO" && montoPaga.trim() !== ""
      ? Number(montoPaga)
      : null;

  const vueltoCalculado =
    parsedMontoPaga !== null && Number.isFinite(parsedMontoPaga)
      ? parsedMontoPaga - totalAmount
      : null;

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;

    if (
      paymentMethod === "EFECTIVO" &&
      parsedMontoPaga !== null &&
      parsedMontoPaga < totalAmount
    ) {
      setMessage({
        type: "error",
        text: "El monto abonado en efectivo es menor al total a cobrar.",
      });
      return;
    }

    try {
      setProcessing(true);
      setMessage(null);

      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            nota: item.nota?.trim() || undefined,
          })),
          metodoPago: paymentMethod,
          montoPaga: parsedMontoPaga,
          canal,
          clienteNombre: clienteNombre.trim() || undefined,
          clienteTelefono: clienteTelefono.trim() || undefined,
          notas: notasPedido.trim() || undefined,
          entregaInmediata,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const ticketItems = cart.map((item) => ({
          nombre: item.nombre,
          cantidad: item.quantity,
          precio: item.price,
          nota: item.nota?.trim() || null,
        }));

        const serverTotal = Number(data.venta?.montoTotal ?? totalAmount);
        const serverVuelto =
          data.venta?.vuelto !== null && data.venta?.vuelto !== undefined
            ? Number(data.venta.vuelto)
            : vueltoCalculado;
        const numeroPedido = Number(
          data.numeroPedido ?? data.venta?.numeroPedido ?? 0
        );
        const orderLabel = formatOrderNumber(
          numeroPedido,
          data.ventaId || data.venta?.id
        );

        setLastSaleData({
          ventaId: data.ventaId || data.venta?.id || String(Date.now()).slice(-6),
          numeroPedido,
          fecha: new Date().toLocaleString("es-AR"),
          items: ticketItems,
          total: serverTotal,
          medioPago: paymentMethod,
          montoPaga: parsedMontoPaga,
          vuelto: serverVuelto,
          canal,
          clienteNombre: clienteNombre.trim() || null,
          clienteTelefono: clienteTelefono.trim() || null,
          notas: notasPedido.trim() || null,
          imprimirComanda: entregaInmediata ? false : imprimirComanda,
        });

        setMessage({
          type: "success",
          text: entregaInmediata
            ? `¡Pedido ${orderLabel} cobrado y entregado!`
            : `¡Pedido ${orderLabel} enviado a cocina!`,
        });

        clearCart();
        setCanal("MOSTRADOR");
        setSearchTerm("");
        await Promise.all([fetchProducts(), fetchActiveOrdersCount()]);

        setTimeout(() => {
          window.print();
        }, 200);
      } else {
        setMessage({
          type: "error",
          text: data.error || "No se pudo procesar la venta.",
        });
      }
    } catch (err) {
      console.error("Error al procesar cobro:", err);
      setMessage({
        type: "error",
        text: "Error de comunicación con el servidor.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "Todos" || p.category?.nombre === selectedCategory;
    const matchesSearch = p.nombre
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra Superior de Navegación */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 leading-none">
              El Reencuentro Food
            </h1>
            <span className="text-[11px] text-slate-400">
              Punto de Venta Take Away
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block mr-1">
            <p className="text-xs font-semibold text-slate-200">
              {session?.user?.name || "Operador"}
            </p>
            <span
              className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                userRole === "SUPERADMIN"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : userRole === "ADMIN"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              }`}
            >
              {userRole || "VENTAS"}
            </span>
          </div>

          <Link
            href="/pedidos"
            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-slate-700 flex items-center gap-2"
          >
            <ChefHat className="w-4 h-4" />
            <span className="hidden md:inline">Pedidos / Cocina</span>
            {activeOrdersCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-500 text-slate-950">
                {activeOrdersCount}
              </span>
            )}
          </Link>

          <Link
            href="/caja"
            className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-slate-700 flex items-center gap-2"
          >
            <Vault className="w-4 h-4" />
            <span className="hidden md:inline">Caja</span>
          </Link>

          {isAdminOrSuper && (
            <Link
              href="/admin/productos"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-md border border-indigo-400/30 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-200" />
              <span className="hidden md:inline">Panel Admin</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 rounded-xl text-slate-400 transition"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Catálogo e Ítems */}
        <main className="lg:col-span-8 p-6 flex flex-col space-y-4 overflow-y-auto">
          {/* BARRA DE BÚSQUEDA RÁPIDA (F2) */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar producto... (Presioná F2 para enfocar)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Selector de Categorías */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grilla de Productos */}
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span>Cargando productos...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs">
              <Search className="w-8 h-8 mb-2 stroke-1" />
              <span>No se encontraron productos coincidentes</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const inCart = cart.find((item) => item.id === p.id);
                const stockDisponible = p.stockActual - (inCart?.quantity || 0);

                return (
                  <div
                    key={p.id}
                    onClick={() => stockDisponible > 0 && addToCart(p)}
                    className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition select-none ${
                      stockDisponible > 0
                        ? "border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/60 cursor-pointer"
                        : "border-slate-800/40 opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          {p.category?.nombre || "General"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            stockDisponible > (p.stockMinimo ?? 5)
                              ? "bg-emerald-500/10 text-emerald-400"
                              : stockDisponible > 0
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          Stock: {stockDisponible}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="font-semibold text-slate-100 text-sm">
                          {p.nombre}
                        </h3>
                        {p.esMenuDia && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[9px] font-bold uppercase">
                            <Sparkles className="w-2.5 h-2.5" />
                            Día
                          </span>
                        )}
                      </div>
                      {p.descripcion && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {p.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60">
                      <span className="text-base font-bold text-amber-400">
                        ${Number(p.precio).toLocaleString("es-AR")}
                      </span>
                      <button
                        type="button"
                        disabled={stockDisponible <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (stockDisponible > 0) addToCart(p);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-slate-300 transition disabled:opacity-40"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Panel del Pedido Actual (Carrito + Datos Take Away) */}
        <aside className="lg:col-span-4 bg-slate-900 border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                Pedido Actual
              </h2>
              <div className="flex items-center gap-3">
                {lastSaleData && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="text-xs text-slate-300 hover:text-amber-400 flex items-center gap-1 font-medium transition"
                    title="Reimprimir último ticket"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Reimprimir
                  </button>
                )}
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Vaciar
                  </button>
                )}
              </div>
            </div>

            {/* Mensajes de Alerta */}
            {message && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  message.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Ítems del Pedido */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px]">
              {cart.length === 0 ? (
                <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-slate-500 text-xs">
                  <ShoppingBag className="w-8 h-8 mb-2 stroke-1" />
                  <span>El carrito está vacío</span>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">
                          {item.nombre}
                        </p>
                        <p className="text-slate-400">
                          ${item.price.toLocaleString("es-AR")} c/u
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingNoteId(
                              editingNoteId === item.id ? null : item.id
                            )
                          }
                          className={`p-1.5 rounded-lg border transition ${
                            item.nota
                              ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
                          }`}
                          title="Agregar nota de cocina"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold px-1.5 text-amber-400">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-bold text-slate-100 min-w-[54px] text-right">
                          ${(item.price * item.quantity).toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>

                    {(editingNoteId === item.id || item.nota) && (
                      <input
                        type="text"
                        maxLength={150}
                        value={item.nota || ""}
                        onChange={(e) => updateItemNote(item.id, e.target.value)}
                        placeholder="Ej: Sin cebolla, sin hielo, bien cocido..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Datos de Retiro, Medio de Pago y Total */}
          <div className="pt-3 border-t border-slate-800 space-y-3 mt-3">
            {/* Canal y Datos para Take Away */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {ORDER_CHANNELS.map((ch) => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => setCanal(ch.value)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition ${
                      canal === ch.value
                        ? "bg-amber-500 text-slate-950 border-amber-500"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    maxLength={80}
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Nombre cliente"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1.5 text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    maxLength={30}
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="Tel. (opcional)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1.5 text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <input
                type="text"
                maxLength={300}
                value={notasPedido}
                onChange={(e) => setNotasPedido(e.target.value)}
                placeholder="Nota general (ej: Retira 22:15, sin cubiertos...)"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />

              <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entregaInmediata}
                    onChange={(e) => setEntregaInmediata(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  Entrega inmediata
                </label>

                {!entregaInmediata && (
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={imprimirComanda}
                      onChange={(e) => setImprimirComanda(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    Comanda cocina
                  </label>
                )}
              </div>
            </div>

            {/* Medio de Pago */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Medio de Pago
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("EFECTIVO")}
                  className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                    paymentMethod === "EFECTIVO"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Efectivo
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("MERCADOPAGO")}
                  className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                    paymentMethod === "MERCADOPAGO"
                      ? "bg-sky-500/10 border-sky-500 text-sky-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  MP / QR
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("DEBITO")}
                  className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                    paymentMethod === "DEBITO"
                      ? "bg-amber-500/10 border-amber-500 text-amber-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Débito
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CREDITO")}
                  className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                    paymentMethod === "CREDITO"
                      ? "bg-purple-500/10 border-purple-500 text-purple-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Crédito
                </button>
              </div>
            </div>

            {paymentMethod === "EFECTIVO" && cart.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Abona con ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={montoPaga}
                    onChange={(e) => setMontoPaga(e.target.value)}
                    placeholder={String(totalAmount)}
                    className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-right text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {vueltoCalculado !== null && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 font-semibold">Vuelto:</span>
                    <span
                      className={`font-black ${
                        vueltoCalculado >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      ${vueltoCalculado.toLocaleString("es-AR")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Total a Cobrar */}
            <div className="flex justify-between items-center py-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total a Cobrar
              </span>
              <span className="text-2xl font-black text-amber-400">
                ${totalAmount.toLocaleString("es-AR")}
              </span>
            </div>

            {/* Botón Cobrar e Imprimir */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || processing}
              className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg ${
                cart.length > 0 && !processing
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Cobrar e Imprimir
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      {/* TICKET DE CLIENTE Y COMANDA */}
      {lastSaleData && (
        <TicketPrint
          ventaId={lastSaleData.ventaId}
          numeroPedido={lastSaleData.numeroPedido}
          fecha={lastSaleData.fecha}
          items={lastSaleData.items}
          total={lastSaleData.total}
          medioPago={lastSaleData.medioPago}
          montoPaga={lastSaleData.montoPaga}
          vuelto={lastSaleData.vuelto}
          canal={lastSaleData.canal}
          clienteNombre={lastSaleData.clienteNombre}
          clienteTelefono={lastSaleData.clienteTelefono}
          notas={lastSaleData.notas}
          imprimirComanda={lastSaleData.imprimirComanda}
        />
      )}
    </div>
  );
}
