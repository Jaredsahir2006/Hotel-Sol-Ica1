import { clasificarEstadoReserva } from "./reportes";

const hoy = "2026-10-29";

test("clasifica como próxima una reserva con entrada futura", () => {
    expect(
        clasificarEstadoReserva({ f_entrada: "2026-10-30", f_salidac: null }, "Disponible", hoy)
    ).toBe("proxima");
});

test("distingue la reserva pendiente del huésped que ya ingresó", () => {
    const recepcion = { f_entrada: hoy, f_salidac: null };

    expect(clasificarEstadoReserva(recepcion, "Disponible", hoy)).toBe("pendiente_checkin");
    expect(clasificarEstadoReserva(recepcion, "Ocupada", hoy)).toBe("en_curso");
});

test("prioriza el check-out registrado para clasificar la estadía finalizada", () => {
    expect(
        clasificarEstadoReserva(
            { f_entrada: "2026-10-28", f_salidac: "2026-10-29T10:00:00" },
            "Disponible",
            hoy
        )
    ).toBe("finalizada");
});
