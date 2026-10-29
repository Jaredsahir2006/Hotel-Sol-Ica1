import { supabase } from "../config/supabase";

const TAMANO_PAGINA_MAXIMO = 100;

const lanzar = (error) => {
    if (!error) return;
    if (error.code === "42501") {
        throw new Error("Sin permisos (RLS) para consultar el historial de auditoría.");
    }
    throw new Error(error.message || "No se pudo consultar la auditoría.");
};

const limpiarBusqueda = (valor) =>
    String(valor || "")
        .trim()
        .replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ-]/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 80);

const inicioDiaISO = (fecha) => new Date(`${fecha}T00:00:00`).toISOString();

const inicioDiaSiguienteISO = (fecha) => {
    const siguiente = new Date(`${fecha}T00:00:00`);
    siguiente.setDate(siguiente.getDate() + 1);
    return siguiente.toISOString();
};

export const listarUsuariosHistorial = async () => {
    const { data, error } = await supabase
        .from("usuario")
        .select("id_usuario, logeo")
        .eq("estado", "1")
        .order("logeo");
    lanzar(error);
    return data || [];
};

export const listarHistorial = async ({
    desde = "",
    hasta = "",
    usuario = "",
    accion = "",
    tabla = "",
    busqueda = "",
    pagina = 1,
    pageSize = 25,
} = {}) => {
    if (desde && hasta && desde > hasta) {
        throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
    }

    const tamanoPagina = Math.min(
        TAMANO_PAGINA_MAXIMO,
        Math.max(1, Math.floor(Number(pageSize) || 25))
    );
    const numeroPagina = Math.max(1, Math.floor(Number(pagina) || 1));
    const inicio = (numeroPagina - 1) * tamanoPagina;
    let consulta = supabase
        .from("auditoria")
        .select("*", { count: "exact" })
        .eq("estado", "1");

    if (desde) consulta = consulta.gte("f_evento", inicioDiaISO(desde));
    if (hasta) consulta = consulta.lt("f_evento", inicioDiaSiguienteISO(hasta));
    if (usuario) consulta = consulta.eq("id_usuario", usuario);
    if (accion) consulta = consulta.eq("accion", accion);
    if (tabla) consulta = consulta.eq("n_tabla", tabla);

    const termino = limpiarBusqueda(busqueda);
    if (termino) {
        const columnas = ["n_tabla", "accion", "terminal"];
        const condiciones = columnas
            .map((columna) => `${columna}.ilike.%${termino}%`);
        if (/^\d+$/.test(termino)) {
            condiciones.push(`id_registro.eq.${termino}`);
        }
        consulta = consulta.or(condiciones.join(","));
    }

    const { data, error, count } = await consulta
        .order("f_evento", { ascending: false })
        .order("id_auditoria", { ascending: false })
        .range(inicio, inicio + tamanoPagina - 1);
    lanzar(error);

    const total = count || 0;
    return {
        data: data || [],
        total,
        pagina: numeroPagina,
        pageSize: tamanoPagina,
        totalPaginas: Math.max(1, Math.ceil(total / tamanoPagina)),
    };
};
