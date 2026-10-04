---
name: revisar-entrega
description: Checklist de calidad antes de dar una tarea por terminada o de hacer commit. Úsala al finalizar cualquier funcionalidad, antes de entregar, cuando pidan revisar, auditar o "dejar listo", y para hacer code review de cambios propios o ajenos.
---

# Revisar entrega

Revisa el cambio y confirma cada punto:

- Cumple lo pedido y nada más (sin alcance extra).
- Funciona en móvil y escritorio.
- Lint, tipos y tests pasan.
- Sin credenciales, datos de marca ni textos fijos incrustados.
- Estados de carga, vacío y error cubiertos.
- Entradas validadas; sin datos sensibles en logs.
- Documentación actualizada si cambió algo operativo.

Reporta en 3 bloques: Hecho, Riesgos/pendientes, Cómo probarlo. Si algo falla, corrígelo antes de reportar o dilo con claridad.
Commits atómicos con formato Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
