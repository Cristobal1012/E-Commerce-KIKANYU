# Mercado Pago Checkout Pro Orders API

Esta integración usa Mercado Pago Chile en entorno de prueba, mediante Checkout Pro con Orders API. El storefront nunca recibe el Access Token: crea la sesión de pago vía Medusa y redirige al `checkout_url` devuelto por Mercado Pago.

## Cambios automáticos en el código

- Provider de pago Medusa: `mercadopago`, registrado como `pp_mercadopago_mercadopago`.
- Creación de order en Mercado Pago con `POST /v1/orders` y `X-Idempotency-Key`.
- Webhook nativo de Medusa: `/hooks/payment/mercadopago_mercadopago`.
- Verificación de firma con `WebhookSignatureValidator` del SDK oficial `mercadopago`.
- Confirmación final solo por webhook, consultando `GET /v1/orders/{id}` antes de autorizar/capturar en Medusa.
- Retornos del comprador (`success`, `pending`, `failure`) solo muestran estado de UX y consultan Medusa; no confirman el pedido por sí solos.

## Variables de entorno

Configurar en `apps/backend/.env`:

```env
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
MERCADOPAGO_ORDER_EXPIRATION=P1D
MEDUSA_BACKEND_URL=http://localhost:9000
MERCADOPAGO_NOTIFICATION_BASE_URL=https://TU-TUNEL-HTTPS
STOREFRONT_URL=http://localhost:3000
```

`MERCADOPAGO_PUBLIC_KEY` no se usa en este flujo, porque Checkout Pro redirige al `checkout_url` generado desde backend.

`MEDUSA_BACKEND_URL` se usa para el Admin de Medusa. En desarrollo debe quedar en `http://localhost:9000` para que el Admin use el backend local y mantenga bien la sesion.

`MERCADOPAGO_NOTIFICATION_BASE_URL` se usa solo para construir el `callback_url` de Mercado Pago. Durante pruebas locales debe ser la URL HTTPS publica del tunel, sin slash final.

## Pasos manuales en Mercado Pago

1. Entra a Mercado Pago Developers con la aplicación de Chile.
2. Revisa `Tus integraciones > Datos de la integración > Credenciales de prueba`.
3. Copia solo en tu `.env` local la clave privada de prueba (`Access Token`).
4. Ve a `Webhooks > Configurar notificaciones`.
5. Registra la URL HTTPS:

```text
${MERCADOPAGO_NOTIFICATION_BASE_URL}/hooks/payment/mercadopago_mercadopago
```

Ejemplo:

```text
https://TU-TUNEL-HTTPS/hooks/payment/mercadopago_mercadopago
```

6. Selecciona el evento `Order (Mercado Pago)`.
7. Guarda la configuración y revela la clave secreta generada.
8. Copia esa clave solo en `MERCADOPAGO_WEBHOOK_SECRET`.

## Túnel HTTPS local

Mercado Pago requiere una URL HTTPS pública para webhooks. Usa una herramienta externa temporal, sin agregar dependencia al proyecto.

Ejemplos:

```bash
cloudflared tunnel --url http://localhost:9000
```

o:

```bash
ngrok http 9000
```

Luego usa la URL HTTPS generada como `MERCADOPAGO_NOTIFICATION_BASE_URL` y como base de la URL de webhook en Mercado Pago.

No cambies `MEDUSA_BACKEND_URL` al dominio del tunel en desarrollo. Esa variable queda para el Admin de Medusa y debe seguir apuntando a `http://localhost:9000`. Tampoco agregues el host del tunel a `server.allowedHosts`: el tunel solo debe recibir webhooks, no servir el Admin.

## Pasos manuales en Medusa Admin

1. Levanta backend y storefront.
2. Entra al Admin de Medusa.
3. Abre la región de Chile.
4. Habilita el proveedor `Mercado Pago` / `pp_mercadopago_mercadopago`.
5. Guarda la región antes de probar una compra.

## Compra de prueba

1. Inicia Postgres, Redis y servicios locales.
2. Configura las variables de entorno de prueba.
3. Expón el backend con túnel HTTPS.
4. Registra el webhook `Order (Mercado Pago)` en el panel.
5. Agrega productos al carrito en el storefront.
6. Completa contacto y entrega.
7. Presiona `Pagar`.
8. Mercado Pago debe abrir su Checkout Pro usando el `checkout_url` retornado por Orders API.
9. Paga con el usuario/comprador de prueba y medio de pago de prueba indicado por Mercado Pago.
10. Al volver a la tienda, la página puede mostrar estado pendiente mientras llega el webhook.
11. El pedido se considera pagado solo cuando Medusa recibe el webhook válido, consulta `GET /v1/orders/{id}`, valida monto/moneda contra la Payment Session persistida y completa el cart.

## Estados de retorno

- `success`: solo indica que el comprador volvió desde Mercado Pago. No confirma el pedido.
- `pending`: Mercado Pago todavía no confirma el estado definitivo.
- `failure`: Mercado Pago rechazó o no pudo completar el pago.
- `canceled` / `expired`: la order fue cancelada o vencida. El comprador puede reintentar desde el checkout.
- Abandono sin retorno: si el comprador cierra Mercado Pago o no vuelve a la tienda, el storefront queda sin nueva pantalla. El estado permanece pendiente hasta que Mercado Pago notifique un cambio o la order expire.

## Prueba manual de fallo posterior al pago

Caso: pago aprobado, pero el carrito no puede completarse porque ya no hay stock.

1. Inicia una compra de prueba y llega hasta Mercado Pago.
2. Antes de finalizar el pago, en Medusa Admin baja el stock de la variante comprada a `0`.
3. Finaliza el pago en Mercado Pago.
4. Espera el webhook `Order (Mercado Pago)`.
5. Resultado esperado:
   - Medusa intenta completar el cart y falla por inventario.
   - El provider intenta reembolsar la order usando `POST /v1/orders/{order_id}/refund`.
   - Si el reembolso falla, el pago o la sesión queda marcada con `mercadopago_manual_review.required = true`.
   - El log incluye `order_id`, `cart_id` cuando se puede resolver, `session_id` y motivo.

Consulta manual:

- Base de datos: revisar `payment.data -> 'mercadopago_manual_review'`.
- Si todavía no existe Payment, revisar `payment_session.data -> 'mercadopago_manual_review'`.
- Admin: abrir el pedido/pago relacionado cuando exista. Si no hay pedido, usar el `session_id`/`order_id` del log para ubicar la fila en base de datos.

## Seguridad e idempotencia

- No publiques Access Token, Webhook Secret ni usuarios de prueba en chat, commits, logs o docs.
- El webhook inválido no procesa el pago.
- El retorno `/checkout/pago/success` no marca el pedido como pagado.
- Medusa 2.21.2 procesa webhooks con `payment.webhook_received`, `process-payment-workflow`, lock por cart y `completeCartWorkflow`.
- `completeCartWorkflow` consulta `order_cart` y evita crear dos orders para el mismo cart; además reserva inventario bajo locking del módulo de inventario.
- Los reembolsos usan `POST /v1/orders/{order_id}/refund`. Reembolso total: body vacío. Reembolso parcial: `transactions[{ id, amount }]`.
- Las cancelaciones de orders no pagadas usan `POST /v1/orders/{order_id}/cancel`.
