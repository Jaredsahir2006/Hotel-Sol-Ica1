import { fecha } from "./format";

export const crearEnlaceCorreoReserva = (reserva, correo) => {
    const destinatario = String(correo || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
        throw new Error("Ingresa un correo electrónico válido para preparar el mensaje.");
    }

    const asunto = `Confirmación de reserva #${reserva.id_recepcion} - Hotel Sol Ica`;
    const cuerpo = [
        `Hola ${reserva.cliente_nombre || "huésped"},`,
        "",
        `Tu reserva #${reserva.id_recepcion} en Hotel Sol Ica está registrada.`,
        `Habitación: ${reserva.habitacion_numero}`,
        `Entrada: ${fecha(reserva.f_entrada)}`,
        `Salida: ${fecha(reserva.f_salida)}`,
        `Huéspedes: ${reserva.huespedes}`,
        `Total reservado: S/ ${Number(reserva.d_inicial || 0).toFixed(2)}`,
        `Estado: ${reserva.estado_nombre || "Pendiente de check-in"}`,
        "",
        "Adjunta a este correo el comprobante PDF de reserva descargado desde el sistema.",
        "Este documento confirma la reserva y no constituye comprobante de pago.",
        "",
        "Hotel Sol Ica",
    ].join("\n");

    return `mailto:${encodeURIComponent(destinatario)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
};
