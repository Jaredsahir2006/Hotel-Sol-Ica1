import { supabase } from "../config/supabase";

// Datos de auditoría que usan todas las tablas del sistema.
const AUD = { usuario: "WEB", pc: "PC-WEB" };

const ahora = () => new Date().toISOString();

// Traduce errores comunes de Supabase/Postgres a mensajes claros.
const traducir = (error) => {
    if (error.code === "23503")
        return "No se puede completar: el registro está relacionado con otros datos.";
    if (error.code === "23505")
        return "Ya existe un registro con ese valor único (por ejemplo documento o número repetido).";
    if (error.code === "23502")
        return `Falta un dato obligatorio en la base de datos. ${error.message}`;
    if (error.code === "42P01")
        return "La tabla no existe en Supabase. Revisa el nombre en config/entidades.js.";
    if (error.code === "42703")
        return `Una columna no existe en la tabla. Revisa config/entidades.js. ${error.message}`;
    if (error.code === "42501")
        return "Sin permisos (RLS). Revisa las políticas de la tabla en Supabase.";
    return error.message;
};

const lanzar = (error) => {
    if (error) throw new Error(traducir(error));
};

// Leer: solo registros activos (estado = '1')
export const listar = async (tabla, pk) => {
    const { data, error } = await supabase
        .from(tabla)
        .select("*")
        .eq("estado", "1")
        .order(pk, { ascending: true });
    lanzar(error);
    return data;
};

// Máximo de registros por página en todos los CRUD.
export const POR_PAGINA = 25;

// Leer una página de registros activos, con búsqueda y filtros (server-side).
export const listarPaginado = async (
    tabla,
    pk,
    { pagina = 1, busqueda = "", columnasBusqueda = [], filtros = {} } = {}
) => {
    const desde = (pagina - 1) * POR_PAGINA;

    let consulta = supabase
        .from(tabla)
        .select("*", { count: "exact" })
        .eq("estado", "1");

    const termino = String(busqueda || "").trim().replace(/[%_,()]/g, " ").trim();
    if (termino && columnasBusqueda.length) {
        const clause = columnasBusqueda
            .map((c) => `${c}.ilike.%${termino}%`)
            .join(",");
        consulta = consulta.or(clause);
    }

    for (const [campo, valor] of Object.entries(filtros || {})) {
        if (campo && valor !== "" && valor != null) {
            consulta = consulta.eq(campo, valor);
        }
    }

    const { data, error, count } = await consulta
        .order(pk, { ascending: true })
        .range(desde, desde + POR_PAGINA - 1);
    lanzar(error);

    const total = count || 0;
    return {
        data,
        total,
        pagina,
        totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    };
};

export const insertar = async (tabla, fila) => {
    const { error } = await supabase.from(tabla).insert([{
        ...fila,
        usucre: AUD.usuario,
        pccre: AUD.pc,
        feccre: ahora(),
        estado: "1",
    }]);
    lanzar(error);
};

export const actualizar = async (tabla, pk, id, fila) => {
    const { error } = await supabase.from(tabla).update({
        ...fila,
        usumod: AUD.usuario,
        pcmod: AUD.pc,
        fecmod: ahora(),
    }).eq(pk, id);
    lanzar(error);
};

// Eliminar = baja lógica (estado = '0'), igual que el resto del sistema.
export const eliminar = async (tabla, pk, id) => {
    const { error } = await supabase.from(tabla).update({
        estado: "0",
        usumod: AUD.usuario,
        pcmod: AUD.pc,
        fecmod: ahora(),
    }).eq(pk, id);
    lanzar(error);
};