---
name: depurar-error
description: Método para diagnosticar y corregir errores, fallos de build, bugs o comportamientos inesperados. Úsala cuando el usuario reporte "no funciona", "da error", "se rompió", pegue un stack trace o un log, o pida arreglar algo.
---

# Depurar error

1. Reproduce el problema y confirma el síntoma exacto antes de tocar nada.
2. Lee el error completo; identifica la primera causa, no el último síntoma.
3. Formula una hipótesis y compruébala con una prueba mínima (log, test, aislar el caso).
4. Corrige la causa raíz con el cambio más pequeño posible.
5. Agrega o ajusta un test que habría detectado el fallo.
6. Verifica que no rompiste nada cercano.

Si tras dos intentos la hipótesis no se confirma, detente y explícame qué descartaste y qué falta saber. No parches a ciegas ni silencies errores.
