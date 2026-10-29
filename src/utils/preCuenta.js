import { fecha, noches, soles } from "./format";

export const construirPreCuenta = (documento, autoTable, recepcion, consumos) => {
    const alojamiento = Number(recepcion.d_inicial) || 0;
    const totalConsumos = Number(recepcion.d_asistente) || 0;
    const pagado = Number(recepcion.t_pagado) || 0;
    const total = Math.round((alojamiento + totalConsumos) * 100) / 100;
    const saldo = recepcion.totaldeuda == null
        ? Math.max(0, Math.round((total - pagado) * 100) / 100)
        : Math.max(0, Number(recepcion.totaldeuda) || 0);
    const filasConsumos = consumos.map((detalle) => [
        detalle.producto_nombre || `Producto #${detalle.id_producto}`,
        String(detalle.cantidad),
        soles(Number(detalle.sub_total) / (Number(detalle.cantidad) || 1)),
        soles(detalle.sub_total),
    ]);
    const sumaDetalle = consumos.reduce(
        (suma, detalle) => suma + (Number(detalle.sub_total) || 0),
        0
    );
    const ajusteConsumo = Math.round((totalConsumos - sumaDetalle) * 100) / 100;
    if (Math.abs(ajusteConsumo) >= 0.01) {
        filasConsumos.push([
            "Ajuste según total de consumos de la cuenta",
            "—",
            "—",
            soles(ajusteConsumo),
        ]);
    }

    documento.setFontSize(18);
    documento.text("HOTEL SOL ICA", 105, 18, { align: "center" });
    documento.setFontSize(14);
    documento.text("Pre-cuenta de estadía", 105, 27, { align: "center" });
    documento.setFontSize(9);
    documento.text("Documento informativo: no es factura, boleta ni comprobante de pago.", 105, 34, {
        align: "center",
    });
    documento.setFontSize(10);
    documento.text(`Recepción: #${recepcion.id_recepcion}`, 14, 46);
    documento.text(`Huésped: ${recepcion.cliente_nombre || "-"}`, 14, 53);
    documento.text(`Documento: ${recepcion.cliente_documento || "-"}`, 14, 60);
    documento.text(`Habitación: ${recepcion.habitacion_numero || "-"}`, 14, 67);
    documento.text(`Entrada: ${fecha(recepcion.f_entrada)}   Salida prevista: ${fecha(recepcion.f_salida)}`, 14, 74);
    documento.text(`Noches: ${noches(recepcion.f_entrada, recepcion.f_salida)}`, 14, 81);

    autoTable(documento, {
        startY: 89,
        head: [["Concepto", "Cant.", "Precio unitario", "Subtotal"]],
        body: [["Alojamiento", "—", "—", soles(alojamiento)], ...filasConsumos],
        theme: "grid",
        headStyles: { fillColor: [30, 64, 175] },
        styles: { fontSize: 9, cellPadding: 2.5 },
    });
    const finalY = documento.lastAutoTable?.finalY || 100;
    autoTable(documento, {
        startY: finalY + 6,
        body: [
            ["Total de estadía y consumos", soles(total)],
            ["Pagos registrados", soles(pagado)],
            ["Saldo pendiente", soles(saldo)],
        ],
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 2.5 },
        columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    });
    return `pre-cuenta-recepcion-${recepcion.id_recepcion}.pdf`;
};
