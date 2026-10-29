import { clasificarEstadoReserva, fechaDia } from "./reportes";

const numero = (valor) => {
    const resultado = Number(valor);
    return Number.isFinite(resultado) ? resultado : 0;
};

const mesClave = (valor) => fechaDia(valor).slice(0, 7);

const fechaMes = (fecha, desplazamiento) => {
    const resultado = new Date(`${fecha.slice(0, 7)}-01T12:00:00`);
    resultado.setMonth(resultado.getMonth() + desplazamiento);
    return `${resultado.getFullYear()}-${String(resultado.getMonth() + 1).padStart(2, "0")}`;
};

const etiquetaMes = (clave) =>
    new Date(`${clave}-01T12:00:00`).toLocaleDateString("es-PE", {
        month: "short",
    });

const fechaSolo = (fecha) => {
    if (!fecha) return "Fecha no disponible";
    const texto = String(fecha).slice(0, 10);
    const instante = new Date(`${texto}T12:00:00`);
    if (Number.isNaN(instante.getTime())) return texto;
    return instante.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const etiquetaEstadoReserva = (estado) => ({
    en_curso: "En curso",
    pendiente_checkin: "Pendiente",
    proxima: "Próxima",
    finalizada: "Finalizada",
}[estado] || "Sin estado");

const fechaActividad = (fecha) => {
    if (!fecha) return "Fecha no disponible";
    const fechaNormalizada = String(fecha).length === 10
        ? `${fecha}T12:00:00`
        : fecha;
    const instante = new Date(fechaNormalizada);
    if (Number.isNaN(instante.getTime())) return String(fecha);

    return instante.toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const construirResumenDashboard = (datos, hoy) => {
    const meses = Array.from({ length: 6 }, (_, indice) => {
        const clave = fechaMes(hoy, indice - 5);
        return { clave, etiqueta: etiquetaMes(clave), ingresos: 0 };
    });
    const mesesPorClave = new Map(meses.map((mes) => [mes.clave, mes]));
    const tiposMovimientoPorId = new Map(
        (datos.tiposMovimiento || []).map((tipo) => [String(tipo.id_tipomovimiento), tipo])
    );

    (datos.movimientos || []).forEach((movimiento) => {
        const tipo = tiposMovimientoPorId.get(String(movimiento.id_tipomovimiento));
        if (tipo?.signo === "-") return;
        const mes = mesesPorClave.get(mesClave(movimiento.f_movimiento));
        if (mes) mes.ingresos += numero(movimiento.monto);
    });

    const habitaciones = datos.habitaciones || [];
    const estados = datos.estadosHabitacion || [];
    const estadoPorId = new Map(
        estados.map((estado) => [String(estado.id_estadohabitacion), estado.descripcion || "Sin estado"])
    );
    const habitacionesOcupadas = new Set(
        (datos.estadiasActivas || []).map((recepcion) => String(recepcion.id_habitacion))
    );

    const habitacionesPorEstado = new Map();
    habitaciones.forEach((habitacion) => {
        const estado = estadoPorId.get(String(habitacion.id_estadohabitacion)) || "Sin estado";
        const estadoNormalizado = estado.toLocaleLowerCase("es");
        const ocupada = habitacionesOcupadas.has(String(habitacion.id_habitacion)) ||
            estadoNormalizado.includes("ocup");
        const nombre = ocupada ? "Ocupadas" : estadoNormalizado.includes("dispon")
            ? "Disponibles"
            : estado;
        habitacionesPorEstado.set(nombre, (habitacionesPorEstado.get(nombre) || 0) + 1);
    });

    const ocupadas = habitacionesPorEstado.get("Ocupadas") || 0;
    const disponibles = habitacionesPorEstado.get("Disponibles") || 0;
    const ocupacion = habitaciones.length
        ? Math.round((ocupadas / habitaciones.length) * 100)
        : 0;
    const ingresoMes = mesesPorClave.get(mesClave(hoy))?.ingresos || 0;

    const habitacionesPorId = new Map(
        habitaciones.map((habitacion) => [String(habitacion.id_habitacion), habitacion])
    );
    const estadosReserva = new Map(
        (datos.estadosHabitacion || []).map((estado) => [
            String(estado.id_estadohabitacion),
            estado.descripcion
        ])
    );
    const reservasRecientes = (datos.reservasRecientes || []).slice(0, 5).map((reserva) => {
        const habitacion = habitacionesPorId.get(String(reserva.id_habitacion));
        const estado = clasificarEstadoReserva(
            reserva,
            estadosReserva.get(String(habitacion?.id_estadohabitacion)) || "",
            hoy
        );
        return {
            id: reserva.id_recepcion,
            habitacion: habitacion?.numero || String(reserva.id_habitacion || "-"),
            entrada: fechaSolo(reserva.f_entrada),
            salida: fechaSolo(reserva.f_salida),
            estado: etiquetaEstadoReserva(estado),
            codigoEstado: estado,
        };
    });

    const actividades = [
        ...(datos.reservasRecientes || []).map((reserva) => ({
            id: `reserva-${reserva.id_recepcion}`,
            tipo: "reserva",
            titulo: `Reserva #${reserva.id_recepcion} registrada`,
            fecha: reserva.feccre || reserva.f_entrada,
            habitacion: habitacionesPorId.get(String(reserva.id_habitacion))?.numero,
        })),
        ...(datos.movimientos || []).map((movimiento) => ({
            id: `movimiento-${movimiento.id_movimientocaja}`,
            tipo: "movimiento",
            titulo: `${tiposMovimientoPorId.get(String(movimiento.id_tipomovimiento))?.signo === "-"
                ? "Egreso"
                : "Ingreso"} de caja · S/ ${numero(movimiento.monto).toFixed(2)}`,
            fecha: movimiento.f_movimiento,
            descripcion: movimiento.descripcion || "",
        })),
    ]
        .filter((actividad) => actividad.fecha)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 5)
        .map((actividad) => ({
            ...actividad,
            fechaTexto: fechaActividad(actividad.fecha),
        }));

    return {
        indicadores: [
            {
                id: "reservas",
                etiqueta: "Reservas este mes",
                valor: numero(datos.reservasMes),
                detalle: "Con fecha de ingreso este mes",
                icono: "bi-calendar-check",
                color: "blue",
            },
            {
                id: "ingresos",
                etiqueta: "Ingresos de caja este mes",
                valor: ingresoMes,
                formato: "moneda",
                detalle: "Movimientos de ingreso registrados",
                icono: "bi-cash-coin",
                color: "emerald",
            },
            {
                id: "ocupadas",
                etiqueta: "Habitaciones ocupadas",
                valor: ocupadas,
                detalle: `${ocupacion}% de ${habitaciones.length} habitaciones`,
                icono: "bi-door-closed",
                color: "amber",
            },
            {
                id: "disponibles",
                etiqueta: "Habitaciones disponibles",
                valor: disponibles,
                detalle: "Disponibles según su estado actual",
                icono: "bi-door-open",
                color: "violet",
            },
        ],
        graficoIngresos: {
            etiquetas: meses.map((mes) => mes.etiqueta),
            valores: meses.map((mes) => Math.round(mes.ingresos * 100) / 100),
        },
        graficoHabitaciones: [...habitacionesPorEstado.entries()].map(([estado, cantidad]) => ({
            estado,
            cantidad,
        })),
        reservasRecientes,
        actividades,
    };
};
