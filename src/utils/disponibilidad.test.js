import { buscarHabitacionesDisponibles } from "./disponibilidad";

const habitaciones = [
    { id_habitacion: 1, estado_nombre: "Disponible" },
    { id_habitacion: 2, estado_nombre: "Ocupada" },
    { id_habitacion: 3, estado_nombre: "Mantenimiento" },
    { id_habitacion: 4, estado_nombre: "Ocupada" },
];

const recepciones = [
    { id_habitacion: 2, f_entrada: "2026-10-28", f_salida: "2026-10-30", f_salidac: null },
    { id_habitacion: 4, f_entrada: "2026-10-25", f_salida: "2026-10-28", f_salidac: null },
];

test("filtra las estancias superpuestas y considera salida como fecha exclusiva", () => {
    const disponibles = buscarHabitacionesDisponibles(
        habitaciones,
        recepciones,
        "2026-10-28",
        "2026-10-30"
    );

    expect(disponibles.map((habitacion) => habitacion.id_habitacion)).toEqual([1, 4]);
});

test("no muestra habitaciones ocupadas sin una estancia que permita validar su salida", () => {
    const disponibles = buscarHabitacionesDisponibles(
        habitaciones,
        [],
        "2026-10-28",
        "2026-10-30"
    );

    expect(disponibles.map((habitacion) => habitacion.id_habitacion)).toEqual([1]);
});

test("no muestra estados bloqueados aunque su nombre contenga disponible", () => {
    const disponibles = buscarHabitacionesDisponibles([
        { id_habitacion: 1, estado_nombre: "No disponible" },
        { id_habitacion: 2, estado_nombre: "Disponible" },
    ], [], "2026-10-28", "2026-10-30");

    expect(disponibles.map((habitacion) => habitacion.id_habitacion)).toEqual([2]);
});

test("rechaza un rango de fechas inválido", () => {
    expect(() => buscarHabitacionesDisponibles(habitaciones, recepciones, "2026-10-30", "2026-10-30"))
        .toThrow("posterior");
    expect(() => buscarHabitacionesDisponibles(habitaciones, recepciones, "2026-02-31", "2026-03-02"))
        .toThrow("fechas válidas");
});
