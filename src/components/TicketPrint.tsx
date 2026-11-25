import React from "react";

interface CartItem {
  nombre: string;
  cantidad: number;
  precio: number;
  nota?: string | null;
}

interface TicketProps {
  ventaId?: string;
  numeroPedido?: number;
  fecha?: string;
  items: CartItem[];
  total: number;
  medioPago: string;
  montoPaga?: number | null;
  vuelto?: number | null;
  canal?: string;
  clienteNombre?: string | null;
  clienteTelefono?: string | null;
  notas?: string | null;
  imprimirComanda?: boolean;
}

export function formatOrderNumber(numeroPedido?: number, ventaId?: string) {
  if (typeof numeroPedido === "number" && numeroPedido > 0) {
    return `#${String(numeroPedido).padStart(3, "0")}`;
  }
  if (ventaId) {
    return `#${ventaId.slice(0, 6).toUpperCase()}`;
  }
  return "#001";
}

export const TicketPrint = React.forwardRef<HTMLDivElement, TicketProps>(
  (
    {
      ventaId = "0001",
      numeroPedido,
      fecha = new Date().toLocaleString("es-AR"),
      items,
      total,
      medioPago,
      montoPaga,
      vuelto,
      canal = "MOSTRADOR",
      clienteNombre,
      clienteTelefono,
      notas,
      imprimirComanda = true,
    },
    ref
  ) => {
    const orderLabel = formatOrderNumber(numeroPedido, ventaId);
    const shortId = ventaId.length > 8 ? ventaId.slice(0, 8).toUpperCase() : ventaId;

    return (
      <div ref={ref} className="ticket-print-area">
        {/* Ticket para el Cliente */}
        <div className="ticket-header">
          <h2>EL REENCUENTRO FOOD</h2>
          <p>Comidas y Bebidas Take Away</p>
          <p className="ticket-order-number">PEDIDO {orderLabel}</p>
          <p>--------------------------------</p>
          <p>Ref: {shortId} | Canal: {canal}</p>
          <p>Fecha: {fecha}</p>
          {clienteNombre && (
            <p>
              Cliente: <strong>{clienteNombre}</strong>
            </p>
          )}
          {clienteTelefono && <p>Tel: {clienteTelefono}</p>}
        </div>

        <p className="ticket-divider">--------------------------------</p>

        <table className="ticket-table">
          <thead>
            <tr>
              <th className="cant">CANT</th>
              <th className="desc">DETALLE</th>
              <th className="subt">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td className="cant">{item.cantidad}x</td>
                  <td className="desc">{item.nombre}</td>
                  <td className="subt">
                    ${(item.cantidad * item.precio).toLocaleString("es-AR")}
                  </td>
                </tr>
                {item.nota && (
                  <tr>
                    <td />
                    <td colSpan={2} className="ticket-item-note">
                      ↳ {item.nota}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {notas && (
          <>
            <p className="ticket-divider">--------------------------------</p>
            <p className="ticket-order-note">
              <strong>Nota:</strong> {notas}
            </p>
          </>
        )}

        <p className="ticket-divider">--------------------------------</p>

        <div className="ticket-total">
          <p className="total-row">
            <span>TOTAL:</span>
            <span>${total.toLocaleString("es-AR")}</span>
          </p>
          <p>
            Medio de Pago: <strong>{medioPago}</strong>
          </p>
          {typeof montoPaga === "number" && (
            <p>
              Abona con: <strong>${montoPaga.toLocaleString("es-AR")}</strong>
            </p>
          )}
          {typeof vuelto === "number" && (
            <p>
              Vuelto: <strong>${vuelto.toLocaleString("es-AR")}</strong>
            </p>
          )}
        </div>

        <p className="ticket-divider">--------------------------------</p>

        <div className="ticket-footer">
          <p>Presente su número {orderLabel} al retirar</p>
          <p>¡Muchas gracias por su compra!</p>
        </div>

        {/* Comanda de Cocina */}
        {imprimirComanda && (
          <div className="ticket-comanda">
            <p className="ticket-cut">================================</p>
            <div className="ticket-header">
              <h2>COMANDA COCINA</h2>
              <p className="ticket-order-number">PEDIDO {orderLabel}</p>
              <p>
                {canal} - {fecha}
              </p>
              {clienteNombre && (
                <p>
                  Retira: <strong>{clienteNombre}</strong>
                </p>
              )}
            </div>
            <p className="ticket-divider">--------------------------------</p>
            <div className="comanda-items">
              {items.map((item, idx) => (
                <div key={idx} className="comanda-item-row">
                  <p className="comanda-item-title">
                    {item.cantidad}x {item.nombre}
                  </p>
                  {item.nota && <p className="ticket-item-note">↳ {item.nota}</p>}
                </div>
              ))}
            </div>
            {notas && (
              <>
                <p className="ticket-divider">--------------------------------</p>
                <p className="ticket-order-note">
                  <strong>OBS:</strong> {notas}
                </p>
              </>
            )}
            <p className="ticket-cut">================================</p>
          </div>
        )}
      </div>
    );
  }
);

TicketPrint.displayName = "TicketPrint";
