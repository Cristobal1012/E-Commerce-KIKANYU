---
name: implementar-cambio
description: Guía para escribir o modificar código de forma limpia, pequeña y verificable. Úsala en toda implementación, corrección o refactor, sin importar el lenguaje o framework, y cada vez que se vaya a tocar código del proyecto.
---

# Implementar cambio

- Un cambio = un propósito. No mezcles refactors con funcionalidades.
- Antes de crear algo, busca si ya existe algo reutilizable y sigue las convenciones del proyecto.
- Tipado estricto, validación de datos en los bordes (formularios, webhooks, APIs).
- Contempla siempre los estados: cargando, vacío, error y éxito.
- Nada de marca, credenciales ni textos fijos incrustados: usa configuración y variables de entorno.
- No agregues dependencias sin justificarlas en una línea.
- Nombres de código en inglés; textos al usuario en español de Chile.
- Termina ejecutando lint, tipos y tests disponibles, y corrige lo que falle.

Cierre: resumen corto de qué hiciste, qué decidiste y qué queda pendiente, más los comandos para probarlo.
