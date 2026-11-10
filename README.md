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
| `index.html` | Estructura: tabs Cargar / Mes / Semana / Estaciones / Promos y barra inferior |
| `app.js` | Modelo (promos, cargas, topes) y render, sin frameworks |
| `estaciones.js` | Estaciones adheridas de cada promo (ciudad, nombre, dirección), transcriptas de los folletos |
| `styles.css` | Tema oscuro, tarjetas, calendario, barras de cada bolsa |
| `manifest.json` | Metadatos de la PWA |
| `sw.js` | Service worker: código network-first, resto cache-first |
| `icons/` | Íconos 192/512 (dibujados con PIL) |

## Cómo se usa

1. **⛽ Cargar**: se elige la fecha y el monto y la app ordena las promociones que
   corren ese día según el ahorro, teniendo en cuenta lo que ya se usó de cada tope.
   Sin monto muestra el porcentaje de cada una. Si en *Mi rutina* hay una carga
   habitual, el monto arranca con ella (el campo es opcional y arranca vacío). La **recomendada** (mayor
   ahorro) va arriba y cada opción tiene *📍 Ver estaciones*. Tocando una opción queda
   elegida en el formulario; se guarda la carga con emblema, nota y, si el banco
   devolvió otra cosa, el **reintegro real**, que reemplaza al calculado.
2. **📅 Mes**: calendario con las cargas de cada día (verde = con promo, ámbar = sin
   promo, puntito azul = día habitual todavía sin carga). Debajo, la **bolsa de cada
   promoción**: ahorro del mes, máximo que puede devolver en el mes con sus topes y lo
   que **queda** por aprovechar desde hoy (en meses cerrados: lo que quedó *sin usar*).
   Después vienen la lista de cargas y el historial mes a mes.
3. **🗓 Semana**: plan de la semana día por día con la promo principal (★) y las
   alternativas y lo cargado cada día.
4. **📍 Estaciones**: se elige el emblema (Petrochaco, Copetrol, Shell…) y se ven sus
   promos (días, tarjeta, tope que queda, próximo día) y las estaciones adheridas a cada
   una, filtradas por ciudad (se recuerda) o por texto, con enlace a Google Maps. Si una
   promo no tiene lista cargada, se ofrece buscar el emblema en el mapa.
5. **💳 Promos**: alta y edición de promociones (tarjeta, emblemas, días, %, topes,
   vigencia, prioridad, grupo de tope compartido), la rutina (carga habitual opcional y
   días en que se carga) y los respaldos.

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
- Las promos con el mismo **grupo de tope** comparten el contador. Es el caso de FPJ:
  el tope de 200.000 de reintegro por mes es por rubro, así que Petrosur, Petrochaco y
  Copetrol FPJ descuentan de la misma bolsa.

## Datos iniciales

En el primer uso la app arranca con las promociones de noviembre 2026: GNB, Itaú/Shell
(lunes 20%, miércoles Personal Bank pausada, jueves V-Power), FPJ miércoles (Petrosur,
Petrochaco, Copetrol, tope compartido) y Continental viernes (Petrobras/Copetrol,
Energy, Compasa, Petrochaco, Petromax). Todo se edita o se borra desde la app.

Los datos guardados llevan una `version`. Cuando cambian las promos iniciales,
`migrar()` corrige los datos que ya estaban en el teléfono (y los respaldos viejos) al
abrir la app:

- **v2**: tope de Ueno otros emblemas como reintegro semanal.
- **v3**: se saca Ueno (el ahorro de las cargas hechas con Ueno queda fijo como
  reintegro real, para no perder el historial) y se cargan las promos de noviembre
  2026, pisando las versiones anteriores de Itaú/Shell y FPJ.

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
