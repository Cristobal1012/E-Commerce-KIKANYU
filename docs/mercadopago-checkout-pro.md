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
STOREFRONT_URL=http://localhost:3000
```

`MERCADOPAGO_PUBLIC_KEY` no se usa en este flujo, porque Checkout Pro redirige al `checkout_url` generado desde backend.

## Pasos manuales en Mercado Pago

1. Entra a Mercado Pago Developers con la aplicación de Chile.
2. Revisa `Tus integraciones > Datos de la integración > Credenciales de prueba`.
3. Copia solo en tu `.env` local la clave privada de prueba (`Access Token`).
4. Ve a `Webhooks > Configurar notificaciones`.
5. Registra la URL HTTPS:
P
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

Luego usa la URL HTTPS generada como `MEDUSA_BACKEND_URL` y como base de la URL de webhook en Mercado Pago.

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

## Seguridad e idempotencia

- No publiques Access Token, Webhook Secret ni usuarios de prueba en chat, commits, logs o docs.
- El webhook inválido no procesa el pago.
- El retorno `/checkout/pago/success` no marca el pedido como pagado.
- Medusa 2.21.2 procesa webhooks con `payment.webhook_received`, `process-payment-workflow`, lock por cart y `completeCartWorkflow`.
- `completeCartWorkflow` consulta `order_cart` y evita crear dos orders para el mismo cart; además reserva inventario bajo locking del módulo de inventario.
