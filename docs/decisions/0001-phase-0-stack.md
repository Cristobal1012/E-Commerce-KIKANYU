# 0001. Base técnica de Fase 0

Fecha: 2026-10-04

## Decisión

- Usar npm como gestor de paquetes.
- Usar Medusa v2 para backend y panel Admin.
- Usar Next.js App Router con TypeScript y Tailwind CSS para el storefront.
- Usar Docker Compose solo para PostgreSQL y Redis en Fase 0.
- Dejar Meilisearch fuera hasta Fase 2.
- Mantener marca, contacto, retiro, textos legales y tokens visuales en `config/brand.config.ts`.

## Motivo

Esta base permite levantar el MVP con convenciones estándar de Medusa y Next, sin agregar servicios antes de necesitarlos.
