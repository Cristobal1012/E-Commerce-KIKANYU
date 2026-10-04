---
name: marca-configurable
description: Mantiene el proyecto white-label y autogestionable para reutilizarlo con otros clientes. Úsala al crear o editar interfaz, textos, estilos, emails, SEO o cualquier dato propio de una marca, y cuando se hable de "otro cliente", "reutilizar", "vender el sistema" o "autogestionable".
---

# Marca configurable

- Nombre, logo, colores, tipografías, contacto, redes, textos legales y tarifas viven en configuración central o en el panel de administración, nunca en componentes.
- Estilos mediante variables de diseño (tokens); cambiar la paleta no debe requerir tocar componentes.
- Textos de interfaz centralizados, en español de Chile, listos para traducir.
- Todo lo que la dueña opere a diario (productos, precios, stock, promos, pedidos, tarifas) debe poder hacerse desde el panel sin editar código.
- Una instancia por cliente; no implementes multi-tenant real en base de datos todavía, pero no cierres la puerta a futuro.
- Si algo obligaría a editar código para un cliente nuevo, tráelo a configuración.
