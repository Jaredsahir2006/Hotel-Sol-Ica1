const fechaDia = (valor) => String(valor || "").slice(0, 10);

const fechaValida = (valor) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(`${valor}T00:00:00Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
};

const seCruzanFechas = (entradaA, salidaA, entradaB, salidaB) =>
    entradaA < salidaB && salidaA > entradaB;

export const buscarHabitacionesDisponibles = (
    habitaciones,
    recepciones,
    fEntrada,
    fSalida
) => {
    if (!fechaValida(fEntrada) || !fechaValida(fSalida)) {
        throw new Error("Ingresa fechas válidas para consultar disponibilidad.");
    }
    if (fSalida <= fEntrada) {
        throw new Error("La fecha de salida debe ser posterior a la fecha de entrada.");
    }

    return habitaciones.filter((habitacion) => {
        const estado = String(habitacion.estado_nombre || "").toUpperCase();
        if (/NO DISPON|INDISPON|MANTEN|LIMPIE|FUERA|BLOQUEAD|RESERVAD/.test(estado)) return false;
        const disponible = estado.includes("DISPON");
        const ocupada = estado.includes("OCUP");
        if (!disponible && !ocupada) return false;

        const estanciasActivas = recepciones.filter((recepcion) =>
            String(recepcion.id_habitacion) === String(habitacion.id_habitacion)
            && !recepcion.f_salidac
        );

        if (ocupada && estanciasActivas.length === 0) return false;

        return !estanciasActivas.some((recepcion) => {
            const entrada = fechaDia(recepcion.f_entrada);
            const salida = fechaDia(recepcion.f_salida);
            return entrada && salida
                && seCruzanFechas(entrada, salida, fEntrada, fSalida);
        });
    });
};
