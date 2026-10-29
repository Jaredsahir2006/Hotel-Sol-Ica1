import { crearEnlaceCorreoReserva } from "./comprobanteReserva";

test("prepara un correo con el resumen de reserva y estado pendiente de check-in", () => {
    const enlace = crearEnlaceCorreoReserva({
        id_recepcion: 42,
        cliente_nombre: "Ana Huamán",
        habitacion_numero: "204",
        f_entrada: "2026-10-29",
        f_salida: "2026-10-31",
        huespedes: 2,
        d_inicial: 240,
    }, "ana@example.com");
    const url = new URL(enlace);

    expect(url.protocol).toBe("mailto:");
    expect(decodeURIComponent(url.pathname)).toBe("ana@example.com");
    expect(url.searchParams.get("subject")).toContain("reserva #42");
    expect(url.searchParams.get("body")).toContain("Habitación: 204");
    expect(url.searchParams.get("body")).toContain("Total reservado: S/ 240.00");
    expect(url.searchParams.get("body")).toContain("no constituye comprobante de pago");
});

test("rechaza direcciones incompletas antes de crear el borrador", () => {
    expect(() => crearEnlaceCorreoReserva({ id_recepcion: 1 }, "sin-correo"))
        .toThrow("correo electrónico válido");
});
