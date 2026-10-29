import { supabase } from "../config/supabase";
import { construirResumenDashboard } from "../utils/dashboard";

const TAMANO_LOTE = 1000;

const fechaLocal = (fecha) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

const leer = async (consulta) => {
    const { data, error } = await consulta;
    if (error) {
        if (error.code === "42501") {
            throw new Error("No tienes permiso para consultar los indicadores del dashboard (RLS).");
        }
        throw new Error(`No se pudo cargar el dashboard: ${error.message}`);
    }
    return data || [];
};

const leerTodos = async (crearConsulta) => {
    const filas = [];
    let desde = 0;

    for (;;) {
        const lote = await leer(crearConsulta().range(desde, desde + TAMANO_LOTE - 1));
        filas.push(...lote);
        if (lote.length < TAMANO_LOTE) return filas;
        desde += TAMANO_LOTE;
    }
};

export const cargarResumenDashboard = async () => {
    const hoy = fechaLocal(new Date());
    const mesActual = new Date(`${hoy}T12:00:00`);
    mesActual.setDate(1);
    const inicioMes = fechaLocal(mesActual);
    const siguienteMes = new Date(mesActual);
    siguienteMes.setMonth(siguienteMes.getMonth() + 1);
    const inicioMesSiguiente = fechaLocal(siguienteMes);
    const inicioSeisMeses = new Date(mesActual);
    inicioSeisMeses.setMonth(inicioSeisMeses.getMonth() - 5);
    const desdeSeisMeses = fechaLocal(inicioSeisMeses);

    const [
        reservasMes,
        reservasRecientes,
        estadiasActivas,
        habitaciones,
        estadosHabitacion,
        movimientos,
        tiposMovimiento,
    ] = await Promise.all([
        leerTodos(() => supabase
            .from("recepcion")
            .select("id_recepcion")
            .eq("estado", "1")
            .gte("f_entrada", inicioMes)
            .lt("f_entrada", inicioMesSiguiente)
            .order("id_recepcion", { ascending: true })),
        leer(supabase
            .from("recepcion")
            .select("id_recepcion,id_habitacion,f_entrada,f_salida,f_salidac,feccre")
            .eq("estado", "1")
            .order("feccre", { ascending: false })
            .limit(10)),
        leerTodos(() => supabase
            .from("recepcion")
            .select("id_habitacion")
            .eq("estado", "1")
            .is("f_salidac", null)
            .lte("f_entrada", hoy)
            .gte("f_salida", hoy)
            .order("id_recepcion", { ascending: true })),
        leerTodos(() => supabase
            .from("habitacion")
            .select("id_habitacion,numero,id_estadohabitacion")
            .eq("estado", "1")
            .order("numero")
            .order("id_habitacion")),
        leer(supabase
            .from("estado_habitacion")
            .select("id_estadohabitacion,descripcion")
            .eq("estado", "1")),
        leerTodos(() => supabase
            .from("movimiento_caja")
            .select("id_movimientocaja,id_tipomovimiento,monto,f_movimiento,descripcion")
            .eq("estado", "1")
            .gte("f_movimiento", desdeSeisMeses)
            .lt("f_movimiento", inicioMesSiguiente)
            .order("f_movimiento", { ascending: false })
            .order("id_movimientocaja", { ascending: false })),
        leer(supabase
            .from("tipo_movimiento_caja")
            .select("id_tipomovimiento,signo")
            .eq("estado", "1")),
    ]);

    return construirResumenDashboard({
        reservasMes: reservasMes.length,
        reservasRecientes,
        estadiasActivas,
        habitaciones,
        estadosHabitacion,
        movimientos,
        tiposMovimiento,
    }, hoy);
};
