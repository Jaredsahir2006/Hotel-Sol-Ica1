import { calcularTotalesEfectivo, calcularTotalesPorMetodo } from "./caja";

const tipos = [
    { id_tipomovimiento: 1, signo: "+" },
    { id_tipomovimiento: 2, signo: "-" },
];

test("calcula el arqueo solo con movimientos que afectan efectivo", () => {
    const resultado = calcularTotalesEfectivo(100, [
        { id_tipomovimiento: 1, monto: 50.25, afecta_efectivo: "S" },
        { id_tipomovimiento: 1, monto: 30, afecta_efectivo: "N" },
        { id_tipomovimiento: 2, monto: 10.1, afecta_efectivo: "S" },
    ], tipos);

    expect(resultado).toEqual({
        ingresos: 50.25,
        egresos: 10.1,
        sistema: 140.15,
    });
});

test("rechaza movimientos de efectivo con tipo o monto inválido", () => {
    expect(() => calcularTotalesEfectivo(20, [
        { id_tipomovimiento: 3, monto: 5, afecta_efectivo: "S" },
    ], tipos)).toThrow("tipo inválido");
    expect(() => calcularTotalesEfectivo(20, [
        { id_tipomovimiento: 1, monto: "no-numérico", afecta_efectivo: "S" },
    ], tipos)).toThrow("monto de caja");
});

test("calcula el esperado por método incluyendo el fondo inicial y egresos", () => {
    const resultado = calcularTotalesPorMetodo(100, [
        { id_tipomovimiento: 1, id_metodopago: 1, monto: 50.25, afecta_efectivo: "S" },
        { id_tipomovimiento: 1, id_metodopago: 2, monto: 20 },
        { id_tipomovimiento: 2, id_metodopago: 1, monto: 10, afecta_efectivo: "S" },
        { id_tipomovimiento: 1, id_metodopago: 3, monto: 90 },
        { id_tipomovimiento: 1, id_metodopago: 4, id_concepto: 9, monto: 15 },
    ], tipos, [
        { id_metodopago: 1, n_metodopago: "Efectivo" },
        { id_metodopago: 2, n_metodopago: "Tarjeta" },
        { id_metodopago: 3, n_metodopago: "Crédito corporativo" },
        { id_metodopago: 4, n_metodopago: "Transferencia" },
    ], [{ id_concepto: 9, n_concepto: "Cortesía por incidente" }]);

    expect(resultado).toEqual([
        { id_metodopago: 1, clave: "1", nombre: "Efectivo", esperadoCentimos: 14025, esperado: 140.25 },
        { id_metodopago: 2, clave: "2", nombre: "Tarjeta", esperadoCentimos: 2000, esperado: 20 },
        { id_metodopago: 3, clave: "3", nombre: "Crédito corporativo", esperadoCentimos: 0, esperado: 0 },
        { id_metodopago: 4, clave: "4", nombre: "Transferencia", esperadoCentimos: 0, esperado: 0 },
    ]);
});
