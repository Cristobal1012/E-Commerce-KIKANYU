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
```

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

## White-label

La marca, contacto, punto de retiro, textos legales placeholder y tokens visuales viven en `config/brand.config.ts`. No hardcodees nombres de tienda, colores, logos ni datos de contacto en componentes.

## Pendiente

- TODO: identidad visual final.
- TODO: dominio y correo de tienda.
- TODO: dirección y horario de retiro.
- TODO: catálogo real.
- TODO: pasarela de pago para Fase 3.
