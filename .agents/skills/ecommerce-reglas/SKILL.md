---
name: ecommerce-reglas
description: Reglas de negocio de tiendas online en Chile: precios en CLP, IVA, descuentos, envío vs retiro, desglose del total, carrito, stock y pagos con webhooks. Úsala siempre que se toque carrito, checkout, precios, promociones, despacho, pedidos o pasarelas de pago.
---

# Reglas de ecommerce

**Desglose** (siempre visible, en este orden): subtotal productos, descuento, envío (retiro = $0), total, e IVA incluido como dato informativo.

- Moneda CLP sin decimales, formato `$12.990`. Precios de catálogo incluyen IVA 19%.
- El descuento aplica al subtotal de productos, no al envío (salvo "envío gratis" explícito). El total nunca es negativo.
- El backend calcula todos los montos; el frontend solo los muestra. Jamás confíes en montos del cliente.
- Retiro: sin dirección ni costo. Despacho: tarifa por zona y envío gratis sobre monto mínimo, ambos configurables.
- Comuna sin cobertura: mensaje claro y bloquear despacho.
- Stock: validar al agregar y al pagar; descontar con pago confirmado.
- Pagos: interfaz de proveedor intercambiable, sandbox en desarrollo, credenciales solo en entorno.
- Confirmar el pago por webhook servidor a servidor, con idempotencia (mismo evento dos veces no duplica pedido).
- Manejar pago exitoso, rechazado y abandonado.
