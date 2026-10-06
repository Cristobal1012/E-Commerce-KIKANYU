# Ecommerce de Esencias

Base white-label para una tienda chilena de esencias aromáticas.

## Stack

- Backend + Admin: Medusa v2.
- Storefront: Next.js App Router + TypeScript + Tailwind CSS.
- Servicios locales: PostgreSQL y Redis con Docker Compose.
- Gestor de paquetes: npm.

Medusa usa una app backend que también sirve el panel Admin. En desarrollo, el backend corre en `http://localhost:9000` y el Admin en `http://localhost:9000/app`.

## Requisitos

- Node.js `>=22.22.0`.
- npm `>=11`.
- Docker Desktop funcionando. En este equipo se verificó con:

```powershell
& 'C:\Users\crist\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe' info
```

## Configuración inicial

```powershell
Copy-Item apps\backend\.env.example apps\backend\.env
Copy-Item apps\storefront\.env.example apps\storefront\.env.local
npm.cmd install
```

Antes de producción, reemplaza los `TODO` de `apps\backend\.env` por secretos reales. Para desarrollo local puedes generar secretos con:

```powershell
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

## Levantar servicios

```powershell
& 'C:\Users\crist\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe' compose up -d
npm.cmd run backend:migrations
npm.cmd run backend:seed:catalog
```

El seed de catálogo imprime una publishable API key. Cópiala en
`apps\storefront\.env.local` como `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

Para entrar al Admin por primera vez, crea un usuario local:

```powershell
npm.cmd exec --workspace @white-label/backend -- medusa user -e <email-admin> -p <password-admin>
```

## Desarrollo

En una terminal:

```powershell
npm.cmd run backend:dev
```

En otra terminal:

```powershell
npm.cmd run storefront:dev
```

URLs:

- Storefront: `http://localhost:3000`
- Medusa backend: `http://localhost:9000`
- Medusa Admin: `http://localhost:9000/app`

## Verificación

```powershell
npm.cmd run lint
npm.cmd run type-check
npm.cmd run build
```

## Catálogo de prueba

Fase 1 agrega familias aromáticas como categorías de producto en Medusa y
productos genéricos marcados como dato de prueba. Para recargar esos datos:

```powershell
npm.cmd run backend:seed:catalog
```

El storefront lee productos desde la Store API de Medusa, muestra filtros
compartibles en la URL (`?familia=citrica,floral`) y orden por novedades,
nombre o precio menor. Buscador y carrito quedan fuera de esta fase.

## Checkout sin pago

Fase 3A agrega un checkout invitado en `http://localhost:3000/checkout`.
El seed crea opciones de entrega nativas de Medusa para retiro, despacho RM y
despacho resto del país, además de promociones de prueba:

- `TODO10`: descuento de prueba sobre productos.
- `TODO_ENVIO_GRATIS`: promoción automática de envío gratis sobre un monto
  mínimo ficticio.

Los datos pendientes para producción están listados en
`docs/pendientes-produccion-fase-3a.md`.

## White-label

La marca, contacto, punto de retiro, textos legales placeholder y tokens visuales viven en `config/brand.config.ts`. No hardcodees nombres de tienda, colores, logos ni datos de contacto en componentes.

## Pendiente

- TODO: identidad visual final.
- TODO: dominio y correo de tienda.
- TODO: dirección y horario de retiro.
- TODO: catálogo real.
- TODO: pasarela de pago para Fase 3.
