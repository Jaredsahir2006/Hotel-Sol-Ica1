import { construirPreCuenta } from "./preCuenta";

test("construye el detalle y los totales de la pre-cuenta con el saldo pendiente", () => {
    const documento = {
        setFontSize: jest.fn(),
        text: jest.fn(),
    };
    const autoTable = jest.fn((pdf) => {
        pdf.lastAutoTable = { finalY: 120 };
    });

    const archivo = construirPreCuenta(documento, autoTable, {
        id_recepcion: 42,
        cliente_nombre: "Juan Carlos Pérez López",
        cliente_documento: "12345678",
        habitacion_numero: "102",
        f_entrada: "2026-10-28",
        f_salida: "2026-10-29",
        d_inicial: 100,
        d_asistente: 50,
        t_pagado: 25,
        totaldeuda: 125,
    }, [{
        id_producto: 9,
        producto_nombre: "Desayuno Buffet",
        cantidad: 2,
        sub_total: 50,
    }]);

    expect(archivo).toBe("pre-cuenta-recepcion-42.pdf");
    expect(documento.text).toHaveBeenCalledWith(
        "Documento informativo: no es factura, boleta ni comprobante de pago.",
        105,
        34,
        { align: "center" }
    );
    expect(autoTable).toHaveBeenCalledTimes(2);
    expect(autoTable.mock.calls[0][1].body).toEqual([
        ["Alojamiento", "—", "—", "S/ 100.00"],
        ["Desayuno Buffet", "2", "S/ 25.00", "S/ 50.00"],
    ]);
    expect(autoTable.mock.calls[1][1].body).toEqual([
        ["Total de estadía y consumos", "S/ 150.00"],
        ["Pagos registrados", "S/ 25.00"],
        ["Saldo pendiente", "S/ 125.00"],
    ]);
});

test("concilia detalles antiguos con el total de consumo guardado en la recepción", () => {
    const documento = { setFontSize: jest.fn(), text: jest.fn() };
    const autoTable = jest.fn((pdf) => {
        pdf.lastAutoTable = { finalY: 120 };
    });

    construirPreCuenta(documento, autoTable, {
        id_recepcion: 8,
        d_inicial: 100,
        d_asistente: 50,
        t_pagado: 0,
    }, [{
        id_producto: 9,
        producto_nombre: "Desayuno Buffet",
        cantidad: 1,
        sub_total: 40,
    }]);

    expect(autoTable.mock.calls[0][1].body[2]).toEqual([
        "Ajuste según total de consumos de la cuenta",
        "—",
        "—",
        "S/ 10.00",
    ]);
});
