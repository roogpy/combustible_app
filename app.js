// ---------- Datos ----------
// Un solo objeto en localStorage:
//   promos -> cada promocion: tarjeta, emblemas, dias, %, topes y vigencia
//   cargas -> cada carga de combustible: fecha, monto y promo usada
//   config -> monto habitual por carga, dias en que se carga y la regla de Ueno
// El ahorro de cada carga NO se guarda: se recalcula recorriendo las cargas en
// orden de fecha, asi borrar o corregir una carga vieja reacomoda los topes de
// las siguientes.
const STORE_KEY = 'combustibles-datos-v1';

const PRIORIDADES = {
  principal: { etiqueta: 'Principal', orden: 0 },
  reserva: { etiqueta: 'Reserva', orden: 1 },
  alternativa: { etiqueta: 'Alternativa', orden: 2 },
  estrategica: { etiqueta: 'Estratégica', orden: 3 },
};

// Orden lunes -> domingo, con el indice que devuelve Date.getDay().
const DIAS_SEMANA = [
  { dow: 1, corto: 'L', largo: 'Lunes' }, { dow: 2, corto: 'M', largo: 'Martes' },
  { dow: 3, corto: 'X', largo: 'Miércoles' }, { dow: 4, corto: 'J', largo: 'Jueves' },
  { dow: 5, corto: 'V', largo: 'Viernes' }, { dow: 6, corto: 'S', largo: 'Sábado' },
  { dow: 0, corto: 'D', largo: 'Domingo' },
];
const TODOS_LOS_DIAS = [0, 1, 2, 3, 4, 5, 6];

const NOTA_UENO = 'Niveles Ueno: N1 10%/25k · N2 15%/50k · N3 25%/75k · N4 30%/125k · N5 40%/150k. ' +
  'Confirmar si el tope de 75.000 es de compra o de reintegro: cambia cuánto rinde la bolsa.';

// Promociones del contador de septiembre 2026 (Excel armado con ChatGPT),
// con la promo de Continental renovada para Petrobras y Copetrol.
const PROMOS_INICIALES = [
  { id: 'itau-shell', nombre: 'Itaú / Shell', tarjeta: 'TC Itaú', emblemas: 'Shell',
    dias: [1], pct: 20, topeSemanal: 0, topeMensual: 0, tipoTope: 'compra',
    desde: '', hasta: '2026-09-30', prioridad: 'principal', activa: true,
    nota: 'Tope no registrado: confirmalo con Itaú.' },
  { id: 'gnb-copetrol', nombre: 'GNB / Copetrol', tarjeta: 'GNB Mastercard Clásica + QR Copetrol Vamos', emblemas: 'Copetrol',
    dias: [1], pct: 20, topeSemanal: 0, topeMensual: 1000000, tipoTope: 'compra',
    desde: '2026-07-06', hasta: '2026-12-28', prioridad: 'reserva', activa: true, nota: '' },
  { id: 'gnb-petrochaco', nombre: 'GNB / Petrochaco', tarjeta: 'GNB Mastercard Clásica', emblemas: 'Petrochaco',
    dias: [2], pct: 20, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '2026-07-07', hasta: '2026-12-29', prioridad: 'reserva', activa: true, nota: '' },
  { id: 'gnb-petrobras', nombre: 'GNB / Petrobras', tarjeta: 'GNB Mastercard Clásica + app Premmia', emblemas: 'Petrobras',
    dias: [3], pct: 20, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '2026-07-01', hasta: '2026-12-30', prioridad: 'principal', activa: true, nota: '' },
  { id: 'fpj-petrosur', nombre: 'FPJ Clásica / Petrosur-Petrochaco', tarjeta: 'FPJ Clásica + POS Bancard', emblemas: 'Petrosur / Petrochaco',
    dias: [3], pct: 20, topeSemanal: 0, topeMensual: 200000, tipoTope: 'compra',
    desde: '', hasta: '2026-12-31', prioridad: 'alternativa', activa: true, nota: 'No acumulable.' },
  { id: 'gnb-petrosur', nombre: 'GNB / Petrosur', tarjeta: 'GNB Mastercard Clásica + app Petrosur', emblemas: 'Petrosur',
    dias: [5], pct: 20, topeSemanal: 0, topeMensual: 1000000, tipoTope: 'compra',
    desde: '2026-05-01', hasta: '2026-12-25', prioridad: 'reserva', activa: true, nota: '' },
  { id: 'continental-viernes', nombre: 'Continental / Petrobras-Copetrol', tarjeta: 'TC Continental (no Privilege) + POS Dinelco', emblemas: 'Petrobras / Copetrol',
    dias: [5], pct: 20, topeSemanal: 500000, topeMensual: 0, tipoTope: 'compra',
    desde: '', hasta: '', prioridad: 'principal', activa: true,
    nota: 'Renovada (confirmado el 11/09/2026). El tope semanal de 500.000 era el registrado para Petrobras: confirmar si aplica igual en Copetrol y si es compartido.' },
  { id: 'ueno-petropar', nombre: 'Ueno N3 / Petropar', tarjeta: 'Ueno Nivel 3', emblemas: 'Petropar',
    dias: TODOS_LOS_DIAS.slice(), pct: 25, topeSemanal: 0, topeMensual: 300000, tipoTope: 'compra',
    desde: '', hasta: '', prioridad: 'estrategica', activa: true, nota: NOTA_UENO },
  { id: 'ueno-otros', nombre: 'Ueno N3 / otros emblemas', tarjeta: 'Ueno Nivel 3', emblemas: 'Copetrol / ENEX / Petrobras / Petrochaco / Petromax / Puma',
    dias: TODOS_LOS_DIAS.slice(), pct: 25, topeSemanal: 75000, topeMensual: 300000, tipoTope: 'compra',
    desde: '', hasta: '', prioridad: 'estrategica', activa: true, nota: NOTA_UENO },
];

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
const CONFIG_INICIAL = { montoHabitual: 0, diasHabituales: [1, 3, 5], reservarBolsas: true };

function datosIniciales() {
  return {
    promos: PROMOS_INICIALES.map(p => Object.assign({}, p, { dias: p.dias.slice() })),
    cargas: CARGAS_INICIALES.map(c => Object.assign({}, c)),
    config: Object.assign({}, CONFIG_INICIAL, { diasHabituales: CONFIG_INICIAL.diasHabituales.slice() }),
  };
}

function normalizar(d) {
  return {
    promos: d.promos,
    cargas: Array.isArray(d.cargas) ? d.cargas : [],
    config: Object.assign({}, CONFIG_INICIAL, d.config || {}),
  };
}

let datos = null;
try {
  const guardado = JSON.parse(localStorage.getItem(STORE_KEY));
  if (guardado && Array.isArray(guardado.promos)) datos = normalizar(guardado);
} catch (e) { /* datos corruptos: se arranca con los iniciales */ }
if (!datos) {
  datos = datosIniciales();
  guardar();
}

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

function esBolsa(p) { return p.prioridad === 'estrategica'; }

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
  const u = uso[p.id] || { sem: {}, mes: {} };
  const sem = topeAhorro(p, p.topeSemanal) - (u.sem[lunesDe(iso)] || 0);
  const mes = topeAhorro(p, p.topeMensual) - (u.mes[claveMes(iso)] || 0);
  return Math.max(0, Math.min(sem, mes));
}

function consumir(p, iso, uso, ahorro) {
  if (!uso[p.id]) uso[p.id] = { sem: {}, mes: {} };
  const u = uso[p.id];
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
    if (!p) {
      detalle[c.id] = { ahorro: 0, teorico: 0, estado: c.promoId ? 'borrada' : 'sin' };
      return;
    }
    const manual = c.reintegro != null && c.reintegro !== '';
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

// La regla del contador: una bolsa estrategica (Ueno) no se gasta si la promo
// del dia cubre la carga completa. Sin esa regla gana el mayor ahorro.
function recomendada(opciones) {
  const conAhorro = opciones.filter(o => (o.ahorro != null ? o.ahorro > 0 : o.conLugar));
  if (!conAhorro.length) return null;
  if (datos.config.reservarBolsas) {
    const delDia = conAhorro.find(o => !esBolsa(o.p));
    if (delDia && delDia.completo) return delDia;
  }
  return conAhorro[0];
}

// El uso se lleva en reintegro; para mostrarlo se pasa a la unidad del tope.
function enUnidad(p, ahorro) { return p.tipoTope === 'reintegro' ? ahorro : ahorro / pctDe(p); }

function unidadTope(p) { return p.tipoTope === 'reintegro' ? ' de reintegro' : ' de compra'; }

// "semana: quedan ₲ 350.000 de compra", en la unidad en la que esta el tope.
function textoTopes(p, fecha, uso) {
  const u = uso[p.id] || { sem: {}, mes: {} };
  const partes = [];
  if (Number(p.topeSemanal)) {
    partes.push('semana: quedan ' + fmt(Math.max(0, p.topeSemanal - enUnidad(p, u.sem[lunesDe(fecha)] || 0))));
  }
  if (Number(p.topeMensual)) {
    partes.push('mes: quedan ' + fmt(Math.max(0, p.topeMensual - enUnidad(p, u.mes[claveMes(fecha)] || 0))));
  }
  if (!partes.length) return 'sin tope registrado';
  return partes.join(' · ') + unidadTope(p);
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
  const u = uso[p.id] || { sem: {}, mes: {} };
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

// Reintegro que todavia pueden dar las bolsas estrategicas en el mes en curso.
function uenoLibre(uso) {
  const hoy = hoyISO();
  return datos.promos
    .filter(p => esBolsa(p) && p.activa !== false)
    .reduce((s, p) => {
      const v = potencial(p, claveMes(hoy), uso, hoy);
      return s + (v === Infinity ? 0 : v);
    }, 0);
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
  $('c-ueno-libre').textContent = fmt(uenoLibre(uso));

  renderOpciones();
  renderUltimas(detalle);
}

function renderOpciones() {
  const fecha = fechaCarga();
  const monto = montoCarga();
  const { opciones, uso } = opcionesPara(fecha, monto, editandoCarga);
  const rec = recomendada(opciones);
  // La recomendada va arriba aunque una bolsa reservada devuelva mas.
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
    if (esBolsa(o.p) && o !== rec && datos.config.reservarBolsas && o.conLugar) {
      det.appendChild(el('small', 'aviso-suave', 'Bolsa estratégica: mejor guardarla para una carga adicional.'));
    }
    const vig = estadoVigencia(o.p);
    if (vig.clase === 'vence') det.appendChild(el('small', 'aviso', vig.texto));

    const der = el('div', 'opcion-monto');
    der.appendChild(el('strong', null, monto ? fmt(o.ahorro) : o.p.pct + '%'));
    der.appendChild(el('small', null, monto ? o.p.pct + '%' : 'descuento'));

    li.append(det, der);
    lista.appendChild(li);
  });

  $('c-regla').textContent = datos.config.reservarBolsas
    ? 'Regla activa: Ueno se reserva cuando la promo del día cubre toda la carga (se cambia en Promos → Mi rutina).'
    : 'Regla de reserva apagada: se recomienda siempre el mayor ahorro.';

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
      const usado = enUnidad(p, (uso[p.id] && uso[p.id].sem[lunesHoy]) || 0);
      b.appendChild(el('small', null, 'Esta semana: ' + fmt(usado) + ' de ' + fmt(p.topeSemanal) + unidadTope(p)));
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

// ---------- Tab Semana ----------
function renderSemana() {
  const { uso, detalle } = calcular();
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
    // Promos del dia (sin las bolsas, que van en su propia tarjeta), la mejor
    // primero: prioridad y despues porcentaje.
    const delDia = datos.promos
      .filter(p => !esBolsa(p) && disponible(p, iso))
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
      ul.appendChild(el('li', 'vacio', 'Sin promo del día: solo las bolsas Ueno.'));
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

  const bolsas = $('s-bolsas');
  bolsas.innerHTML = '';
  const refFecha = hoy >= semSel && hoy <= domingo ? hoy : semSel;
  const conBolsa = datos.promos.filter(p => esBolsa(p) && p.activa !== false);
  if (!conBolsa.length) bolsas.appendChild(el('li', 'vacio', 'No hay bolsas estratégicas cargadas.'));
  conBolsa.forEach(p => {
    const li = el('li');
    li.appendChild(el('span', 'chip prio-estrategica', p.pct + '%'));
    const d = el('div', 'detalle');
    d.appendChild(el('span', null, p.nombre));
    d.appendChild(el('small', null, p.emblemas));
    d.appendChild(el('small', null, textoTopes(p, refFecha, uso)));
    li.appendChild(d);
    bolsas.appendChild(li);
  });
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
  $('cfg-reservar').checked = !!datos.config.reservarBolsas;
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

// ---------- Exportar ----------
function filasCSV() {
  const { detalle } = calcular();
  const limpiar = s => String(s || '').replace(/;/g, ',');
  const filas = [['fecha', 'dia', 'monto', 'ahorro', 'costo_efectivo', 'promocion', 'tarjeta', 'emblema', 'nota']];
  datos.cargas.slice().sort(ordenCargas).forEach(c => {
    const p = promoPorId(c.promoId);
    const ahorro = detalle[c.id].ahorro;
    filas.push([c.fecha, nombreDia(c.fecha), c.monto, ahorro, c.monto - ahorro,
      limpiar(p ? p.nombre : ''), limpiar(p ? p.tarjeta : ''), limpiar(c.emblema), limpiar(c.nota)]);
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

// ---------- Eventos: Cargar ----------
$('c-fecha').addEventListener('change', () => {
  if (!editandoCarga) promoElegida = null;
  renderOpciones();
});

$('c-monto').addEventListener('input', () => renderOpciones());

$('c-opciones').addEventListener('click', e => {
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

$('cfg-reservar').addEventListener('change', e => {
  datos.config.reservarBolsas = e.target.checked;
  guardar();
  renderTodo();
});

// ---------- Eventos: respaldo ----------
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
      datos = normalizar(nuevo);
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
