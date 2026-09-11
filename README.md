# Combustibles

PWA para llevar el contador mensual de promociones de combustible: dónde conviene
cargar cada día, cuánto queda de cada tope (semanal o mensual), cuánto se ahorró en el
mes y cuánto potencial queda sin usar.

Reemplaza al Excel *Contador Mensual de Combustibles – Septiembre 2026*. Sin backend:
todo corre en el navegador y los datos viven en `localStorage` del dispositivo (igual
que `alquiler_app` y `conductor_app`). Se instala en el celular desde el navegador y
funciona sin conexión.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `index.html` | Estructura: tabs Cargar / Mes / Semana / Promos y barra inferior |
| `app.js` | Modelo (promos, cargas, topes) y render, sin frameworks |
| `styles.css` | Tema oscuro, tarjetas, calendario, barras de cada bolsa |
| `manifest.json` | Metadatos de la PWA |
| `sw.js` | Service worker: código network-first, resto cache-first |
| `icons/` | Íconos 192/512 (dibujados con PIL) |

## Cómo se usa

1. **⛽ Cargar**: se elige la fecha y el monto y la app ordena las promociones que
   corren ese día según el ahorro, teniendo en cuenta lo que ya se usó de cada tope.
   Sin monto muestra el porcentaje de cada una. Si en *Mi rutina* hay una carga
   habitual, el monto arranca con ella (el campo es opcional y arranca vacío). La **recomendada** va arriba. Tocando una opción queda
   elegida en el formulario; se guarda la carga con emblema, nota y, si el banco
   devolvió otra cosa, el **reintegro real**, que reemplaza al calculado.
2. **📅 Mes**: calendario con las cargas de cada día (verde = con promo, ámbar = sin
   promo, puntito azul = día habitual todavía sin carga). Debajo, la **bolsa de cada
   promoción**: ahorro del mes, máximo que puede devolver en el mes con sus topes y lo
   que **queda** por aprovechar desde hoy (en meses cerrados: lo que quedó *sin usar*).
   Después vienen la lista de cargas y el historial mes a mes.
3. **🗓 Semana**: plan de la semana día por día con la promo principal (★) y las
   alternativas, lo cargado cada día y las bolsas flexibles (Ueno) con su saldo.
4. **💳 Promos**: alta y edición de promociones (tarjeta, emblemas, días, %, topes,
   vigencia, prioridad), la rutina (carga habitual opcional y días en que se carga) y
   los respaldos.

## Cómo se calculan los topes

- Las semanas van de **lunes a domingo**; los meses son calendario.
- Cada tope puede ser **de compra** (monto cargado con descuento) o **de reintegro**
  (descuento devuelto). Internamente todo se lleva en reintegro: un tope de compra de
  500.000 al 20% es un tope de 100.000 de reintegro.
- El ahorro de una carga **no se guarda**: se recalcula recorriendo las cargas por
  fecha. Cada una usa lo que dejaron libre las anteriores de su semana y de su mes, y
  lo que pasa del tope va sin descuento. Por eso borrar o corregir una carga vieja
  reacomoda solas las siguientes.
- Una carga con **reintegro real** cargado a mano cuenta ese valor, tanto para el
  ahorro como para consumir el tope.

## Regla de optimización

Las promos con prioridad **Estratégica** (las bolsas de Ueno) no se recomiendan si la
promo del día cubre la carga completa: quedan para cargas adicionales, reemplazos o
para cuando la promo del día llegó a su tope. Se desactiva en *Promos → Mi rutina* y
entonces se recomienda siempre el mayor ahorro.

## Datos iniciales

En el primer uso la app arranca con las promociones del Excel de septiembre 2026 (más
Continental renovada para Petrobras y Copetrol) y con las dos cargas que el Excel ya
tenía contabilizadas (GNB/Petrobras el 09/09 y Continental el 11/09). Todo se edita o
se borra desde la app.

Ueno Nivel 3 va con dos bolsas: **otros emblemas** con un tope de **75.000 de
reintegro por semana**, y **Petropar** con una bolsa mensual de **300.000 de carga**
(hasta 75.000 de reintegro). El Excel tomaba el tope de otros emblemas como de compra y
le agregaba un tope mensual que no existe.

Los datos guardados llevan una `version`. Cuando cambia una promo inicial, `migrar()`
corrige los datos que ya estaban en el teléfono (y los respaldos viejos) al abrir la
app. Solo toca las promos que siguen como venían: si ya las editaste, se respetan tus
cambios.

## Correr localmente

Tiene que servirse por HTTP (el service worker no arranca con `file://`):

```bash
python -m http.server 8751 --directory C:/combustible_app
```

Después abrir <http://localhost:8751>.

## Respaldos

Los datos son locales al navegador: si se limpia el sitio o se cambia de teléfono, se
pierden. En **Promos → Copia de seguridad** están *Descargar respaldo* (JSON) y
*Restaurar respaldo*. El **Exportar CSV** de la pestaña Mes saca todas las cargas
(separador `;`) para abrir en Excel.
