import React from 'react';

interface CartItem {
  nombre: string;
  cantidad: number;
  precio: number;
}

interface TicketProps {
  ventaId?: string;
  fecha?: string;
  items: CartItem[];
  total: number;
  medioPago: string;
}

export const TicketPrint = React.forwardRef<HTMLDivElement, TicketProps>(
  ({ ventaId = '0001', fecha = new Date().toLocaleString('es-AR'), items, total, medioPago }, ref) => {
    return (
      <div ref={ref} className="ticket-print-area">
        <div className="ticket-header">
          <h2>EL REENCUENTRO FOOD</h2>
          <p>Comidas al Paso</p>
          <p>--------------------------------</p>
          <p>Ticket N°: {ventaId}</p>
          <p>Fecha: {fecha}</p>
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
              <tr key={index}>
                <td className="cant">{item.cantidad}x</td>
                <td className="desc">{item.nombre}</td>
                <td className="subt">${(item.cantidad * item.precio).toLocaleString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="ticket-divider">--------------------------------</p>

        <div className="ticket-total">
          <p className="total-row">
            <span>TOTAL:</span>
            <span>${total.toLocaleString('es-AR')}</span>
          </p>
          <p>Medio de Pago: <strong>{medioPago}</strong></p>
        </div>

        <p className="ticket-divider">--------------------------------</p>
        
        <div className="ticket-footer">
          <p>¡Muchas gracias por su compra!</p>
          <p>El Reencuentro Food</p>
        </div>
      </div>
    );
  }
);

TicketPrint.displayName = 'TicketPrint';