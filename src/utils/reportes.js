// ============================================================
// Utilidades compartidas por los reportes.
// Todas las fechas se comparan en formato YYYY-MM-DD para evitar
// diferencias por zona horaria entre Supabase y el navegador.
// ============================================================

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

export const fechaDia = (valor) => {
    if (!valor) return "";
    const texto = String(valor).trim();
    return texto.length >= 10 ? texto.slice(0, 10) : texto;
};

export const sumarDias = (valor, dias) => {
    const base = fechaDia(valor);
    const [anio, mes, dia] = base.split("-").map(Number);
    if (!anio || !mes || !dia) return "";
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    fecha.setUTCDate(fecha.getUTCDate() + Number(dias || 0));
    return fecha.toISOString().slice(0, 10);
};

export const diffDias = (desde, hasta) => {
    const a = Date.parse(`${fechaDia(desde)}T00:00:00Z`);
    const b = Date.parse(`${fechaDia(hasta)}T00:00:00Z`);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.round((a - b) / 86400000);
};

export const nochesEntre = (entrada, salida) => {
    if (!entrada || !salida) return 0;
    return Math.max(0, diffDias(salida, entrada));
};

export const nochesSolapadas = (entrada, salida, desde, hasta) => {
    const inicio = fechaDia(entrada);
    if (!inicio) return 0;
    const finOriginal = fechaDia(salida) || sumarDias(hasta, 1);
    const limite = hasta ? sumarDias(hasta, 1) : finOriginal;
    const inicioRango = desde && desde > inicio ? desde : inicio;
    const finRango = finOriginal < limite ? finOriginal : limite;
    return Math.max(0, diffDias(finRango, inicioRango));
};

export const rangoDias = (desde, hasta) => {
    if (!desde || !hasta) return 0;
    return Math.max(0, diffDias(hasta, desde) + 1);
};

export const dentroDeRango = (valor, desde, hasta) => {
    const dia = fechaDia(valor);
    if (!dia) return false;
    if (desde && dia < desde) return false;
    if (hasta && dia > hasta) return false;
    return true;
};

export const inicioSemana = (valor) => {
    const dia = fechaDia(valor);
    if (!dia) return "";
    const fecha = new Date(`${dia}T12:00:00`);
    if (Number.isNaN(fecha.getTime())) return "";
    const desplazamiento = (fecha.getDay() + 6) % 7;
    fecha.setDate(fecha.getDate() - desplazamiento);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const numeroDia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${numeroDia}`;
};

export const clavePeriodo = (valor, periodo = "mes") => {
    const dia = fechaDia(valor);
    if (!dia) return "";
    if (periodo === "dia") return dia;
    if (periodo === "semana") return inicioSemana(dia);
    if (periodo === "anio") return dia.slice(0, 4);
    return dia.slice(0, 7);
};

export const etiquetaPeriodo = (clave, periodo = "mes") => {
    if (!clave) return "";
    if (periodo === "anio") return clave;
    if (periodo === "mes") {
        const [anio, mes] = clave.split("-");
        return `${MESES[Number(mes) - 1] || mes} ${anio.slice(2)}`;
    }
    const [anio, mes, dia] = clave.split("-");
    const corto = `${dia}/${mes}/${anio.slice(2)}`;
    return periodo === "semana" ? `Sem ${corto}` : corto;
};

export const generarPeriodos = (desde, hasta, periodo = "mes") => {
    const inicio = clavePeriodo(desde, periodo);
    const fin = clavePeriodo(hasta, periodo);
    if (!inicio || !fin || inicio > fin) return [];

    const claves = [];
    let cursor = inicio;
    let proteccion = 0;

    while (cursor <= fin && proteccion < 3000) {
        claves.push(cursor);
        proteccion += 1;

        if (periodo === "dia") {
            cursor = sumarDias(cursor, 1);
        } else if (periodo === "semana") {
            cursor = sumarDias(cursor, 7);
        } else if (periodo === "anio") {
            cursor = String(Number(cursor) + 1);
        } else {
            const [anio, mes] = cursor.split("-").map(Number);
            const fecha = new Date(Date.UTC(anio, mes, 1));
            cursor = fecha.toISOString().slice(0, 7);
        }
    }

    return claves;
};

// Los datos de demostración agregan un número al final del nombre
// ("PAPAS FRITAS 7", "GASTO DE LIMPIEZA 12"). Para los rankings se
// agrupa por el nombre base y así el reporte resulta legible.
export const nombreBase = (valor) => {
    const texto = String(valor || "").trim().replace(/\s+/g, " ");
    if (!texto) return "";
    const sinSufijo = texto.replace(/\s+\d{1,4}$/, "").trim();
    return sinSufijo || texto;
};

export const normalizarTexto = (valor) =>
    String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

export const agregarValores = (valores, agregacion = "suma") => {
    const numeros = (valores || []).map(Number).filter(Number.isFinite);
    if (agregacion === "conteo") return numeros.length;
    if (!numeros.length) return 0;
    if (agregacion === "promedio") {
        return numeros.reduce((suma, valor) => suma + valor, 0) / numeros.length;
    }
    if (agregacion === "maximo") return Math.max(...numeros);
    if (agregacion === "minimo") return Math.min(...numeros);
    return numeros.reduce((suma, valor) => suma + valor, 0);
};

export const redondear = (valor, decimales = 2) => {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 0;
    const factor = 10 ** decimales;
    return Math.round(numero * factor) / factor;
};

export const porcentaje = (parte, total) =>
    total > 0 ? redondear((Number(parte) || 0) / Number(total) * 100, 1) : 0;

export const formatearCompacto = (valor) => {
    const numero = Number(valor) || 0;
    const absoluto = Math.abs(numero);
    if (absoluto >= 1000000) return `${redondear(numero / 1000000, 1)}M`;
    if (absoluto >= 1000) return `${redondear(numero / 1000, 1)}k`;
    return String(redondear(numero, 0));
};

export const COLORES_REPORTE = [
    "#1d4ed8",
    "#0f766e",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#65a30d",
    "#db2777",
    "#475569",
    "#ca8a04",
];
