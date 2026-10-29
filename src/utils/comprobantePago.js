import { fechaHora, soles } from "./format";

export const calcularSaldoPendiente = (recepcion) => {
    const saldo = recepcion.totaldeuda == null
        ? Number(recepcion.d_inicial || 0)
            + Number(recepcion.d_asistente || 0)
            - Number(recepcion.t_pagado || 0)
        : Number(recepcion.totaldeuda);
    if (!Number.isFinite(saldo)) {
        throw new Error("La recepción tiene un saldo pendiente inválido.");
    }
    return Math.max(0, Math.round(saldo * 100) / 100);
};

export const construirComprobantePago = (documento, autoTable, movimiento) => {
    const monto = Number(movimiento.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error("El importe del pago no es válido para generar la constancia.");
    }

    documento.setFontSize(18);
    documento.text("HOTEL SOL ICA", 105, 18, { align: "center" });
    documento.setFontSize(14);
    documento.text("Constancia de pago", 105, 27, { align: "center" });
    documento.setFontSize(9);
    documento.text("Documento interno; no reemplaza una boleta o factura.", 105, 34, {
        align: "center",
    });
    documento.setFontSize(10);
    documento.text(`Constancia: CP-${movimiento.id_movimientocaja}`, 14, 46);
    documento.text(`Fecha: ${fechaHora(movimiento.f_movimiento)}`, 14, 53);
    documento.text(`Recepción: ${movimiento.id_recepcion ? `#${movimiento.id_recepcion}` : "Sin recepción"}`, 14, 60);
    documento.text(`Huésped: ${movimiento.cliente_nombre || "-"}`, 14, 67);
    documento.text(`Documento: ${movimiento.cliente_documento || "-"}`, 14, 74);
    documento.text(`Habitación: ${movimiento.habitacion_numero || "-"}`, 14, 81);
    documento.text(`Atendido por: ${movimiento.usuario_nombre || "-"}`, 14, 88);

    autoTable(documento, {
        startY: 96,
        head: [["Concepto", "Método", "N° de operación", "Importe"]],
        body: [[
            movimiento.concepto_nombre || movimiento.descripcion || "Pago de recepción",
            movimiento.metodo_nombre || "-",
            movimiento.numero_operacion || "-",
            soles(monto),
        ]],
        theme: "grid",
        headStyles: { fillColor: [30, 64, 175] },
        styles: { fontSize: 9, cellPadding: 2.5 },
    });
    const finalY = documento.lastAutoTable?.finalY || 100;
    documento.setFontSize(11);
    documento.text(`Total recibido: ${soles(monto)}`, 196, finalY + 12, { align: "right" });
    documento.setFontSize(9);
    documento.text(
        `Movimiento de caja: #${movimiento.id_movimientocaja}`,
        14,
        finalY + 22
    );
    if (movimiento.saldo_pendiente != null) {
        documento.text(
            `Saldo pendiente después del pago: ${soles(movimiento.saldo_pendiente)}`,
            14,
            finalY + 29
        );
    }
    return `constancia-pago-${movimiento.id_movimientocaja}.pdf`;
};
