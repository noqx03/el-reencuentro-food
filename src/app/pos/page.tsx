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
  X
} from "lucide-react";
import Link from "next/link";
import { TicketPrint } from "@/components/TicketPrint";

interface Product {
  id: string;
  nombre: string;
  precio: number;
  stockActual: number;
  category?: {
    nombre: string;
  };
}

interface CartItem {
  id: string;
  nombre: string;
  price: number;
  quantity: number;
}

export default function POSPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("EFECTIVO");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Referencia para autofocus del buscador
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estado para datos del ticket de impresión
  const [lastSaleData, setLastSaleData] = useState<{
    ventaId: string;
    fecha: string;
    items: { nombre: string; cantidad: number; precio: number }[];
    total: number;
    medioPago: string;
  } | null>(null);

  const userRole = (session?.user as any)?.rol || (session?.user as any)?.role;
  const isAdminOrSuper = userRole === "ADMIN" || userRole === "SUPERADMIN";

  // Cargar productos del catálogo
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/productos");
      if (res.ok) {
        const data = await res.json();
        const activeProducts = data.productos.filter((p: any) => p.activo);
        setProducts(activeProducts);

        const cats = Array.from(
          new Set(
            activeProducts
              .map((p: any) => p.category?.nombre)
              .filter(Boolean)
          )
        ) as string[];
        setCategories(["Todos", ...cats]);
      }
    } catch (err) {
      console.error("Error al cargar catálogo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Manejo de atajos de teclado (F2 para buscar, ESC para borrar búsqueda)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchTerm("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Agregar producto al carrito
  const addToCart = (product: Product) => {
    if (product.stockActual <= 0) return;

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
        },
      ];
    });
  };

  // Modificar cantidad en el carrito
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

  const clearCart = () => setCart([]);

  const totalAmount = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Registrar venta e imprimir ticket
  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;

    try {
      setProcessing(true);
      setMessage(null);

      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          metodoPago: paymentMethod,
          total: totalAmount,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const ticketItems = cart.map((item) => ({
          nombre: item.nombre,
          cantidad: item.quantity,
          precio: item.price,
        }));

        setLastSaleData({
          ventaId: data.ventaId || data.id || String(Date.now()).slice(-6),
          fecha: new Date().toLocaleString("es-AR"),
          items: ticketItems,
          total: totalAmount,
          medioPago: paymentMethod,
        });

        setMessage({ type: "success", text: "¡Venta registrada con éxito!" });
        setCart([]);
        setSearchTerm("");
        await fetchProducts();

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

  // Filtrado de productos por Categoría y Búsqueda por Texto
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
            <span className="text-[11px] text-slate-400">Punto de Venta</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
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

          {isAdminOrSuper && (
            <Link
              href="/admin/productos"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-md border border-indigo-400/30 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-200" />
              <span>Panel Admin</span>
            </Link>
          )}

          <button
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
                    className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition cursor-pointer select-none ${
                      stockDisponible > 0
                        ? "border-slate-800 hover:border-amber-500/50 hover:bg-slate-850"
                        : "border-slate-800/40 opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          {p.category?.nombre || "General"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            stockDisponible > 5
                              ? "bg-emerald-500/10 text-emerald-400"
                              : stockDisponible > 0
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          Stock: {stockDisponible}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-100 text-sm mb-1">
                        {p.nombre}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60">
                      <span className="text-base font-bold text-amber-400">
                        ${Number(p.precio).toLocaleString("es-AR")}
                      </span>
                      <button
                        disabled={stockDisponible <= 0}
                        className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-slate-300 transition"
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

        {/* Panel del Pedido Actual (Carrito) */}
        <aside className="lg:col-span-4 bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between">
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                Pedido Actual
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vaciar
                </button>
              )}
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
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <ShoppingBag className="w-8 h-8 mb-2 stroke-1" />
                  <span>El carrito está vacío</span>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{item.nombre}</p>
                      <p className="text-slate-400">
                        ${item.price.toLocaleString("es-AR")} c/u
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold px-1.5 text-amber-400">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold text-slate-100 min-w-[60px] text-right">
                        ${(item.price * item.quantity).toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selección de Medio de Pago y Total */}
          <div className="pt-4 border-t border-slate-800 space-y-4 mt-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Medio de Pago
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("EFECTIVO")}
                  className={`py-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
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
                  className={`py-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                    paymentMethod === "MERCADOPAGO"
                      ? "bg-sky-500/10 border-sky-500 text-sky-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  MercadoPago
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("DEBITO")}
                  className={`py-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                    paymentMethod === "DEBITO"
                      ? "bg-amber-500/10 border-amber-500 text-amber-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Débito
                </button>
              </div>
            </div>

            {/* Total a Cobrar */}
            <div className="flex justify-between items-center py-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total a Cobrar
              </span>
              <span className="text-2xl font-black text-amber-400">
                ${totalAmount.toLocaleString("es-AR")}
              </span>
            </div>

            {/* Botón Cobrar e Imprimir */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || processing}
              className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg ${
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

      {/* TICKET DE CLIENTE */}
      {lastSaleData && (
        <TicketPrint
          ventaId={lastSaleData.ventaId}
          fecha={lastSaleData.fecha}
          items={lastSaleData.items}
          total={lastSaleData.total}
          medioPago={lastSaleData.medioPago}
        />
      )}
    </div>
  );
}