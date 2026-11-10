// ---------- Datos ----------
// Un solo objeto en localStorage:
//   promos -> cada promocion: tarjeta, emblemas, dias, %, topes y vigencia
//   cargas -> cada carga de combustible: fecha, monto y promo usada
//   config -> monto habitual por carga, dias en que se carga y ciudad de la
//             pestana Estaciones (las estaciones viven en estaciones.js)
// El ahorro de cada carga NO se guarda: se recalcula recorriendo las cargas en
// orden de fecha, asi borrar o corregir una carga vieja reacomoda los topes de
// las siguientes.
const STORE_KEY = 'combustibles-datos-v1';

const PRIORIDADES = {
  principal: { etiqueta: 'Principal', orden: 0 },
  reserva: { etiqueta: 'Reserva', orden: 1 },
  alternativa: { etiqueta: 'Alternativa', orden: 2 },
};

// Orden lunes -> domingo, con el indice que devuelve Date.getDay().
const DIAS_SEMANA = [
  { dow: 1, corto: 'L', largo: 'Lunes' }, { dow: 2, corto: 'M', largo: 'Martes' },
  { dow: 3, corto: 'X', largo: 'Miércoles' }, { dow: 4, corto: 'J', largo: 'Jueves' },
  { dow: 5, corto: 'V', largo: 'Viernes' }, { dow: 6, corto: 'S', largo: 'Sábado' },
  { dow: 0, corto: 'D', largo: 'Domingo' },
];
const TODOS_LOS_DIAS = [0, 1, 2, 3, 4, 5, 6];

// Version del formato de datos: las correcciones a promos ya guardadas en el
// telefono van en migrar().
const VERSION_DATOS = 3;

const FPJ_GRUPO = 'fpj-combustible';
const NOTA_FPJ = 'Tope de reintegro mensual por rubro y cuenta: 200.000 en Clásica/Oro, compartido entre ' +
  'Petrosur, Petrochaco y Copetrol FPJ (Black: +5% y 250.000). POS Bancard. No acumulable.';
const NOTA_CONT = 'Tope semanal de compra por cuenta de tarjeta, en conjunto para todas las estaciones del emblema. ' +
  'Solo compras presenciales con POS Dinelco (no app ni POS virtual).';

// Promociones vigentes en noviembre 2026. Las de FPJ comparten un mismo tope
// mensual (grupoTope): lo que se usa en una lo descuenta de las otras.
const PROMOS_INICIALES = [
  { id: 'itau-shell', nombre: 'Itaú / Shell lunes', tarjeta: 'TC Itaú Oro + POS Bancard', emblemas: 'Shell',
    dias: [1], pct: 20, topeSemanal: 0, topeMensual: 500000, tipoTope: 'compra',
    desde: '2026-02-23', hasta: '2026-12-31', prioridad: 'principal', activa: true,
    nota: 'Tope mensual de compra por cliente (titular + adicionales) con Oro: 500.000. No acumulable.' },
  { id: 'itau-vpower', nombre: 'Itaú / Shell V-Power jueves', tarjeta: 'TC Itaú Oro', emblemas: 'Shell',
    dias: [4], pct: 25, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '2026-10-29', hasta: '2026-11-26', prioridad: 'principal', activa: true,
    nota: 'Solo Shell V-Power. Tope de carga de 500.000 por jueves con Oro. ' +
      'No descuenta del tope de los lunes. Cupones x5.' },
  { id: 'gnb-copetrol', nombre: 'GNB / Copetrol', tarjeta: 'GNB Mastercard Clásica + QR Copetrol Vamos', emblemas: 'Copetrol',
    dias: [1], pct: 20, topeSemanal: 0, topeMensual: 1000000, tipoTope: 'compra',
    desde: '2026-07-06', hasta: '2026-12-28', prioridad: 'reserva', activa: true, nota: '' },
  { id: 'gnb-petrochaco', nombre: 'GNB / Petrochaco', tarjeta: 'GNB Mastercard Clásica', emblemas: 'Petrochaco',
    dias: [2], pct: 20, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '2026-07-07', hasta: '2026-12-29', prioridad: 'reserva', activa: true, nota: '' },
  { id: 'gnb-petrobras', nombre: 'GNB / Petrobras', tarjeta: 'GNB Mastercard Clásica + app Premmia', emblemas: 'Petrobras',
    dias: [3], pct: 20, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '2026-07-01', hasta: '2026-12-30', prioridad: 'principal', activa: true, nota: '' },
  { id: 'fpj-petrosur', nombre: 'FPJ / Petrosur', tarjeta: 'FPJ Clásica + POS Bancard', emblemas: 'Petrosur',
    dias: [3], pct: 20, topeSemanal: 0, topeMensual: 200000, tipoTope: 'reintegro', grupoTope: FPJ_GRUPO,
    desde: '', hasta: '2026-12-31', prioridad: 'alternativa', activa: true,
    nota: NOTA_FPJ + ' No aplica pagando por la app de Petrosur.' },
  { id: 'fpj-petrochaco', nombre: 'FPJ / Petrochaco', tarjeta: 'FPJ Clásica + POS Bancard', emblemas: 'Petrochaco',
    dias: [3], pct: 20, topeSemanal: 0, topeMensual: 200000, tipoTope: 'reintegro', grupoTope: FPJ_GRUPO,
    desde: '', hasta: '2026-12-31', prioridad: 'alternativa', activa: true, nota: NOTA_FPJ },
  { id: 'fpj-copetrol', nombre: 'FPJ / Copetrol', tarjeta: 'FPJ Clásica + POS Bancard', emblemas: 'Copetrol',
    dias: [3], pct: 20, topeSemanal: 0, topeMensual: 200000, tipoTope: 'reintegro', grupoTope: FPJ_GRUPO,
    desde: '2026-10-07', hasta: '2027-12-31', prioridad: 'alternativa', activa: true, nota: NOTA_FPJ },
  { id: 'gnb-petrosur', nombre: 'GNB / Petrosur', tarjeta: 'GNB Mastercard Clásica + app Petrosur', emblemas: 'Petrosur',
    dias: [5], pct: 20, topeSemanal: 0, topeMensual: 1000000, tipoTope: 'compra',
    desde: '2026-05-01', hasta: '2026-12-25', prioridad: 'reserva', activa: true, nota: '' },
  { id: 'continental-viernes', nombre: 'Continental / Petrobras-Copetrol', tarjeta: 'TC Continental (no Privilege) + POS Dinelco', emblemas: 'Petrobras / Copetrol',
    dias: [5], pct: 20, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '', hasta: '', prioridad: 'principal', activa: true,
    nota: 'Renovada (confirmado el 11/09/2026). El tope semanal de 500.000 era el registrado para Petrobras: confirmar si aplica igual en Copetrol y si es compartido.' },
  { id: 'cont-energy', nombre: 'Continental / Energy', tarjeta: 'TC Continental (Dinelco, Clásica, Oro) + POS Dinelco', emblemas: 'Energy',
    dias: [5], pct: 20, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '', hasta: '2027-03-06', prioridad: 'alternativa', activa: true, nota: NOTA_CONT },
  { id: 'cont-compasa', nombre: 'Continental / Compasa', tarjeta: 'TC Continental + POS Dinelco', emblemas: 'Compasa',
    dias: [5], pct: 20, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '', hasta: '2027-09-17', prioridad: 'alternativa', activa: true, nota: NOTA_CONT },
  { id: 'cont-petrochaco', nombre: 'Continental / Petrochaco', tarjeta: 'TC Continental + POS Dinelco', emblemas: 'Petrochaco',
    dias: [5], pct: 20, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '', hasta: '2026-11-20', prioridad: 'alternativa', activa: true, nota: NOTA_CONT },
  { id: 'cont-petromax', nombre: 'Continental / Petromax', tarjeta: 'TC Continental + POS Dinelco', emblemas: 'Petromax',
    dias: [5], pct: 20, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '', hasta: '2027-10-01', prioridad: 'alternativa', activa: true,
    nota: NOTA_CONT + ' No acumulable. No participan prepagas, Gourmet Card ni Cabal.' },
];

// Promos que la version 3 agrega o reemplaza en los datos ya guardados.
const IDS_V3 = ['itau-shell', 'itau-vpower', 'fpj-petrosur', 'fpj-petrochaco', 'fpj-copetrol',
  'cont-energy', 'cont-compasa', 'cont-petrochaco', 'cont-petromax'];
const IDS_UENO = ['ueno-petropar', 'ueno-otros'];

// Las dos cargas que el Excel ya tenia contabilizadas (sin fecha: se asumen
// las de esta semana).
const CARGAS_INICIALES = [
  { id: 'c0001', fecha: '2026-09-09', monto: 150000, promoId: 'gnb-petrobras', emblema: 'Petrobras',
    reintegro: null, nota: 'Del Excel — confirmar fecha' },
  { id: 'c0002', fecha: '2026-09-11', monto: 150000, promoId: 'continental-viernes', emblema: 'Petrobras',
    reintegro: null, nota: 'Del Excel — confirmar fecha' },
];

// La carga habitual arranca vacia: es opcional y solo sirve para precargar el
// monto y armar el plan de la semana.
const CONFIG_INICIAL = { montoHabitual: 0, diasHabituales: [1, 3, 5], ciudadEstaciones: '' };

function datosIniciales() {
  return {
    version: VERSION_DATOS,
    promos: PROMOS_INICIALES.map(p => Object.assign({}, p, { dias: p.dias.slice() })),
    cargas: CARGAS_INICIALES.map(c => Object.assign({}, c)),
    config: Object.assign({}, CONFIG_INICIAL, { diasHabituales: CONFIG_INICIAL.diasHabituales.slice() }),
  };
}

function normalizar(d) {
  return {
    version: d.version || 1,
    promos: d.promos,
    cargas: Array.isArray(d.cargas) ? d.cargas : [],
    config: Object.assign({}, CONFIG_INICIAL, d.config || {}),
  };
}

// Corrige las promos iniciales en datos guardados con una version anterior
// (el telefono, un respaldo viejo). Solo toca una promo si sigue exactamente
// como venia: si el usuario ya la edito, mandan sus cambios.
function migrar(d) {
  if (d.version < 3) {
    // v3: se saca Ueno y se cargan las promos de noviembre 2026 (Itaú/Shell,
    // FPJ con tope compartido, Continental viernes por emblema). Pedido
    // explicito: las promos de IDS_V3 se pisan aunque se hayan editado.
    //
    // Antes de borrar Ueno, su ahorro queda fijo como reintegro real en cada
    // carga, para no perder el historial.
    const previo = datos;
    datos = d;
    const { detalle } = calcular();
    datos = previo;
    d.cargas.forEach(c => {
      if (!IDS_UENO.includes(c.promoId)) return;
      if (c.reintegro == null || c.reintegro === '') c.reintegro = detalle[c.id] ? detalle[c.id].ahorro : 0;
      c.nota = c.nota ? 'Ueno · ' + c.nota : 'Ueno';
    });
    d.promos = d.promos.filter(p => !IDS_UENO.includes(p.id));

    IDS_V3.forEach(id => {
      const nueva = Object.assign({}, PROMOS_INICIALES.find(p => p.id === id));
      nueva.dias = nueva.dias.slice();
      const i = d.promos.findIndex(p => p.id === id);
      if (i >= 0) d.promos[i] = nueva; else d.promos.push(nueva);
    });

    // Sin Ueno ya no hay "bolsas estrategicas": las que el usuario haya
    // creado con esa prioridad pasan a Alternativa.
    d.promos.forEach(p => { if (!PRIORIDADES[p.prioridad]) p.prioridad = 'alternativa'; });
    delete d.config.reservarBolsas;
  }
  d.version = VERSION_DATOS;
  return d;
}

let datos = null;
try {
  const guardado = JSON.parse(localStorage.getItem(STORE_KEY));
  if (guardado && Array.isArray(guardado.promos)) datos = migrar(normalizar(guardado));
} catch (e) { /* datos corruptos: se arranca con los iniciales */ }
if (!datos) datos = datosIniciales();
guardar();

function guardar() {
  localStorage.setItem(STORE_KEY, JSON.stringify(datos));
}

// ---------- Utilidades ----------
function fmt(n) { return '₲ ' + Math.round(n).toLocaleString('es-PY'); }

function fmtCorto(n) {
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));
  if (abs < 1000000) return Math.round(n / 1000) + 'k';
  return (n / 1000000).toFixed(1).replace('.', ',') + 'M';
}

function fmtPct(x) { return (Math.round(x * 1000) / 10).toLocaleString('es-PY') + '%'; }

function aISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function hoyISO() { return aISO(new Date()); }

function aFecha(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

function sumarDias(iso, n) {
  const f = aFecha(iso);
  f.setDate(f.getDate() + n);
  return aISO(f);
}

function diasEntre(desde, hasta) {
  return Math.round((aFecha(hasta) - aFecha(desde)) / 86400000);
}

function fechaLegible(iso, conAnio) {
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  if (conAnio) opts.year = 'numeric';
  return aFecha(iso).toLocaleDateString('es-PY', opts);
}

function fechaCorta(iso) {
  return aFecha(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function diaMes(iso) {
  return aFecha(iso).toLocaleDateString('es-PY', { day: 'numeric', month: 'long' });
}

function mesLegible(clave, conAnio) {
  const [a, m] = clave.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('es-PY', conAnio ? { month: 'long', year: 'numeric' } : { month: 'long' });
}

function claveMes(iso) { return iso.slice(0, 7); }

function diasDelMes(a, m) { return new Date(a, m, 0).getDate(); }

function mesSiguiente(clave) {
  const [a, m] = clave.split('-').map(Number);
  return m === 12 ? (a + 1) + '-01' : a + '-' + String(m + 1).padStart(2, '0');
}

function mesAnterior(clave) {
  const [a, m] = clave.split('-').map(Number);
  return m === 1 ? (a - 1) + '-12' : a + '-' + String(m - 1).padStart(2, '0');
}

function finDeMes(clave) {
  const [a, m] = clave.split('-').map(Number);
  return clave + '-' + String(diasDelMes(a, m)).padStart(2, '0');
}

// Las semanas de los topes van de lunes a domingo.
function lunesDe(iso) {
  return sumarDias(iso, -((aFecha(iso).getDay() + 6) % 7));
}

function nombreDia(iso) {
  const dow = aFecha(iso).getDay();
  return DIAS_SEMANA.find(d => d.dow === dow).largo;
}

// ---------- Separador de miles en los campos numericos ----------
function formatoMiles(texto) {
  const digitos = String(texto).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digitos ? Number(digitos).toLocaleString('es-PY') : '';
}

function montoDe(input) { return Number(input.value.replace(/\D/g, '')); }

// Valor para un campo de monto: vacio en vez de "0".
function montoTexto(n) { return Number(n) ? formatoMiles(n) : ''; }

function conSeparadorMiles(input) {
  input.addEventListener('input', () => {
    const digitosAntes = input.value.slice(0, input.selectionStart).replace(/\D/g, '').length;
    input.value = formatoMiles(input.value);
    // Recolocar el cursor contando digitos: si no, los puntos que se agregan
    // lo empujan al final y no se puede corregir el medio del numero.
    let i = 0, vistos = 0;
    while (i < input.value.length && vistos < digitosAntes) {
      if (/\d/.test(input.value[i])) vistos++;
      i++;
    }
    input.setSelectionRange(i, i);
  });
}

function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function el(tag, clase, texto) {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto != null) e.textContent = texto;
  return e;
}

// ---------- Modelo: promociones ----------
function promoPorId(id) { return datos.promos.find(p => p.id === id) || null; }

function pctDe(p) { return (Number(p.pct) || 0) / 100; }

// Promos con el mismo grupoTope comparten el contador de uso (FPJ: un tope
// mensual por rubro para Petrosur, Petrochaco y Copetrol).
function claveUso(p) { return p.grupoTope || p.id; }

function companerosDeTope(p) {
  return p.grupoTope ? datos.promos.filter(x => x.id !== p.id && x.grupoTope === p.grupoTope) : [];
}

function vigente(p, iso) { return (!p.desde || iso >= p.desde) && (!p.hasta || iso <= p.hasta); }

// La promo corre ese dia (vigencia + dia de la semana). Se usa para contar las
// cargas viejas aunque despues la promo se haya pausado.
function correEnFecha(p, iso) { return vigente(p, iso) && p.dias.includes(aFecha(iso).getDay()); }

// Ademas de correr, esta activa: es lo que se ofrece para una carga nueva.
function disponible(p, iso) { return p.activa !== false && correEnFecha(p, iso); }

function emblemasDe(p) { return String(p.emblemas || '').split('/').map(s => s.trim()).filter(Boolean); }

function diasTexto(p) {
  if (p.dias.length === 7) return 'Todos los días';
  return DIAS_SEMANA.filter(d => p.dias.includes(d.dow)).map(d => d.largo).join(', ');
}

function ordenPrioridad(p) { return (PRIORIDADES[p.prioridad] || PRIORIDADES.reserva).orden; }

// Los topes se pasan a "reintegro maximo" del periodo: un tope de compra de
// 500.000 al 20% es un tope de 100.000 de reintegro. Asi un mismo contador
// sirve para las promos que topean la compra y las que topean el descuento.
function topeAhorro(p, monto) {
  if (!Number(monto)) return Infinity;
  return p.tipoTope === 'reintegro' ? Number(monto) : Number(monto) * pctDe(p);
}

function estadoVigencia(p) {
  const hoy = hoyISO();
  if (p.activa === false) return { clase: 'pausada', texto: 'Pausada' };
  if (p.hasta && p.hasta < hoy) return { clase: 'vencida', texto: 'Venció el ' + fechaCorta(p.hasta) };
  if (p.desde && p.desde > hoy) return { clase: 'futura', texto: 'Arranca el ' + fechaCorta(p.desde) };
  if (p.hasta) {
    const d = diasEntre(hoy, p.hasta);
    if (d <= 21) return { clase: 'vence', texto: d === 0 ? 'Vence hoy' : 'Vence en ' + d + (d === 1 ? ' día' : ' días') };
    return { clase: 'ok', texto: 'Hasta el ' + fechaCorta(p.hasta) };
  }
  return { clase: 'ok', texto: 'Sin fecha de fin' };
}

// ---------- Modelo: cargas y topes ----------
function ordenCargas(a, b) { return a.fecha.localeCompare(b.fecha) || String(a.id).localeCompare(String(b.id)); }

function espacioLibre(p, iso, uso) {
  const u = uso[claveUso(p)] || { sem: {}, mes: {} };
  const sem = topeAhorro(p, p.topeSemanal) - (u.sem[lunesDe(iso)] || 0);
  const mes = topeAhorro(p, p.topeMensual) - (u.mes[claveMes(iso)] || 0);
  return Math.max(0, Math.min(sem, mes));
}

function consumir(p, iso, uso, ahorro) {
  const k = claveUso(p);
  if (!uso[k]) uso[k] = { sem: {}, mes: {} };
  const u = uso[k];
  const s = lunesDe(iso), m = claveMes(iso);
  u.sem[s] = (u.sem[s] || 0) + ahorro;
  u.mes[m] = (u.mes[m] || 0) + ahorro;
}

// Recorre las cargas en orden de fecha y reparte los topes: cada carga usa lo
// que dejaron libre las anteriores de la misma semana y del mismo mes. Lo que
// pasa del tope se cobra sin descuento. Si la carga tiene el reintegro real
// cargado a mano, manda ese.
function calcular(excluirId) {
  const uso = {};
  const detalle = {};
  datos.cargas.slice().sort(ordenCargas).forEach(c => {
    if (c.id === excluirId) return;
    const p = promoPorId(c.promoId);
    const manual = c.reintegro != null && c.reintegro !== '';
    if (!p) {
      // Promo borrada (p. ej. Ueno): si la carga tiene el reintegro fijado,
      // se sigue contando ese ahorro.
      detalle[c.id] = manual
        ? { ahorro: Number(c.reintegro), teorico: 0, manual, estado: 'manual' }
        : { ahorro: 0, teorico: 0, estado: c.promoId ? 'borrada' : 'sin' };
      return;
    }
    const corre = correEnFecha(p, c.fecha);
    const teorico = Math.round(c.monto * pctDe(p));
    const ahorro = manual ? Number(c.reintegro) : corre ? Math.round(Math.min(teorico, espacioLibre(p, c.fecha, uso))) : 0;
    consumir(p, c.fecha, uso, ahorro);
    detalle[c.id] = {
      ahorro, teorico, manual,
      estado: manual ? 'manual' : !corre ? 'noaplica' : ahorro < teorico ? 'topada' : 'ok',
    };
  });
  return { uso, detalle };
}

// Opciones para cargar `monto` en `fecha`: cada promo disponible con lo que
// devolveria respetando lo que ya se uso de sus topes. Sin monto no hay ahorro
// que calcular (queda en null): se ordena por porcentaje entre las que todavia
// tienen lugar en el tope.
function opcionesPara(fecha, monto, excluirId) {
  const { uso } = calcular(excluirId);
  const opciones = datos.promos.filter(p => disponible(p, fecha)).map(p => {
    const libre = espacioLibre(p, fecha, uso);
    const conLugar = libre > 0;
    if (!monto) return { p, teorico: null, ahorro: null, conLugar, completo: conLugar };
    const teorico = Math.round(monto * pctDe(p));
    const ahorro = Math.round(Math.min(teorico, libre));
    return { p, teorico, ahorro, conLugar, completo: teorico > 0 && ahorro >= teorico };
  });
  const valor = o => (o.ahorro != null ? o.ahorro : o.conLugar ? o.p.pct : 0);
  opciones.sort((a, b) => valor(b) - valor(a) || ordenPrioridad(a.p) - ordenPrioridad(b.p) || b.p.pct - a.p.pct);
  return { opciones, uso };
}

// Gana el mayor ahorro (a igual ahorro, la de mejor prioridad: ya vienen ordenadas).
function recomendada(opciones) {
  return opciones.find(o => (o.ahorro != null ? o.ahorro > 0 : o.conLugar)) || null;
}

// El uso se lleva en reintegro; para mostrarlo se pasa a la unidad del tope.
function enUnidad(p, ahorro) { return p.tipoTope === 'reintegro' ? ahorro : ahorro / pctDe(p); }

function unidadTope(p) { return p.tipoTope === 'reintegro' ? ' de reintegro' : ' de compra'; }

// "semana: quedan ₲ 350.000 de compra", en la unidad en la que esta el tope.
function textoTopes(p, fecha, uso) {
  const u = uso[claveUso(p)] || { sem: {}, mes: {} };
  const partes = [];
  if (Number(p.topeSemanal)) {
    partes.push('semana: quedan ' + fmt(Math.max(0, p.topeSemanal - enUnidad(p, u.sem[lunesDe(fecha)] || 0))));
  }
  if (Number(p.topeMensual)) {
    partes.push('mes: quedan ' + fmt(Math.max(0, p.topeMensual - enUnidad(p, u.mes[claveMes(fecha)] || 0))));
  }
  if (!partes.length) return 'sin tope registrado';
  const comp = companerosDeTope(p);
  return partes.join(' · ') + unidadTope(p) +
    (comp.length ? ' (compartido con ' + comp.map(x => emblemasDe(x).join('/')).join(', ') + ')' : '');
}

// Lo que la promo todavia puede devolver en el mes `clave`, contando solo los
// dias desde `desde`: suma lo libre de cada semana con un dia de la promo y lo
// recorta con lo libre del mes. Con uso vacio y desde = dia 1 da el maximo del mes.
function potencial(p, clave, uso, desde) {
  const semanas = new Set();
  for (let iso = clave + '-01'; iso <= finDeMes(clave); iso = sumarDias(iso, 1)) {
    if (iso >= desde && correEnFecha(p, iso)) semanas.add(lunesDe(iso));
  }
  if (!semanas.size) return 0;
  const u = uso[claveUso(p)] || { sem: {}, mes: {} };
  const tSem = topeAhorro(p, p.topeSemanal);
  let total = Infinity;
  if (tSem !== Infinity) {
    total = 0;
    semanas.forEach(s => { total += Math.max(0, tSem - (u.sem[s] || 0)); });
  }
  const libreMes = topeAhorro(p, p.topeMensual) - (u.mes[clave] || 0);
  return Math.max(0, Math.min(total, libreMes));
}

function totalesRango(desde, hasta, detalle) {
  const t = { cargado: 0, ahorro: 0, cargas: 0 };
  datos.cargas.forEach(c => {
    if (c.fecha < desde || c.fecha > hasta) return;
    t.cargado += Number(c.monto) || 0;
    t.ahorro += detalle[c.id] ? detalle[c.id].ahorro : 0;
    t.cargas++;
  });
  return t;
}

// ---------- Estado de la UI ----------
let mesSel = claveMes(hoyISO());
let semSel = lunesDe(hoyISO());
let diaSelMes = null;
let editandoCarga = null;
let editandoPromo = null;
let promoElegida = null;  // promo que el usuario eligio a mano en el form
let diasPromoForm = [1];

const $ = id => document.getElementById(id);

// ---------- Tab Cargar ----------
function fechaCarga() { return $('c-fecha').value || hoyISO(); }

function montoCarga() { return montoDe($('c-monto')); }

function renderCargar() {
  const { uso, detalle } = calcular();
  const hoy = hoyISO();
  const mes = claveMes(hoy);
  const t = totalesRango(mes + '-01', finDeMes(mes), detalle);
  $('c-ahorro-mes').textContent = fmt(t.ahorro);
  $('c-cargado-mes').textContent = fmt(t.cargado);
  $('c-promos-hoy').textContent = String(datos.promos.filter(p => disponible(p, hoy)).length);

  renderOpciones();
  renderUltimas(detalle);
}

function renderOpciones() {
  const fecha = fechaCarga();
  const monto = montoCarga();
  const { opciones, uso } = opcionesPara(fecha, monto, editandoCarga);
  const rec = recomendada(opciones);
  const enPantalla = rec ? [rec].concat(opciones.filter(o => o !== rec)) : opciones;

  const habitual = datos.config.diasHabituales.includes(aFecha(fecha).getDay());
  $('c-dia-legible').textContent = fechaLegible(fecha, false) + ' · ' +
    (habitual ? 'día habitual de carga' : 'no es día habitual: sería una carga adicional') +
    (monto ? '' : '. Ingresá el monto para ver cuánto ahorrás.');

  const lista = $('c-opciones');
  lista.innerHTML = '';
  if (!opciones.length) {
    lista.appendChild(el('li', 'vacio', 'Ninguna promoción aplica este día. Mirá la pestaña Semana para ver el próximo día con descuento.'));
  }
  enPantalla.forEach(o => {
    const li = el('li', 'opcion' + (o === rec ? ' recomendada' : '') + (o.conLugar ? '' : ' agotada'));
    li.dataset.promo = o.p.id;

    const det = el('div', 'detalle');
    const titulo = el('span', 'titulo-opcion');
    titulo.textContent = o.p.nombre + ' ';
    if (o === rec) titulo.appendChild(el('span', 'chip recomendada', 'Recomendada'));
    det.appendChild(titulo);
    det.appendChild(el('small', null, o.p.tarjeta + ' · ' + o.p.emblemas));
    det.appendChild(el('small', null, textoTopes(o.p, fecha, uso)));
    if (!o.conLugar) {
      det.appendChild(el('small', 'aviso', 'Tope agotado: esta carga no tendría descuento.'));
    } else if (!o.completo) {
      det.appendChild(el('small', 'aviso', 'Llega al tope: descuenta solo ' + fmt(o.ahorro / pctDe(o.p)) + ' de la carga.'));
    }
    const vig = estadoVigencia(o.p);
    if (vig.clase === 'vence') det.appendChild(el('small', 'aviso', vig.texto));
    const ver = el('button', 'enlace ver-estaciones', '📍 Ver estaciones');
    ver.type = 'button';
    ver.dataset.emblema = emblemasDe(o.p)[0] || '';
    det.appendChild(ver);

    const der = el('div', 'opcion-monto');
    der.appendChild(el('strong', null, monto ? fmt(o.ahorro) : o.p.pct + '%'));
    der.appendChild(el('small', null, monto ? o.p.pct + '%' : 'descuento'));

    li.append(det, der);
    lista.appendChild(li);
  });

  renderSelectPromo(opciones, rec);
}

function renderSelectPromo(opciones, rec) {
  const select = $('c-promo');
  select.innerHTML = '';
  select.appendChild(new Option('Sin promoción', ''));
  opciones.forEach(o => select.appendChild(
    new Option(o.p.nombre + ' — ' + (o.ahorro != null ? fmt(o.ahorro) : o.p.pct + '%'), o.p.id)));

  // La promo de una carga en edicion puede no aplicar a la fecha nueva: se
  // ofrece igual para no perderla sin querer.
  if (promoElegida && !opciones.some(o => o.p.id === promoElegida)) {
    const p = promoPorId(promoElegida);
    if (p) select.appendChild(new Option(p.nombre + ' (no aplica este día)', p.id));
  }

  if (promoElegida !== null) select.value = promoElegida;
  else select.value = rec ? rec.p.id : '';
  renderEmblemas();
  renderEstimado();
}

function renderEmblemas() {
  const p = promoPorId($('c-promo').value);
  const dl = $('c-emblemas');
  dl.innerHTML = '';
  const nombres = p ? emblemasDe(p) : [];
  nombres.forEach(n => dl.appendChild(new Option(n, n)));
  const actual = $('c-emblema').value.trim();
  if (p && (!actual || !nombres.includes(actual))) $('c-emblema').value = nombres[0] || '';
}

function renderEstimado() {
  const caja = $('c-estimado');
  const monto = montoCarga();
  const p = promoPorId($('c-promo').value);
  const manual = $('c-reintegro').value ? montoDe($('c-reintegro')) : null;
  if (!monto) { caja.textContent = ''; return; }
  if (manual != null) {
    caja.textContent = 'Reintegro cargado a mano: ' + fmt(manual) + ' · costo efectivo ' + fmt(monto - manual);
    return;
  }
  if (!p) {
    caja.textContent = 'Sin promoción: ' + fmt(monto) + ' sin descuento.';
    return;
  }
  const { opciones } = opcionesPara(fechaCarga(), monto, editandoCarga);
  const o = opciones.find(x => x.p.id === p.id);
  const ahorro = o ? o.ahorro : 0;
  caja.textContent = 'Ahorro estimado: ' + fmt(ahorro) + ' · costo efectivo ' + fmt(monto - ahorro) +
    (o ? '' : ' (la promo no aplica este día)');
}

function itemCarga(c, det, conFecha) {
  const li = el('li');
  const p = promoPorId(c.promoId);

  const chip = el('span', 'chip ' + (det.ahorro > 0 ? 'con-promo' : 'sin-promo'),
    det.ahorro > 0 ? (p ? p.pct + '%' : 'Promo') : 'Sin');

  const d = el('div', 'detalle');
  d.appendChild(el('span', null, (conFecha ? fechaLegible(c.fecha, false) + ' · ' : '') + fmt(c.monto)));
  const partes = [];
  partes.push(p ? p.nombre : c.promoId ? 'Promo eliminada' : 'Sin promoción');
  if (c.emblema) partes.push(c.emblema);
  if (det.estado === 'topada') partes.push('llegó al tope');
  if (det.estado === 'noaplica') partes.push('la promo no corre ese día');
  if (det.estado === 'manual') partes.push('reintegro cargado a mano');
  if (c.nota) partes.push(c.nota);
  d.appendChild(el('small', null, partes.join(' · ')));

  const monto = el('span', 'monto ' + (det.ahorro > 0 ? 'positivo' : 'apagado'), det.ahorro > 0 ? '−' + fmt(det.ahorro) : '—');

  const acciones = el('div', 'acciones-item');
  const editar = el('button', 'icono', '✏');
  editar.type = 'button';
  editar.title = 'Editar';
  editar.addEventListener('click', () => cargarCargaEnForm(c));
  const borrar = el('button', 'icono borrar', '🗑');
  borrar.type = 'button';
  borrar.title = 'Eliminar';
  borrar.addEventListener('click', () => {
    if (!confirm('¿Eliminar la carga de ' + fmt(c.monto) + ' del ' + fechaCorta(c.fecha) + '?')) return;
    datos.cargas = datos.cargas.filter(x => x.id !== c.id);
    if (editandoCarga === c.id) limpiarFormCarga();
    guardar();
    renderTodo();
  });
  acciones.append(editar, borrar);

  li.append(chip, d, monto, acciones);
  return li;
}

function renderUltimas(detalle) {
  const lista = $('c-ultimas');
  lista.innerHTML = '';
  const ultimas = datos.cargas.slice().sort(ordenCargas).reverse().slice(0, 6);
  if (!ultimas.length) {
    lista.appendChild(el('li', 'vacio', 'Todavía no hay cargas registradas.'));
    return;
  }
  ultimas.forEach(c => lista.appendChild(itemCarga(c, detalle[c.id], true)));
}

function cargarCargaEnForm(c) {
  editandoCarga = c.id;
  promoElegida = c.promoId || '';
  $('carga-titulo').textContent = '✏ Editar carga';
  $('c-fecha').value = c.fecha;
  $('c-monto').value = formatoMiles(c.monto);
  $('c-emblema').value = c.emblema || '';
  $('c-reintegro').value = c.reintegro != null && c.reintegro !== '' ? formatoMiles(c.reintegro) : '';
  $('c-nota').value = c.nota || '';
  $('btn-cancelar-carga').hidden = false;
  irATab('cargar');
  renderCargar();
  $('form-carga').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limpiarFormCarga() {
  editandoCarga = null;
  promoElegida = null;
  $('carga-titulo').textContent = '➕ Registrar carga';
  $('c-monto').value = montoTexto(datos.config.montoHabitual);
  $('c-emblema').value = '';
  $('c-reintegro').value = '';
  $('c-nota').value = '';
  $('btn-cancelar-carga').hidden = true;
}

// ---------- Tab Mes ----------
function renderMes() {
  const { uso, detalle } = calcular();
  const hoy = hoyISO();
  const [anio, mes] = mesSel.split('-').map(Number);
  const inicio = mesSel + '-01';
  const fin = finDeMes(mesSel);
  $('mes-titulo').textContent = mesLegible(mesSel, true);

  const t = totalesRango(inicio, fin, detalle);
  $('m-cargado').textContent = fmt(t.cargado);
  $('m-ahorro').textContent = fmt(t.ahorro);
  $('m-pct').textContent = t.cargado ? fmtPct(t.ahorro / t.cargado) : '—';

  // Calendario
  const dow = $('cal-dow');
  dow.innerHTML = '';
  DIAS_SEMANA.forEach(d => dow.appendChild(el('span', null, d.corto)));

  const grilla = $('cal-grilla');
  grilla.innerHTML = '';
  const primerDow = new Date(anio, mes - 1, 1).getDay();
  for (let i = 0; i < (primerDow + 6) % 7; i++) grilla.appendChild(el('div', 'dia hueco'));

  const porDia = {};
  datos.cargas.forEach(c => {
    if (c.fecha < inicio || c.fecha > fin) return;
    const x = porDia[c.fecha] || (porDia[c.fecha] = { monto: 0, ahorro: 0 });
    x.monto += Number(c.monto) || 0;
    x.ahorro += detalle[c.id].ahorro;
  });

  for (let d = 1; d <= diasDelMes(anio, mes); d++) {
    const iso = mesSel + '-' + String(d).padStart(2, '0');
    const x = porDia[iso];
    const btn = el('button', 'dia');
    btn.type = 'button';
    btn.dataset.fecha = iso;
    if (x) btn.classList.add(x.ahorro > 0 ? 'con-promo' : 'sin-promo');
    else if (datos.config.diasHabituales.includes(aFecha(iso).getDay())) btn.classList.add('plan');
    if (iso > hoy && !x) btn.classList.add('futuro');
    if (iso === hoy) btn.classList.add('hoy');
    if (iso === diaSelMes) btn.classList.add('sel');
    btn.append(el('span', null, String(d)), el('span', 'marca', x ? fmtCorto(x.monto) : ' '));
    grilla.appendChild(btn);
  }

  renderBolsas(uso, detalle);
  renderCargasMes(detalle);
  renderResumenReintegros(detalle);
  renderHistorial(detalle);
}

function renderBolsas(uso, detalle) {
  const caja = $('m-bolsas');
  caja.innerHTML = '';
  const hoy = hoyISO();
  const inicio = mesSel + '-01';
  const fin = finDeMes(mesSel);
  const pasado = fin < hoy;
  $('m-nota-bolsas').textContent = pasado
    ? 'Máx. del mes = lo que cada promo podía devolver con sus topes. Sin usar = lo que quedó sobre la mesa.'
    : 'Máx. del mes = lo que cada promo puede devolver con sus topes. Queda = lo que todavía se puede aprovechar desde hoy.';

  // Ahorro por promo en el mes
  const ahorroPromo = {};
  datos.cargas.forEach(c => {
    if (c.fecha < inicio || c.fecha > fin || !c.promoId) return;
    ahorroPromo[c.promoId] = (ahorroPromo[c.promoId] || 0) + detalle[c.id].ahorro;
  });

  const promos = datos.promos
    .filter(p => ahorroPromo[p.id] || (p.activa !== false && potencial(p, mesSel, {}, inicio) > 0))
    .sort((a, b) => ordenPrioridad(a) - ordenPrioridad(b) || primerDia(a) - primerDia(b));

  if (!promos.length) {
    caja.appendChild(el('p', 'vacio', 'Ninguna promoción corre en este mes.'));
    return;
  }

  const lunesHoy = lunesDe(hoy);
  const semanaEnMes = hoy >= inicio && hoy <= fin;

  promos.forEach(p => {
    const ahorro = ahorroPromo[p.id] || 0;
    const maximo = potencial(p, mesSel, {}, inicio);
    const queda = pasado ? 0 : potencial(p, mesSel, uso, hoy > inicio ? hoy : inicio);

    const b = el('div', 'bolsa');
    const cab = el('div', 'bolsa-cab');
    cab.appendChild(el('strong', null, p.nombre));
    cab.appendChild(el('span', 'chip prio-' + p.prioridad, PRIORIDADES[p.prioridad].etiqueta));
    b.appendChild(cab);
    b.appendChild(el('small', null, diasTexto(p) + ' · ' + p.pct + '% · ' + p.tarjeta));

    if (maximo !== Infinity) {
      const barra = el('div', 'barra');
      const relleno = el('i');
      relleno.style.width = Math.min(100, maximo ? (ahorro / maximo) * 100 : 0) + '%';
      barra.appendChild(relleno);
      b.appendChild(barra);
    }

    const datosB = el('div', 'bolsa-datos');
    const dato = (etq, val, clase) => {
      const s = el('span', clase);
      s.append(etq + ' ', el('b', null, val));
      return s;
    };
    datosB.appendChild(dato('Ahorro', fmt(ahorro), 'verde'));
    datosB.appendChild(dato('Máx. del mes', maximo === Infinity ? 'sin tope' : fmt(maximo)));
    if (pasado) {
      if (maximo !== Infinity) datosB.appendChild(dato('Sin usar', fmt(Math.max(0, maximo - ahorro))));
    } else {
      datosB.appendChild(dato('Queda', queda === Infinity ? 'sin tope' : fmt(queda)));
    }
    b.appendChild(datosB);

    if (semanaEnMes && Number(p.topeSemanal) && correEnSemana(p, lunesHoy)) {
      const u = uso[claveUso(p)];
      const usado = enUnidad(p, (u && u.sem[lunesHoy]) || 0);
      b.appendChild(el('small', null, 'Esta semana: ' + fmt(usado) + ' de ' + fmt(p.topeSemanal) + unidadTope(p)));
    }
    const comp = companerosDeTope(p);
    if (comp.length) {
      b.appendChild(el('small', null, 'Tope compartido con ' + comp.map(x => x.nombre).join(', ') +
        ': el máximo y lo que queda son de todo el grupo.'));
    }
    const vig = estadoVigencia(p);
    if (vig.clase !== 'ok') b.appendChild(el('small', 'aviso', vig.texto));
    caja.appendChild(b);
  });
}

function primerDia(p) {
  const i = DIAS_SEMANA.findIndex(d => p.dias.includes(d.dow));
  return p.dias.length === 7 ? 99 : i;
}

function correEnSemana(p, lunes) {
  for (let i = 0; i < 7; i++) if (correEnFecha(p, sumarDias(lunes, i))) return true;
  return false;
}

function renderCargasMes(detalle) {
  const lista = $('m-cargas');
  lista.innerHTML = '';
  const inicio = diaSelMes || mesSel + '-01';
  const fin = diaSelMes || finDeMes(mesSel);
  $('m-lista-titulo').textContent = diaSelMes ? 'Cargas del ' + diaMes(diaSelMes) : 'Cargas del mes';

  const cargas = datos.cargas.filter(c => c.fecha >= inicio && c.fecha <= fin).sort(ordenCargas).reverse();
  $('m-lista-total').textContent = fmt(cargas.reduce((s, c) => s + (Number(c.monto) || 0), 0));

  if (!cargas.length) {
    lista.appendChild(el('li', 'vacio', diaSelMes ? 'Sin cargas este día.' : 'Sin cargas en ' + mesLegible(mesSel, false) + '.'));
  }
  cargas.forEach(c => lista.appendChild(itemCarga(c, detalle[c.id], !diaSelMes)));

  if (diaSelMes) {
    const li = el('li');
    const btn = el('button', 'btn gris', '➕ Registrar carga el ' + diaMes(diaSelMes));
    btn.type = 'button';
    btn.addEventListener('click', () => {
      limpiarFormCarga();
      $('c-fecha').value = diaSelMes;
      irATab('cargar');
      renderCargar();
    });
    li.appendChild(btn);
    lista.appendChild(li);
  }
}

function renderHistorial(detalle) {
  const caja = $('m-historial');
  caja.innerHTML = '';
  if (!datos.cargas.length) {
    caja.appendChild(el('p', 'vacio', 'Todavía no hay cargas.'));
    return;
  }
  const ordenadas = datos.cargas.slice().sort(ordenCargas);
  const primero = claveMes(ordenadas[0].fecha);
  const ultimaCarga = claveMes(ordenadas[ordenadas.length - 1].fecha);
  const ultimo = ultimaCarga > claveMes(hoyISO()) ? ultimaCarga : claveMes(hoyISO());

  const env = el('div', 'envoltorio-tabla');
  const tab = el('table', 'tabla');
  tab.innerHTML = '<thead><tr><th>Mes</th><th>Cargas</th><th>Cargado</th><th>Ahorro</th><th>%</th></tr></thead>';
  const tbody = el('tbody');
  const total = { cargado: 0, ahorro: 0, cargas: 0 };
  const filas = [];
  for (let m = primero; m <= ultimo; m = mesSiguiente(m)) {
    const t = totalesRango(m + '-01', finDeMes(m), detalle);
    total.cargado += t.cargado; total.ahorro += t.ahorro; total.cargas += t.cargas;
    filas.push([m, t]);
  }
  filas.reverse().forEach(([m, t]) => {
    const tr = el('tr');
    tr.innerHTML = '<td>' + mesLegible(m, true) + '</td><td>' + t.cargas + '</td><td>' + fmt(t.cargado) +
      '</td><td class="cobrado">' + fmt(t.ahorro) + '</td><td>' + (t.cargado ? fmtPct(t.ahorro / t.cargado) : '—') + '</td>';
    tbody.appendChild(tr);
  });
  const tr = el('tr', 'total');
  tr.innerHTML = '<td>Total</td><td>' + total.cargas + '</td><td>' + fmt(total.cargado) + '</td><td class="cobrado">' +
    fmt(total.ahorro) + '</td><td>' + (total.cargado ? fmtPct(total.ahorro / total.cargado) : '—') + '</td>';
  tbody.appendChild(tr);
  tab.appendChild(tbody);
  env.appendChild(tab);
  caja.appendChild(env);
}

// ---------- Resumen de reintegros del mes ----------
// Banco de la carga, para agrupar los reintegros como llegan en los extractos.
const BANCOS = [['Itaú', /ita[uú]/i], ['GNB', /gnb|basa/i], ['FPJ', /fpj|pj financiera/i],
  ['Continental', /continental/i], ['Ueno', /ueno/i]];

function bancoDe(c) {
  const p = promoPorId(c.promoId);
  const texto = p ? p.tarjeta + ' ' + p.nombre : (c.promoId || '') + ' ' + (c.nota || '');
  const b = BANCOS.find(([, re]) => re.test(texto));
  if (b) return b[0];
  if (p) return p.tarjeta || p.nombre;
  return c.promoId ? 'Promo eliminada' : 'Sin promoción';
}

function renderResumenReintegros(detalle) {
  const inicio = mesSel + '-01';
  const fin = finDeMes(mesSel);
  const cargas = datos.cargas.filter(c => c.fecha >= inicio && c.fecha <= fin).sort(ordenCargas);
  const caja = $('m-resumen');
  caja.innerHTML = '';
  $('m-resumen-titulo').textContent = 'Reintegros de ' + mesLegible(mesSel, false);

  let real = 0, estimado = 0;
  cargas.forEach(c => {
    const d = detalle[c.id];
    if (d.ahorro > 0) { if (d.manual) real += d.ahorro; else estimado += d.ahorro; }
  });
  const minis = el('div', 'tarjetas-mini sin-margen');
  const mini = (etq, val, clase) => {
    const m = el('div', 'mini' + (clase ? ' ' + clase : ''));
    m.append(el('span', null, etq), el('strong', null, val));
    return m;
  };
  minis.append(mini('Reintegro total', fmt(real + estimado), 'neto'), mini('Confirmado', fmt(real)),
    mini('Por confirmar', fmt(estimado)));
  caja.appendChild(minis);

  if (!cargas.length) {
    caja.appendChild(el('p', 'vacio', 'Sin cargas en ' + mesLegible(mesSel, false) + '.'));
    return;
  }

  // Por banco
  const porBanco = {};
  cargas.forEach(c => {
    const b = bancoDe(c);
    const x = porBanco[b] || (porBanco[b] = { cargas: 0, cargado: 0, ahorro: 0, porConfirmar: 0 });
    const d = detalle[c.id];
    x.cargas++;
    x.cargado += Number(c.monto) || 0;
    x.ahorro += d.ahorro;
    if (d.ahorro > 0 && !d.manual) x.porConfirmar += d.ahorro;
  });
  caja.appendChild(el('h3', 'subtitulo', 'Por banco'));
  const tb = tablaCon(['Banco', 'Cargas', 'Reintegro', 'Por confirmar']);
  Object.keys(porBanco).sort((a, b) => porBanco[b].ahorro - porBanco[a].ahorro).forEach(b => {
    const x = porBanco[b];
    filaTabla(tb.tbody, [b, x.cargas, fmt(x.ahorro), x.porConfirmar ? fmt(x.porConfirmar) : '—'], 2);
  });
  const tot = cargas.reduce((s, c) => s + (Number(c.monto) || 0), 0);
  filaTabla(tb.tbody, ['Total', cargas.length, fmt(real + estimado), estimado ? fmt(estimado) : '—'], 2, 'total');
  caja.appendChild(tb.env);

  // Detalle de cada carga
  caja.appendChild(el('h3', 'subtitulo', 'Cargas'));
  const td = tablaCon(['Carga', 'Monto', 'Reintegro']);
  td.env.querySelector('table').classList.add('detalle-cargas');
  cargas.forEach(c => {
    const d = detalle[c.id];
    const marca = d.ahorro > 0 ? (d.manual ? ' ✓' : ' ~') : '';
    filaTabla(td.tbody, [fechaCorta(c.fecha).slice(0, 5) + ' · ' + bancoDe(c) + (c.emblema ? ' · ' + c.emblema : ''),
      fmt(c.monto), d.ahorro > 0 ? fmt(d.ahorro) + marca : '—'], 2);
  });
  filaTabla(td.tbody, ['Total', fmt(tot), fmt(real + estimado)], 2, 'total');
  caja.appendChild(td.env);
  caja.appendChild(el('p', 'vacio', 'Costo neto del mes: ' + fmt(tot - real - estimado) + ' (' +
    (tot ? fmtPct((real + estimado) / tot) : '0%') + ' de ahorro).'));
  caja.appendChild(el('p', 'vacio', '✓ reintegro real (cargado a mano al verlo en el extracto) · ~ estimado por la app. ' +
    'Para confirmar uno, editá la carga y completá "Reintegro real".'));
}

function tablaCon(columnas) {
  const env = el('div', 'envoltorio-tabla');
  const tab = el('table', 'tabla');
  const thead = el('thead');
  const tr = el('tr');
  columnas.forEach(c => tr.appendChild(el('th', null, c)));
  thead.appendChild(tr);
  const tbody = el('tbody');
  tab.append(thead, tbody);
  env.appendChild(tab);
  return { env, tbody };
}

// `verde`: indice de la columna que va en verde (el reintegro).
function filaTabla(tbody, valores, verde, clase) {
  const tr = el('tr', clase || null);
  valores.forEach((v, i) => tr.appendChild(el('td', i === verde ? 'cobrado' : null, String(v))));
  tbody.appendChild(tr);
}

// ---------- Tab Semana ----------
function renderSemana() {
  const { detalle } = calcular();
  const hoy = hoyISO();
  const domingo = sumarDias(semSel, 6);
  $('sem-titulo').textContent = 'Semana del ' + (claveMes(semSel) === claveMes(domingo)
    ? aFecha(semSel).getDate() : diaMes(semSel)) + ' al ' + diaMes(domingo);

  const monto = Number(datos.config.montoHabitual) || 0;
  let plan = 0, esperado = 0;
  const caja = $('s-dias');
  caja.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const iso = sumarDias(semSel, i);
    const dow = aFecha(iso).getDay();
    const habitual = datos.config.diasHabituales.includes(dow);
    // Promos del dia, la mejor primero: prioridad y despues porcentaje.
    const delDia = datos.promos
      .filter(p => disponible(p, iso))
      .sort((a, b) => ordenPrioridad(a) - ordenPrioridad(b) || b.pct - a.pct);
    const mejor = delDia[0] || null;
    if (habitual) {
      plan += monto;
      if (mejor) esperado += Math.min(Math.round(monto * pctDe(mejor)), topeAhorro(mejor, mejor.topeSemanal), topeAhorro(mejor, mejor.topeMensual));
    }

    const tarjeta = el('div', 'tarjeta dia-plan' + (iso === hoy ? ' es-hoy' : '') + (habitual ? '' : ' no-habitual'));
    const cab = el('h2', 'con-total');
    cab.appendChild(el('span', null, nombreDia(iso) + ' ' + aFecha(iso).getDate()));
    cab.appendChild(el('strong', habitual ? '' : 'apagado',
      habitual ? (monto ? 'Carga ' + fmt(monto) : 'Día de carga') : 'Sin carga fija'));
    tarjeta.appendChild(cab);

    const ul = el('ul', 'lista compacta');
    if (!delDia.length) {
      ul.appendChild(el('li', 'vacio', 'Sin promociones este día.'));
    }
    delDia.forEach((p, j) => {
      const li = el('li');
      li.appendChild(el('span', 'chip prio-' + p.prioridad, j === 0 ? '★ ' + PRIORIDADES[p.prioridad].etiqueta : PRIORIDADES[p.prioridad].etiqueta));
      const d = el('div', 'detalle');
      d.appendChild(el('span', null, p.nombre + ' ' + p.pct + '%'));
      const extra = [p.tarjeta];
      const vig = estadoVigencia(p);
      if (vig.clase === 'vence') extra.push(vig.texto.toLowerCase());
      d.appendChild(el('small', null, extra.join(' · ')));
      li.appendChild(d);
      ul.appendChild(li);
    });
    tarjeta.appendChild(ul);

    const cargas = datos.cargas.filter(c => c.fecha === iso).sort(ordenCargas);
    cargas.forEach(c => {
      const p = promoPorId(c.promoId);
      tarjeta.appendChild(el('p', 'hecho', '✓ Cargado ' + fmt(c.monto) + ' con ' + (p ? p.nombre : 'sin promoción') +
        ' · ahorro ' + fmt(detalle[c.id].ahorro)));
    });
    if (!cargas.length && habitual && iso < hoy) tarjeta.appendChild(el('p', 'falta', 'Sin carga registrada.'));
    caja.appendChild(tarjeta);
  }

  const real = totalesRango(semSel, domingo, detalle).ahorro;
  // Sin carga habitual no hay plan en plata: solo los dias.
  $('s-plan').textContent = monto ? fmt(plan) : '—';
  $('s-esperado').textContent = monto ? fmt(esperado) : '—';
  $('s-real').textContent = fmt(real);

}

// ---------- Tab Promos ----------
function renderBotonesDias(caja, activos, alCambiar) {
  caja.innerHTML = '';
  DIAS_SEMANA.forEach(d => {
    const b = el('button', activos.includes(d.dow) ? 'activo' : '', d.corto);
    b.type = 'button';
    b.addEventListener('click', () => {
      alCambiar(activos.includes(d.dow) ? activos.filter(x => x !== d.dow) : activos.concat(d.dow));
    });
    caja.appendChild(b);
  });
}

function renderDiasPromo() {
  renderBotonesDias($('p-dias'), diasPromoForm, nuevos => { diasPromoForm = nuevos; renderDiasPromo(); });
}

function renderConfig() {
  $('cfg-monto').value = montoTexto(datos.config.montoHabitual);
  renderBotonesDias($('cfg-dias'), datos.config.diasHabituales, nuevos => {
    datos.config.diasHabituales = nuevos.sort();
    guardar();
    renderTodo();
  });
}

function renderPromos() {
  const lista = $('lista-promos');
  lista.innerHTML = '';
  if (!datos.promos.length) {
    lista.appendChild(el('li', 'vacio', 'No hay promociones cargadas.'));
    return;
  }
  datos.promos.slice()
    .sort((a, b) => primerDia(a) - primerDia(b) || ordenPrioridad(a) - ordenPrioridad(b))
    .forEach(p => {
      const vig = estadoVigencia(p);
      const li = el('li', vig.clase === 'pausada' || vig.clase === 'vencida' ? 'apagada' : '');
      li.appendChild(el('span', 'chip prio-' + p.prioridad, p.pct + '%'));

      const d = el('div', 'detalle');
      d.appendChild(el('span', null, p.nombre));
      const topes = [];
      const unidad = p.tipoTope === 'reintegro' ? ' reint.' : '';
      if (Number(p.topeSemanal)) topes.push(fmt(p.topeSemanal) + '/sem' + unidad);
      if (Number(p.topeMensual)) topes.push(fmt(p.topeMensual) + '/mes' + unidad);
      d.appendChild(el('small', null, diasTexto(p) + ' · ' + PRIORIDADES[p.prioridad].etiqueta + ' · ' +
        (topes.length ? 'tope ' + topes.join(' + ') : 'sin tope registrado')));
      d.appendChild(el('small', null, p.tarjeta + ' · ' + p.emblemas));
      d.appendChild(el('small', 'vig-' + vig.clase, vig.texto));
      if (p.nota) d.appendChild(el('small', 'nota-promo', p.nota));

      const acciones = el('div', 'acciones-item');
      const editar = el('button', 'icono', '✏');
      editar.type = 'button';
      editar.title = 'Editar';
      editar.addEventListener('click', () => cargarPromoEnForm(p));
      const borrar = el('button', 'icono borrar', '🗑');
      borrar.type = 'button';
      borrar.title = 'Eliminar';
      borrar.addEventListener('click', () => {
        const usadas = datos.cargas.filter(c => c.promoId === p.id).length;
        const aviso = usadas
          ? '"' + p.nombre + '" tiene ' + usadas + ' cargas registradas, que quedarían sin ahorro. Para dejar de usarla conviene pausarla (destildar Activa). ¿Eliminar igual?'
          : '¿Eliminar "' + p.nombre + '"?';
        if (!confirm(aviso)) return;
        datos.promos = datos.promos.filter(x => x.id !== p.id);
        guardar();
        renderTodo();
      });
      acciones.append(editar, borrar);

      li.append(d, acciones);
      lista.appendChild(li);
    });
}

function cargarPromoEnForm(p) {
  editandoPromo = p.id;
  $('promo-titulo').textContent = '✏ Editar promoción';
  $('p-id').value = p.id;
  $('p-nombre').value = p.nombre;
  $('p-tarjeta').value = p.tarjeta || '';
  $('p-emblemas').value = p.emblemas || '';
  $('p-pct').value = p.pct;
  $('p-prioridad').value = p.prioridad;
  $('p-tope-sem').value = Number(p.topeSemanal) ? formatoMiles(p.topeSemanal) : '';
  $('p-tope-mes').value = Number(p.topeMensual) ? formatoMiles(p.topeMensual) : '';
  $('p-tipo-tope').value = p.tipoTope || 'compra';
  $('p-grupo').value = p.grupoTope || '';
  $('p-desde').value = p.desde || '';
  $('p-hasta').value = p.hasta || '';
  $('p-nota').value = p.nota || '';
  $('p-activa').checked = p.activa !== false;
  diasPromoForm = p.dias.slice();
  renderDiasPromo();
  $('btn-cancelar-promo').hidden = false;
  $('form-promo').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limpiarFormPromo() {
  editandoPromo = null;
  $('promo-titulo').textContent = '➕ Nueva promoción';
  $('form-promo').reset();
  $('p-activa').checked = true;
  diasPromoForm = [1];
  renderDiasPromo();
  $('btn-cancelar-promo').hidden = true;
}

// ---------- Tab Estaciones ----------
let emblemaSel = null;

// Emblemas de las promos que no vencieron (incluye las pausadas: la info de
// estaciones sirve igual).
function emblemasConPromo() {
  const hoy = hoyISO();
  const set = new Set();
  datos.promos.filter(p => !p.hasta || p.hasta >= hoy).forEach(p => emblemasDe(p).forEach(e => set.add(e)));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

function promosDeEmblema(emblema) {
  const hoy = hoyISO();
  return datos.promos
    .filter(p => (!p.hasta || p.hasta >= hoy) && emblemasDe(p).includes(emblema))
    .sort((a, b) => (a.activa === false) - (b.activa === false) || primerDia(a) - primerDia(b) || ordenPrioridad(a) - ordenPrioridad(b));
}

function estacionesDe(p) { return (typeof ESTACIONES !== 'undefined' && ESTACIONES[p.id]) || null; }

// Proxima fecha (desde hoy, hasta 6 semanas) en que la promo se puede usar.
function proximoDia(p) {
  let iso = hoyISO();
  for (let i = 0; i < 42; i++, iso = sumarDias(iso, 1)) if (disponible(p, iso)) return iso;
  return null;
}

function urlMapa(partes) {
  return 'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(partes.filter(Boolean).concat('Paraguay').join(', '));
}

function sinTildes(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

function irAEstaciones(emblema) {
  if (emblema) emblemaSel = emblema;
  irATab('estaciones');
  renderEstaciones();
}

function renderEstaciones() {
  const emblemas = emblemasConPromo();
  if (!emblemas.includes(emblemaSel)) emblemaSel = emblemas[0] || null;

  const selE = $('e-emblema');
  selE.innerHTML = '';
  emblemas.forEach(e => selE.appendChild(new Option(e, e)));
  if (emblemaSel) selE.value = emblemaSel;

  const promos = emblemaSel ? promosDeEmblema(emblemaSel) : [];

  // Ciudades de todas las listas del emblema; la elegida se recuerda.
  const ciudades = new Set();
  promos.forEach(p => (estacionesDe(p) || []).forEach(r => ciudades.add(r[0])));
  const selC = $('e-ciudad');
  selC.innerHTML = '';
  selC.appendChild(new Option('Todas', ''));
  Array.from(ciudades).sort((a, b) => a.localeCompare(b, 'es')).forEach(c => selC.appendChild(new Option(c, c)));
  const ciudad = ciudades.has(datos.config.ciudadEstaciones) ? datos.config.ciudadEstaciones : '';
  selC.value = ciudad;
  const busca = sinTildes($('e-buscar').value.trim());

  renderPromosEmblema(promos);

  const caja = $('e-listas');
  caja.innerHTML = '';
  if (!emblemaSel) {
    caja.appendChild(el('p', 'vacio', 'No hay promociones vigentes cargadas.'));
    return;
  }
  const listasVistas = new Set();
  promos.forEach(p => {
    const filas = estacionesDe(p);
    if (filas && listasVistas.has(filas)) return;
    if (filas) listasVistas.add(filas);
    // Promos del emblema que comparten esta misma lista (p. ej. Itaú lunes y jueves).
    const titulo = filas ? promos.filter(x => estacionesDe(x) === filas).map(x => x.nombre).join(' · ') : p.nombre;
    const t = el('div', 'tarjeta');
    if (!filas) {
      t.appendChild(el('h2', null, titulo));
      t.appendChild(el('p', 'vacio', 'No hay lista de estaciones adheridas cargada para esta promo.'));
      // Sin lista: busqueda del emblema en el mapa, en la ciudad guardada.
      const ciudadMapa = ciudad || datos.config.ciudadEstaciones;
      const a = el('a', 'btn gris', '📍 Buscar ' + emblemaSel + ' en ' + (ciudadMapa || 'el mapa'));
      a.href = urlMapa([emblemaSel, ciudadMapa]);
      a.target = '_blank';
      a.rel = 'noopener';
      t.appendChild(a);
      caja.appendChild(t);
      return;
    }
    const visibles = filas.filter(r => (!ciudad || r[0] === ciudad) &&
      (!busca || sinTildes(r.join(' ')).includes(busca)));
    const cab = el('h2', 'con-total');
    cab.appendChild(el('span', null, titulo));
    cab.appendChild(el('strong', null, visibles.length + (visibles.length === filas.length ? '' : ' de ' + filas.length)));
    t.appendChild(cab);
    if (ESTACIONES_INCOMPLETAS[p.id]) t.appendChild(el('p', 'vacio nota aviso', ESTACIONES_INCOMPLETAS[p.id]));

    const ul = el('ul', 'lista compacta');
    if (!visibles.length) ul.appendChild(el('li', 'vacio', 'Ninguna estación adherida' + (ciudad ? ' en ' + ciudad : '') + '.'));
    visibles.forEach(([ciu, nombre, dir]) => {
      const li = el('li');
      const d = el('div', 'detalle');
      d.appendChild(el('span', null, nombre || dir));
      d.appendChild(el('small', null, (nombre ? dir + ' · ' : '') + ciu));
      const a = el('a', 'btn-mapa', '📍 Mapa');
      a.href = urlMapa([emblemaSel, dir, ciu]);
      a.target = '_blank';
      a.rel = 'noopener';
      li.append(d, a);
      ul.appendChild(li);
    });
    t.appendChild(ul);
    caja.appendChild(t);
  });
}

function renderPromosEmblema(promos) {
  const ul = $('e-promos');
  ul.innerHTML = '';
  if (!promos.length) {
    ul.appendChild(el('li', 'vacio', 'Sin promociones para este emblema.'));
    return;
  }
  const { uso } = calcular();
  promos.forEach(p => {
    const vig = estadoVigencia(p);
    const li = el('li', vig.clase === 'pausada' ? 'apagada' : '');
    li.appendChild(el('span', 'chip prio-' + p.prioridad, p.pct + '%'));
    const d = el('div', 'detalle');
    d.appendChild(el('span', null, p.nombre));
    d.appendChild(el('small', null, diasTexto(p) + ' · ' + p.tarjeta));
    const prox = p.activa === false ? null : proximoDia(p);
    d.appendChild(el('small', null, textoTopes(p, prox || hoyISO(), uso)));
    if (prox) d.appendChild(el('small', null, 'Próximo día: ' + (prox === hoyISO() ? 'hoy' : fechaLegible(prox, false))));
    d.appendChild(el('small', 'vig-' + vig.clase, vig.texto));
    li.appendChild(d);
    ul.appendChild(li);
  });
}

// ---------- Exportar ----------
// Sin rango exporta todas las cargas; con rango, solo las de ese periodo.
function filasCSV(desde, hasta) {
  const { detalle } = calcular();
  const limpiar = s => String(s || '').replace(/;/g, ',');
  const filas = [['fecha', 'dia', 'monto', 'ahorro', 'costo_efectivo', 'promocion', 'banco', 'tarjeta', 'emblema',
    'reintegro', 'nota']];
  datos.cargas.slice().sort(ordenCargas).forEach(c => {
    if ((desde && c.fecha < desde) || (hasta && c.fecha > hasta)) return;
    const p = promoPorId(c.promoId);
    const det = detalle[c.id];
    filas.push([c.fecha, nombreDia(c.fecha), c.monto, det.ahorro, c.monto - det.ahorro,
      limpiar(p ? p.nombre : ''), limpiar(bancoDe(c)), limpiar(p ? p.tarjeta : ''), limpiar(c.emblema),
      det.ahorro > 0 ? (det.manual ? 'real' : 'estimado') : '', limpiar(c.nota)]);
  });
  return filas.map(f => f.join(';')).join('\r\n');
}

// ---------- Navegacion entre tabs ----------
function irATab(nombre) {
  document.querySelectorAll('.nav-inferior button').forEach(b => b.classList.toggle('activa', b.dataset.tab === nombre));
  document.querySelectorAll('main .tab').forEach(t => t.classList.toggle('activa', t.id === 'tab-' + nombre));
  window.scrollTo({ top: 0 });
}

document.querySelector('.nav-inferior').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (btn) irATab(btn.dataset.tab);
});

// ---------- Importar de Ganancias Conductor ----------
// La app Ganancias (roogpy/conductor-app) guarda en localStorage, bajo
// GANANCIAS_KEY, un array de registros; los gastos de combustible son
// { tipo: 'gasto', categoria: 'combustible', fecha, monto, nota }.
// Publicadas las dos en roogpy.github.io comparten origen, asi que se leen
// directo. Si no (otro navegador, iPhone con la app instalada), se usa el CSV
// que exporta Ganancias: "fecha","tipo","plataforma_o_categoria","monto_gs","viajes","nota".
const GANANCIAS_KEY = 'conductor-registros-v1';
const EMBLEMAS_CONOCIDOS = ['Shell', 'Petrobras', 'Copetrol', 'Petrosur', 'Petrochaco', 'Petromax', 'Energy',
  'Compasa', 'Petropar', 'Puma', 'Enex', 'Esso', 'Monday'];

let ganPendientes = [];  // filas de la vista previa

function leerGananciasLocal() {
  let regs;
  try { regs = JSON.parse(localStorage.getItem(GANANCIAS_KEY)); } catch (e) { regs = null; }
  if (!Array.isArray(regs)) return null;
  return regs
    .filter(r => r && r.tipo === 'gasto' && r.categoria === 'combustible' && r.fecha && Number(r.monto) > 0)
    .map(r => ({ fecha: r.fecha, monto: Math.round(Number(r.monto)), nota: r.nota || '' }));
}

// CSV con comillas dobles y separador coma (o punto y coma si lo abrio Excel).
function parsearCSV(texto) {
  texto = texto.replace(/^﻿/, '');
  const sep = (texto.split(/\r?\n/)[0].match(/;/g) || []).length > (texto.split(/\r?\n/)[0].match(/,/g) || []).length ? ';' : ',';
  const filas = [];
  let fila = [], campo = '', comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += ch;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter(f => f.some(c => c.trim()));
}

function leerGananciasCSV(texto) {
  const filas = parsearCSV(texto);
  if (!filas.length) return null;
  const cab = filas[0].map(c => sinTildes(c.trim()));
  const col = n => cab.indexOf(n);
  const iF = col('fecha'), iT = col('tipo'), iC = col('plataforma_o_categoria'), iM = col('monto_gs'), iN = col('nota');
  if (iF < 0 || iT < 0 || iC < 0 || iM < 0) return null;
  return filas.slice(1)
    .filter(f => sinTildes(f[iT] || '') === 'gasto' && sinTildes(f[iC] || '') === 'combustible')
    .map(f => ({ fecha: (f[iF] || '').trim(), monto: Number(String(f[iM]).replace(/\D/g, '')), nota: iN >= 0 ? (f[iN] || '').trim() : '' }))
    .filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) && r.monto > 0);
}

// Clave estable del gasto: la misma venga de localStorage o del CSV, asi no
// se importa dos veces. El contador separa dos cargas iguales el mismo dia.
function conClaves(gastos) {
  const vistos = {};
  return gastos.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map(g => {
    const base = g.fecha + '|' + g.monto + '|' + g.nota;
    vistos[base] = (vistos[base] || 0) + 1;
    return Object.assign({}, g, { clave: 'ganancias:' + base + '|' + vistos[base] });
  });
}

function emblemaEnNota(nota) {
  const n = sinTildes(nota);
  const todos = new Set(EMBLEMAS_CONOCIDOS);
  datos.promos.forEach(p => emblemasDe(p).forEach(e => todos.add(e)));
  return Array.from(todos).find(e => n.includes(sinTildes(e))) || '';
}

// Promo sugerida: la que la app recomendaria ese dia para ese monto, limitada
// al emblema si la nota lo menciona. Es una sugerencia: Ganancias no guarda
// con que tarjeta se pago.
function sugerirPromo(fecha, monto, emblema) {
  let { opciones } = opcionesPara(fecha, monto);
  if (emblema) opciones = opciones.filter(o => emblemasDe(o.p).includes(emblema));
  const rec = recomendada(opciones);
  return rec ? rec.p.id : '';
}

function prepararImportacion(gastos, origen) {
  const yaImportadas = new Set(datos.cargas.map(c => c.origen).filter(Boolean));
  const nuevas = conClaves(gastos).filter(g => !yaImportadas.has(g.clave));
  ganPendientes = nuevas.map(g => {
    const emblema = emblemaEnNota(g.nota);
    // Ya cargada a mano en esta app: misma fecha y monto, sin origen.
    const duplicada = datos.cargas.some(c => !c.origen && c.fecha === g.fecha && Number(c.monto) === g.monto);
    return Object.assign(g, { emblema, promoId: sugerirPromo(g.fecha, g.monto, emblema), elegida: !duplicada, duplicada });
  });
  const total = gastos.length;
  $('gan-resumen').textContent = origen + ': ' + total + (total === 1 ? ' carga de combustible' : ' cargas de combustible') +
    (total - nuevas.length ? ', ' + (total - nuevas.length) + ' ya importadas' : '') +
    (nuevas.length ? '. La promo de cada una es una sugerencia (Ganancias no guarda la tarjeta): revisala antes de importar.' : '. No hay nada nuevo para importar.');
  $('gan-panel').hidden = false;
  renderGanancias();
}

function renderGanancias() {
  const ul = $('gan-lista');
  ul.innerHTML = '';
  ganPendientes.forEach((g, i) => {
    const li = el('li', 'gan-fila' + (g.elegida ? '' : ' apagada'));
    const check = el('input');
    check.type = 'checkbox';
    check.checked = g.elegida;
    check.addEventListener('change', () => { g.elegida = check.checked; renderGanancias(); });

    const d = el('div', 'detalle');
    d.appendChild(el('span', null, fechaLegible(g.fecha, false) + ' · ' + fmt(g.monto)));
    const extra = [];
    if (g.nota) extra.push(g.nota);
    if (g.emblema) extra.push('emblema: ' + g.emblema);
    if (extra.length) d.appendChild(el('small', null, extra.join(' · ')));
    if (g.duplicada) d.appendChild(el('small', 'aviso', 'Ya hay una carga igual ese día: puede ser la misma.'));

    const sel = el('select', 'gan-promo');
    sel.appendChild(new Option('Sin promoción', ''));
    const { opciones } = opcionesPara(g.fecha, g.monto);
    opciones.forEach(o => sel.appendChild(new Option(o.p.nombre + ' — ' + fmt(o.ahorro), o.p.id)));
    sel.value = g.promoId;
    sel.addEventListener('change', () => { g.promoId = sel.value; });
    d.appendChild(sel);

    li.append(check, d);
    ul.appendChild(li);
  });
  const n = ganPendientes.filter(g => g.elegida).length;
  $('btn-gan-importar').disabled = !n;
  $('btn-gan-importar').textContent = n ? 'Importar ' + n + (n === 1 ? ' carga' : ' cargas') : 'Importar seleccionadas';
}

function importarGanancias() {
  const elegidas = ganPendientes.filter(g => g.elegida);
  if (!elegidas.length) return;
  elegidas.forEach((g, i) => {
    const p = promoPorId(g.promoId);
    datos.cargas.push({
      id: 'g' + Date.now() + '-' + i,
      fecha: g.fecha,
      monto: g.monto,
      promoId: g.promoId || null,
      emblema: g.emblema || (p ? emblemasDe(p)[0] || '' : ''),
      reintegro: null,
      nota: g.nota ? 'Ganancias · ' + g.nota : 'Ganancias',
      origen: g.clave,
    });
  });
  guardar();
  ganPendientes = [];
  $('gan-panel').hidden = true;
  mesSel = claveMes(elegidas[elegidas.length - 1].fecha);
  renderTodo();
  alert('Importadas ' + elegidas.length + (elegidas.length === 1 ? ' carga.' : ' cargas.'));
}

$('btn-gan-buscar').addEventListener('click', () => {
  const gastos = leerGananciasLocal();
  if (gastos === null) {
    alert('No encontré datos de Ganancias en este navegador. Abrí Ganancias, exportá el CSV del mes y elegilo con "Elegir CSV".');
    return;
  }
  prepararImportacion(gastos, 'Ganancias');
});

$('btn-gan-csv').addEventListener('click', () => $('archivo-gan').click());

$('archivo-gan').addEventListener('change', e => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = () => {
    const gastos = leerGananciasCSV(String(lector.result));
    if (gastos === null) alert('El archivo no parece un CSV exportado de Ganancias.');
    else prepararImportacion(gastos, 'CSV ' + archivo.name);
  };
  lector.readAsText(archivo, 'utf-8');
  e.target.value = '';
});

$('btn-gan-importar').addEventListener('click', importarGanancias);
$('btn-gan-cerrar').addEventListener('click', () => { ganPendientes = []; $('gan-panel').hidden = true; });

// ---------- Eventos: Cargar ----------
$('c-fecha').addEventListener('change', () => {
  if (!editandoCarga) promoElegida = null;
  renderOpciones();
});

$('c-monto').addEventListener('input', () => renderOpciones());

$('c-opciones').addEventListener('click', e => {
  const ver = e.target.closest('.ver-estaciones');
  if (ver) { irAEstaciones(ver.dataset.emblema); return; }
  const li = e.target.closest('.opcion');
  if (!li) return;
  promoElegida = li.dataset.promo;
  $('c-promo').value = promoElegida;
  renderEmblemas();
  renderEstimado();
  $('form-carga').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('c-promo').addEventListener('change', e => {
  promoElegida = e.target.value;
  renderEmblemas();
  renderEstimado();
});

$('c-reintegro').addEventListener('input', renderEstimado);

$('form-carga').addEventListener('submit', e => {
  e.preventDefault();
  const monto = montoCarga();
  const fecha = $('c-fecha').value;
  // El monto esta en la tarjeta de arriba, fuera del form: se valida a mano.
  if (!monto) { alert('Ingresá el monto de la carga.'); $('c-monto').focus(); return; }
  if (!fecha) return;

  const c = {
    id: editandoCarga || ('c' + Date.now()),
    fecha,
    monto,
    promoId: $('c-promo').value || null,
    emblema: $('c-emblema').value.trim(),
    reintegro: $('c-reintegro').value ? montoDe($('c-reintegro')) : null,
    nota: $('c-nota').value.trim(),
  };
  // Una carga importada conserva su origen al editarla (evita reimportarla).
  const previa = editandoCarga && datos.cargas.find(x => x.id === editandoCarga);
  if (previa && previa.origen) c.origen = previa.origen;
  if (editandoCarga) datos.cargas = datos.cargas.map(x => (x.id === editandoCarga ? c : x));
  else datos.cargas.push(c);
  guardar();
  mesSel = claveMes(fecha);
  limpiarFormCarga();
  renderTodo();
});

$('btn-cancelar-carga').addEventListener('click', () => {
  limpiarFormCarga();
  renderCargar();
});

// ---------- Eventos: Mes y Semana ----------
$('mes-prev').addEventListener('click', () => { mesSel = mesAnterior(mesSel); diaSelMes = null; renderMes(); });
$('mes-next').addEventListener('click', () => { mesSel = mesSiguiente(mesSel); diaSelMes = null; renderMes(); });

$('cal-grilla').addEventListener('click', e => {
  const btn = e.target.closest('.dia');
  if (!btn || btn.classList.contains('hueco')) return;
  diaSelMes = diaSelMes === btn.dataset.fecha ? null : btn.dataset.fecha;
  renderMes();
});

$('sem-prev').addEventListener('click', () => { semSel = sumarDias(semSel, -7); renderSemana(); });
$('sem-next').addEventListener('click', () => { semSel = sumarDias(semSel, 7); renderSemana(); });

// ---------- Eventos: Promos ----------
$('form-promo').addEventListener('submit', e => {
  e.preventDefault();
  if (!diasPromoForm.length) { alert('Elegí al menos un día en que aplica la promoción.'); return; }
  const p = {
    id: editandoPromo || ('p' + Date.now()),
    nombre: $('p-nombre').value.trim(),
    tarjeta: $('p-tarjeta').value.trim(),
    emblemas: $('p-emblemas').value.trim(),
    dias: diasPromoForm.slice().sort(),
    pct: Number($('p-pct').value),
    topeSemanal: montoDe($('p-tope-sem')),
    topeMensual: montoDe($('p-tope-mes')),
    tipoTope: $('p-tipo-tope').value,
    grupoTope: $('p-grupo').value.trim(),
    desde: $('p-desde').value,
    hasta: $('p-hasta').value,
    prioridad: $('p-prioridad').value,
    nota: $('p-nota').value.trim(),
    activa: $('p-activa').checked,
  };
  if (!p.nombre || !p.pct) return;
  if (p.desde && p.hasta && p.desde > p.hasta) { alert('La fecha "desde" es posterior a "hasta".'); return; }
  if (editandoPromo) datos.promos = datos.promos.map(x => (x.id === editandoPromo ? p : x));
  else datos.promos.push(p);
  guardar();
  limpiarFormPromo();
  renderTodo();
});

$('btn-cancelar-promo').addEventListener('click', limpiarFormPromo);

$('cfg-monto').addEventListener('change', () => {
  // Vacio = sin carga habitual: el monto de cada carga se escribe a mano.
  datos.config.montoHabitual = montoDe($('cfg-monto'));
  guardar();
  if (!editandoCarga) $('c-monto').value = montoTexto(datos.config.montoHabitual);
  renderTodo();
});

// ---------- Eventos: Estaciones ----------
$('e-emblema').addEventListener('change', e => { emblemaSel = e.target.value; renderEstaciones(); });

$('e-ciudad').addEventListener('change', e => {
  datos.config.ciudadEstaciones = e.target.value;
  guardar();
  renderEstaciones();
});

$('e-buscar').addEventListener('input', renderEstaciones);

// ---------- Eventos: respaldo ----------
$('btn-csv-mes').addEventListener('click', () => {
  descargar('combustibles-' + mesSel + '.csv', '\ufeff' + filasCSV(mesSel + '-01', finDeMes(mesSel)), 'text/csv;charset=utf-8');
});

$('btn-csv').addEventListener('click', () => {
  descargar('combustibles-cargas-' + hoyISO() + '.csv', '﻿' + filasCSV(), 'text/csv;charset=utf-8');
});

$('btn-exportar').addEventListener('click', () => {
  descargar('combustibles-respaldo-' + hoyISO() + '.json', JSON.stringify(datos, null, 2), 'application/json');
});

$('btn-importar').addEventListener('click', () => $('archivo-import').click());

$('archivo-import').addEventListener('change', e => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const nuevo = JSON.parse(lector.result);
      if (!nuevo || !Array.isArray(nuevo.promos)) throw new Error('formato');
      if (!confirm('Esto reemplaza los datos actuales por los del respaldo. ¿Seguir?')) return;
      datos = migrar(normalizar(nuevo));
      guardar();
      limpiarFormCarga();
      limpiarFormPromo();
      renderTodo();
      alert('Respaldo restaurado.');
    } catch (err) {
      alert('El archivo no parece un respaldo válido.');
    }
  };
  lector.readAsText(archivo);
  e.target.value = '';
});

[$('c-monto'), $('c-reintegro'), $('p-tope-sem'), $('p-tope-mes'), $('cfg-monto')].forEach(conSeparadorMiles);

// ---------- Inicializacion ----------
function renderTodo() {
  renderCargar();
  renderMes();
  renderSemana();
  renderPromos();
  renderConfig();
  renderEstaciones();
}

$('fecha-actual').textContent =
  new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
$('c-fecha').value = hoyISO();
$('c-monto').value = montoTexto(datos.config.montoHabitual);
renderDiasPromo();
renderTodo();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
