# AGENTS.md — Ecommerce de Esencias (white-label)

> Este archivo es la fuente de verdad del proyecto. Léelo completo antes de escribir código.
> Si algo aquí contradice una petición puntual, pregunta antes de avanzar.

---

## 1. Contexto

Tienda online para una emprendedora chilena que vende **esencias aromáticas**. El cliente final compra desde Chile y paga en pesos chilenos (CLP).

El proyecto tiene **dos objetivos**:

1. **Corto plazo:** lanzar la tienda de la suegra del desarrollador, con buen diseño, carrito, pago online, retiro en tienda o despacho, buscador y filtro por familia aromática.
2. **Mediano plazo:** convertirlo en un **producto reutilizable y autogestionable** que se pueda ofrecer a otros emprendedores (y que ella misma use para sus otros emprendimientos), cambiando solo marca, colores y catálogo.

Por eso, **todo debe construirse pensando en ser white-label**: nada de nombres, colores, textos o logos de la marca hardcodeados en componentes.

## 2. Quién usa esto

- **Cliente final:** compra desde celular la mayoría de las veces. Debe poder comprar sin crear cuenta (guest checkout).
- **Dueña de la tienda (no técnica):** debe poder crear productos, cambiar precios, stock, promociones, ver pedidos y cambiar su estado **sin tocar código y sin pedir ayuda**.
- **Desarrollador (yo):** domino Python y React a nivel intermedio. **Medusa y TypeScript son nuevos para mí** y estoy aprendiendo con este proyecto. Por defecto:
  - Explica brevemente qué hiciste y por qué, y avanza **por etapas pequeñas y revisables**.
  - Cuando uses un concepto propio de Medusa (módulos, workflows, providers, API routes, subscribers) o de TypeScript, explícalo en 2–3 líneas la primera vez que aparece, comparándolo con Python/React si ayuda.
  - Prefiere código simple y legible por sobre soluciones ingeniosas.
  - Si hay una forma "estándar de Medusa" y otra casera, usa la estándar y dime por qué.

## 3. Principios de trabajo

1. **Simple primero.** No sobre-ingenieres. Construye el MVP, luego iteramos.
2. **Configuración sobre código.** Marca, colores, tipografías, textos legales, comunas de despacho, tarifas, IVA, etc. viven en configuración o en el panel admin, no en componentes.
3. **Autogestionable.** Si una funcionalidad requiere editar código para operar el día a día, está mal diseñada.
4. **Una instancia por cliente (por ahora).** No implementes multi-tenancy real en base de datos. Cada cliente futuro = un despliegue con su propia config y base de datos. Deja el código limpio para poder evolucionar a multi-tenant después.
5. **Mobile first.** Diseña y prueba primero en 375px.
6. **Cambios pequeños.** Un cambio = un propósito. Commits atómicos.
7. **No inventes.** Si falta información (tarifas, textos legales, credenciales), deja un `TODO` claro y avísame; no pongas datos falsos que parezcan reales.

## 4. Stack propuesto

> Propuesta inicial. Si ves una razón sólida para cambiar algo, explícala antes de hacerlo.

| Capa | Tecnología | Por qué |
|---|---|---|
| Backend de comercio + panel admin | **Medusa (v2)** | Open source, panel admin listo (productos, pedidos, promociones, envíos), headless, sin pagar comisión por venta, reutilizable para otros clientes |
| Storefront | **Next.js (App Router) + TypeScript** | SEO, rendimiento, ecosistema |
| Estilos | **Tailwind CSS** + design tokens vía variables CSS | Facilita el theming white-label |
| Base de datos | **PostgreSQL** | Requerido por Medusa |
| Búsqueda | **Meilisearch** (o búsqueda nativa de Postgres si se quiere simplificar en MVP) | Búsqueda rápida y tolerante a errores de tipeo |
| Imágenes | Almacenamiento S3-compatible (Cloudflare R2 / S3) | Productos con fotos optimizadas |
| Pagos | Ver sección 6 | Mercado local |
| Emails transaccionales | Resend (o similar) | Confirmación de pedido, cambio de estado |
| Deploy | Por definir (ver sección 13) | |

### 4.1 Arquitectura

**No usamos arquitectura hexagonal completa.** Medusa ya impone su propia estructura (módulos, workflows, providers) y no hay que pelear contra ella ni duplicar capas. Aplica solo estos principios:

1. **Sigue las convenciones de Medusa.** Antes de crear una abstracción propia, revisa si Medusa ya ofrece el mecanismo.
2. **Puertos y adaptadores solo en las integraciones intercambiables**, usando los providers nativos de Medusa:
   - Pasarelas de pago (Webpay, Flow, Mercado Pago) → payment providers.
   - Despacho y couriers → fulfillment providers.
   - Email, búsqueda y almacenamiento de imágenes → detrás de su proveedor/servicio, configurables por cliente.
3. **Lógica de negocio pura y testeable.** El cálculo del desglose (subtotal, descuento, envío, total, IVA informativo), el envío gratis por monto mínimo y la cobertura por comuna deben ser **funciones simples, sin dependencia de la base de datos ni de Medusa**, con tests unitarios rápidos.
4. **No sobre-abstraer.** Prohibido crear capas, interfaces o repositorios "por si acaso". Una abstracción se justifica solo cuando ya existen (o son inminentes) dos implementaciones distintas.
5. **Cambiar de cliente = cambiar adaptadores y configuración**, nunca reescribir el núcleo.

## 5. Funcionalidades

### 5.1 MVP (Fase 1–3)

**Catálogo**
- Listado de productos con paginación o scroll infinito.
- Página de producto: fotos, descripción, notas olfativas, familia aromática, variantes de tamaño (ej. 30 ml, 50 ml, 100 ml), precio, stock.
- **Filtro por familia aromática** (ver 7).
- Orden por precio, nombre, novedades.

**Buscador**
- Búsqueda por nombre, familia aromática, notas y descripción.
- Resultados mientras se escribe (autocompletado) y página de resultados.
- Tolerante a tildes y errores leves de tipeo ("citrico" encuentra "Cítrico").

**Carrito**
- Agregar, quitar, cambiar cantidad.
- Persistente (si cierra la pestaña, el carrito sigue).
- Mini-carrito lateral + página de carrito.
- Validación de stock en tiempo real.

**Checkout**
- Guest checkout (cuenta opcional).
- Datos de contacto (nombre, email, teléfono, RUT opcional según necesidad de boleta/factura).
- Elección de **método de entrega**:
  - **Retiro en tienda:** costo $0, muestra dirección y horario de retiro.
  - **Despacho a domicilio:** pide dirección (región, comuna, calle, número, depto, referencias) y calcula el costo.
- **Desglose claro del pago** (ver sección 6).
- Pago online.
- Página de confirmación + email.

**Panel admin (lo que provee Medusa, configurado para ella)**
- CRUD de productos, variantes, imágenes, stock.
- Gestión de familias aromáticas.
- Códigos de descuento y promociones.
- Pedidos y cambio de estado (pagado, preparando, listo para retiro, despachado, entregado).
- Configuración de tarifas de despacho y puntos de retiro.

### 5.2 Fase posterior (no implementar aún)

- Cuentas de usuario con historial de pedidos.
- Reseñas de productos.
- Productos relacionados / "también te puede gustar".
- Integración con couriers (Starken, Chilexpress, Blue Express) con tarifas automáticas.
- Emisión automática de boleta electrónica (SII).
- Multi-tienda / multi-marca en una sola instancia.
- Programa de fidelización.

## 6. Reglas de negocio: checkout y desglose de pago

### 6.1 Desglose obligatorio (visible en carrito y checkout)

El usuario siempre debe ver, en este orden:

```
Subtotal productos        $XX.XXX
Descuento (CÓDIGO)       -$X.XXX      ← solo si aplica
Envío                     $X.XXX      ← "Retiro en tienda: $0" si aplica
-----------------------------------
TOTAL                     $XX.XXX
(IVA incluido: $X.XXX)               ← informativo
```

Reglas:
- Moneda: **CLP**, sin decimales, formato chileno (`$12.990`, punto como separador de miles).
- Los precios de catálogo **incluyen IVA (19%)**, como es costumbre en retail B2C en Chile. El IVA se muestra como informativo, no se suma al total.
- El descuento se aplica **sobre el subtotal de productos**, no sobre el envío (salvo promociones explícitas de "envío gratis").
- El total **nunca puede ser negativo**.
- El cálculo del total **lo hace el backend**. El frontend solo lo muestra. Nunca confíes en montos enviados desde el cliente.
- Si cambia el método de entrega o el código de descuento, el desglose se recalcula al instante.

### 6.2 Retiro vs despacho

- Retiro en tienda: sin costo, sin pedir dirección, muestra punto de retiro y horario (configurables desde admin).
- Despacho: tarifa configurable por región/comuna desde el admin. Permitir también **envío gratis sobre un monto mínimo** (configurable).
- Si una comuna no tiene cobertura, mostrar mensaje claro y no permitir continuar con despacho.

### 6.3 Pasarelas de pago (Chile)

Implementar detrás de una **interfaz de proveedor de pago**, de modo que agregar/cambiar pasarela no afecte el checkout.

Orden sugerido de integración (a confirmar, ver sección 13):
1. **Mercado Pago** o **Flow** (más rápidos de integrar y con buena cobertura de medios de pago).
2. **Webpay Plus (Transbank)** como opción adicional.

Requisitos:
- Usar **entorno sandbox/test** durante el desarrollo.
- Las credenciales van **solo en variables de entorno**, nunca en el repo.
- Manejar los tres resultados: pago exitoso, pago rechazado, pago abandonado.
- Confirmar el pago vía **webhook/verificación servidor a servidor**, no solo por la redirección del usuario.
- El stock se descuenta cuando el pago está confirmado (o se reserva con expiración).
- Idempotencia: si llega el mismo webhook dos veces, no se duplica el pedido.

## 7. Familias aromáticas

Es el eje principal de navegación y filtrado.

- Una **familia aromática** es una entidad administrable (nombre, slug, descripción corta, imagen/ícono opcional, orden).
- Un producto pertenece a **una familia principal** y puede tener **notas olfativas** adicionales (salida, corazón, fondo) como texto/tags.
- Familias iniciales de ejemplo (la dueña puede cambiarlas desde el admin):
  `Cítrica`, `Floral`, `Frutal`, `Amaderada`, `Oriental / Especiada`, `Fresca / Acuática`, `Dulce / Gourmand`, `Herbal / Aromática`.
- El filtro debe permitir **seleccionar varias familias** a la vez y combinarse con orden y búsqueda.
- Los filtros deben reflejarse en la **URL** (`?familia=citrica,floral`) para poder compartir y para SEO.
- Mostrar el conteo de productos por familia.

> Implementación sugerida en Medusa: usar **categorías de producto** para las familias y **metadata/tags** para las notas. Si queda corto, crear un módulo propio.

## 8. Diseño y experiencia

- Estética **moderna, limpia y elegante**, que transmita producto aromático premium. Mucho espacio en blanco, fotografía protagonista, tipografía cuidada.
- La paleta y tipografías se definen como **design tokens** (variables CSS) en un único archivo, para cambiarlos por cliente.
- Componentes accesibles (contraste, foco visible, navegación por teclado, `alt` en imágenes).
- Rendimiento: imágenes optimizadas (`next/image`), lazy loading, objetivo Lighthouse > 90 en móvil.
- Estados vacíos, de carga y de error bien diseñados (carrito vacío, sin resultados de búsqueda, pago fallido).
- Todos los textos de UI en **español de Chile**, centralizados para facilitar traducción futura.

## 9. Estructura de repositorio sugerida

```
/
├── AGENTS.md
├── README.md
├── apps/
│   ├── backend/          # Medusa
│   └── storefront/       # Next.js
├── config/
│   └── brand.config.ts   # Nombre, logo, colores, tipografías, contacto, redes, textos legales
├── docs/
│   ├── decisions/        # Registro de decisiones (ADR cortos)
│   └── onboarding-cliente.md   # Pasos para levantar una nueva tienda
└── docker-compose.yml    # Postgres, Redis, Meilisearch para desarrollo local
```

`config/brand.config.ts` es **el único lugar** donde viven los datos de marca. Cualquier componente que necesite el nombre de la tienda, colores o contacto lo lee de ahí.

## 10. Convenciones de código

- **TypeScript estricto**, sin `any` salvo justificación comentada.
- ESLint + Prettier configurados desde el inicio.
- Nombres de código en **inglés**; textos visibles al usuario en **español**.
- Componentes pequeños y con una sola responsabilidad.
- Validación de datos con **Zod** en bordes (formularios, webhooks, API).
- Tests unitarios obligatorios para la lógica de negocio pura (precios, descuentos, envío, IVA).
- Sin dependencias nuevas sin justificarlas brevemente.
- Commits con formato Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
- Flujo de ramas y PRs pequeños: ver sección 10.1.

### 10.1 Flujo de ramas (obligatorio)

Ramas del proyecto:

| Rama | Uso |
|---|---|
| `main` | Producción. Solo contiene código **aprobado**. |
| `staging` | Rama de pruebas y aprobación. Aquí llega todo antes de pasar a `main`. |
| `cristobal` | Rama de trabajo personal de Cristóbal. |
| `amanda` | Rama de trabajo personal de Amanda. |

Reglas:

1. **Nunca hagas commit ni push directo a `main`.** Ni siquiera para cambios pequeños o urgentes.
2. Todo cambio se desarrolla en la rama personal de quien lo trabaja (`cristobal` o `amanda`). Si no sabes en cuál estás, revisa con `git branch --show-current` y pregúntame antes de continuar.
3. Cuando el cambio está listo, se integra a **`staging`** (PR de la rama personal hacia `staging`).
4. En `staging` se prueba y se aprueba (checks en verde, revisión mía, prueba manual en el entorno de pruebas).
5. Solo **después de la aprobación**, `staging` se integra a `main` (PR de `staging` hacia `main`).
6. Antes de empezar a trabajar, actualiza tu rama personal con lo último de `staging` para evitar conflictos.
7. Si `main` recibe un cambio urgente (hotfix aprobado), se replica enseguida en `staging` y en las ramas personales.

```
cristobal ─┐
           ├─► staging ──(aprobado)──► main
amanda ────┘
```

Si te pido "súbelo", "deja listo" o "haz deploy", interprétalo como: commit en la rama personal y PR hacia `staging`. **Pasar a `main` solo cuando yo lo diga explícitamente.**

Preparación inicial (se hace una sola vez):

```bash
# 1. Partir desde main actualizado
git checkout main
git pull origin main

# 2. Rama de pruebas
git checkout -b staging
git push -u origin staging

# 3. Rama de Cristóbal
git checkout main
git checkout -b cristobal
git push -u origin cristobal

# 4. Rama de Amanda
git checkout main
git checkout -b amanda
git push -u origin amanda
```

Uso diario:

```bash
# Actualizar mi rama con lo último de staging
git checkout cristobal            # o amanda
git fetch origin
git merge origin/staging

# ... trabajar, commitear (Conventional Commits) ...
git push origin cristobal         # o amanda
# Luego abrir PR: cristobal/amanda → staging
```

Recomendación: proteger `main` y `staging` en el repositorio remoto (exigir PR y checks en verde antes de integrar) para que esta regla no dependa solo de la disciplina.

## 11. Seguridad y cumplimiento

- Secretos solo en `.env` (con `.env.example` versionado y sin valores reales).
- Nunca registrar en logs datos de tarjetas ni tokens de pago.
- Validar y sanear toda entrada de usuario.
- HTTPS obligatorio en producción.
- Respetar la **Ley 19.628** de protección de datos personales de Chile: política de privacidad, términos y condiciones, política de cambios y devoluciones (derecho de retracto según Ley del Consumidor), accesibles desde el footer. El contenido legal real lo entrega el cliente (dejar placeholders marcados con `TODO`).
- Rate limiting en endpoints sensibles (login, checkout, aplicar cupón).

## 12. Plan de trabajo por fases

Trabaja **una fase a la vez** y detente al terminar cada una para que yo la revise.

**Fase 0 — Base**
- Inicializar monorepo, Medusa, Next.js, Docker Compose, lint/format, `brand.config.ts`, README con instrucciones de arranque.
- Criterio de aceptación: `docker compose up` + comandos del README levantan backend, admin y storefront en local.

**Fase 1 — Catálogo**
- Modelo de familias aromáticas, productos y variantes de tamaño con datos de ejemplo (seed).
- Listado, página de producto y filtro por familia con filtros en URL.

**Fase 2 — Búsqueda y carrito**
- Buscador con autocompletado.
- Carrito persistente y mini-carrito.

**Fase 3 — Checkout y pagos**
- Retiro/despacho, tarifas por comuna, desglose completo, código de descuento.
- Primera pasarela en sandbox, webhooks, página de confirmación, emails.

**Fase 4 — Pulido y salida a producción**
- Diseño final, SEO (metadata, sitemap, Open Graph), analítica, páginas legales, pruebas end-to-end, deploy.

**Fase 5 — Productización**
- Documentar onboarding de un nuevo cliente, script para crear una nueva instancia, manual de uso del admin para la dueña.

## 13. Decisiones pendientes (no asumas, pregúntame)

- [ ] **Pasarela de pago inicial:** ¿Mercado Pago, Flow o Webpay Plus?
- [ ] **Hosting/deploy:** ¿VPS (Hetzner/DigitalOcean), Railway, Render, Vercel + backend aparte?
- [ ] **Dominio y correo de la tienda.**
- [ ] **Despacho:** ¿tarifa plana, por comuna/región, o integración con courier? ¿Monto mínimo para envío gratis?
- [ ] **Retiro en tienda:** dirección exacta y horarios.
- [ ] **Documento tributario:** ¿boleta electrónica manual por ahora?
- [ ] **Catálogo real:** cantidad de productos, tamaños/variantes, ¿se vende a granel o por frasco?
- [ ] **Identidad visual:** logo, paleta, tipografías, referencias de estilo que le gusten.
- [ ] **Búsqueda:** ¿Meilisearch desde el inicio o búsqueda nativa en el MVP?
- [ ] **Estrategia de venta futura:** ¿SaaS con suscripción o venta de instalación única? (afecta cuándo vale la pena hacer multi-tenant real).

## 14. Definition of Done (por tarea)

Una tarea está terminada cuando:
- [ ] Funciona en móvil y escritorio.
- [ ] Pasa lint, type-check y tests.
- [ ] No hay textos de marca ni credenciales hardcodeadas.
- [ ] Hay estados de carga, vacío y error contemplados.
- [ ] Se actualizó el README o `docs/` si cambió algo operativo.
- [ ] El cambio está en la rama personal y con PR hacia `staging`; nada fue directo a `main`.
- [ ] Me dejaste un resumen corto: qué hiciste, qué decidiste y qué queda pendiente.

## 15. Cómo quiero que respondas

- Antes de empezar una fase, propón en 5–10 líneas el plan y espera mi OK si hay decisiones abiertas.
- Explica en lenguaje simple las decisiones importantes.
- Si encuentras un problema o algo ambiguo, **pregunta** en lugar de suponer.
- No toques archivos fuera del alcance de la tarea.
- Antes de hacer commit, confirma en qué rama estás y nunca trabajes sobre `main`.
- Al finalizar cada fase, entrega los comandos exactos para probar lo que hiciste.
