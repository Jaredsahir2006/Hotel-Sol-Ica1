import { construirResumenDashboard } from "./dashboard";

describe("construirResumenDashboard", () => {
    const hoy = "2026-04-15";

    it("calcula indicadores y series desde las reservas, habitaciones y movimientos", () => {
        const resumen = construirResumenDashboard({
            reservasMes: 3,
            reservasRecientes: [
                {
                    id_recepcion: 42,
                    id_habitacion: 1,
                    f_entrada: hoy,
                    f_salida: "2026-04-17",
                    f_salidac: null,
                    d_inicial: 120,
                    d_asistente: 0,
                    feccre: `${hoy}T09:30:00`,
                },
            ],
            estadiasActivas: [{ id_habitacion: 1 }],
            habitaciones: [
                { id_habitacion: 1, numero: "101", id_estadohabitacion: 1 },
                { id_habitacion: 2, numero: "102", id_estadohabitacion: 2 },
                { id_habitacion: 3, numero: "103", id_estadohabitacion: 3 },
            ],
            estadosHabitacion: [
                { id_estadohabitacion: 1, descripcion: "Ocupada" },
                { id_estadohabitacion: 2, descripcion: "Disponible" },
                { id_estadohabitacion: 3, descripcion: "Mantenimiento" },
            ],
            movimientos: [
                {
                    id_movimientocaja: 10,
                    id_tipomovimiento: 1,
                    monto: 100,
                    f_movimiento: hoy,
                    descripcion: "Pago de habitación",
                },
                {
                    id_movimientocaja: 11,
                    id_tipomovimiento: 2,
                    monto: 60,
                    f_movimiento: hoy,
                    descripcion: "Compra de suministros",
                },
            ],
            tiposMovimiento: [
                { id_tipomovimiento: 1, signo: "+" },
                { id_tipomovimiento: 2, signo: "-" },
            ],
        }, hoy);

        expect(resumen.indicadores.map(({ id, valor }) => [id, valor])).toEqual([
            ["reservas", 3],
            ["ingresos", 100],
            ["ocupadas", 1],
            ["disponibles", 1],
        ]);
        expect(resumen.graficoIngresos.valores).toHaveLength(6);
        expect(resumen.graficoIngresos.valores[5]).toBe(100);
        expect(resumen.graficoHabitaciones).toEqual([
            { estado: "Ocupadas", cantidad: 1 },
            { estado: "Disponibles", cantidad: 1 },
            { estado: "Mantenimiento", cantidad: 1 },
        ]);
        expect(resumen.reservasRecientes[0]).toMatchObject({
            id: 42,
            habitacion: "101",
            estado: "En curso",
        });
        expect(resumen.actividades.some(({ titulo }) => titulo.includes("Ingreso de caja"))).toBe(true);
    });

    it("representa correctamente los datos vacíos sin inventar indicadores", () => {
        const resumen = construirResumenDashboard({
            reservasMes: 0,
            reservasRecientes: [],
            estadiasActivas: [],
            habitaciones: [],
            estadosHabitacion: [],
            movimientos: [],
            tiposMovimiento: [],
        }, hoy);

        expect(resumen.indicadores.map(({ valor }) => valor)).toEqual([0, 0, 0, 0]);
        expect(resumen.graficoIngresos.valores).toEqual([0, 0, 0, 0, 0, 0]);
        expect(resumen.graficoHabitaciones).toEqual([]);
        expect(resumen.reservasRecientes).toEqual([]);
        expect(resumen.actividades).toEqual([]);
    });
});
