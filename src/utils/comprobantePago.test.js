import { construirComprobantePago, calcularSaldoPendiente } from "./comprobantePago";

test("calcula el saldo pendiente desde los campos acumulados de la recepción", () => {
    expect(calcularSaldoPendiente({
        d_inicial: 100,
        d_asistente: 25,
        t_pagado: 40,
    })).toBe(85);
    expect(calcularSaldoPendiente({ totaldeuda: 0 })).toBe(0);
});

test("construye una constancia interna vinculada al movimiento de pago", () => {
    const documento = {
        setFontSize: jest.fn(),
        text: jest.fn(),
        lastAutoTable: { finalY: 110 },
    };
    const autoTable = jest.fn();
    const movimiento = {
        id_movimientocaja: 19,
        f_movimiento: "2026-10-28T15:00:00",
        id_recepcion: 42,
        cliente_nombre: "Ana Huamán",
        cliente_documento: "12345678",
        habitacion_numero: "102",
        concepto_nombre: "Pago de hospedaje",
        metodo_nombre: "Efectivo",
        numero_operacion: "OP-42",
        monto: 75.5,
    };

    const nombreArchivo = construirComprobantePago(documento, autoTable, movimiento);

    expect(nombreArchivo).toBe("constancia-pago-19.pdf");
    expect(documento.text).toHaveBeenCalledWith(
        "Documento interno; no reemplaza una boleta o factura.",
        105,
        34,
        { align: "center" }
    );
    expect(autoTable).toHaveBeenCalledWith(documento, expect.objectContaining({
        startY: 96,
        body: [[
            "Pago de hospedaje",
            "Efectivo",
            "OP-42",
            "S/ 75.50",
        ]],
    }));
    expect(documento.text).toHaveBeenCalledWith("Total recibido: S/ 75.50", 196, 122, { align: "right" });
});

test("muestra el saldo restante cuando el pago se aplica a una recepción", () => {
    const documento = {
        setFontSize: jest.fn(),
        text: jest.fn(),
        lastAutoTable: { finalY: 110 },
    };

    construirComprobantePago(documento, jest.fn(), {
        id_movimientocaja: 19,
        monto: 30,
        saldo_pendiente: 45,
    });

    expect(documento.text).toHaveBeenCalledWith(
        "Saldo pendiente después del pago: S/ 45.00",
        14,
        139
    );
});

test("no genera una constancia por un importe inválido", () => {
    expect(() => construirComprobantePago({}, jest.fn(), { monto: 0 }))
        .toThrow("El importe del pago no es válido");
});
