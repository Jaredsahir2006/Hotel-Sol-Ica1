import { calcularTotalesEfectivo } from "./caja";

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
