import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckInOut from "./CheckInOut";
import Facturacion from "./Facturacion";
import Pagos from "./Pagos";
import Reservas from "./Reservas";
import Consumos from "./Consumos";
import { hoy, sumarDias } from "../utils/format";
import {
    abrirCaja,
    buscarDisponibilidadHabitaciones,
    listarCatalogosReserva,
    listarAperturasAbiertas,
    listarCatalogosPago,
    listarClientes,
    listarComprobantes,
    listarHabitaciones,
    listarPagos,
    listarRecepciones,
    listarRecepcionesPendientesPago,
    listarRecepcionesFacturables,
    obtenerArqueoCaja,
    obtenerUltimaAperturaCaja,
    cerrarCaja,
    registrarReserva,
    registrarCheckIn,
    registrarIngresoReserva,
    listarRecepcionesHospedadas,
    listarProductosConsumo,
    listarConsumosRecepcion,
    registrarConsumo,
    registrarCheckOut,
    registrarPago,
} from "../services/procesosService";

jest.mock("../services/procesosService", () => ({
    abrirCaja: jest.fn(),
    buscarDisponibilidadHabitaciones: jest.fn(),
    cerrarCaja: jest.fn(),
    emitirComprobante: jest.fn(),
    listarAperturasAbiertas: jest.fn(),
    listarCatalogosPago: jest.fn(),
    listarClientes: jest.fn(),
    listarComprobantes: jest.fn(),
    listarHabitaciones: jest.fn(),
    listarPagos: jest.fn(),
    listarRecepciones: jest.fn(),
    listarRecepcionesPendientesPago: jest.fn(),
    listarRecepcionesFacturables: jest.fn(),
    obtenerArqueoCaja: jest.fn(),
    obtenerUltimaAperturaCaja: jest.fn(),
    registrarCheckIn: jest.fn(),
    registrarIngresoReserva: jest.fn(),
    listarRecepcionesHospedadas: jest.fn(),
    listarProductosConsumo: jest.fn(),
    listarConsumosRecepcion: jest.fn(),
    registrarConsumo: jest.fn(),
    registrarCheckOut: jest.fn(),
    registrarPago: jest.fn(),
    registrarReserva: jest.fn(),
    listarCatalogosReserva: jest.fn(),
}));

const crearRecepciones = (cantidad) =>
    Array.from({ length: cantidad }, (_, index) => ({
        id_recepcion: index + 1,
        cliente_nombre: `Huesped ${index + 1}`,
        cliente_documento: `DNI${index + 1}`,
        habitacion_numero: index + 1,
        f_entrada: "2026-10-01",
        f_salida: "2026-10-02",
        d_inicial: 100,
        t_pagado: 0,
        totaldeuda: 100,
        f_salidac: null,
    }));

const crearComprobantes = (cantidad) =>
    Array.from({ length: cantidad }, (_, index) => ({
        id_factura: index + 1,
        pk: "id_factura",
        tipo: "FACTURA",
        serie: "F001",
        numero: String(index + 1).padStart(8, "0"),
        f_emision: "2026-10-01",
        id_recepcion: index + 1,
        cliente_nombre: `Cliente ${index + 1}`,
        cliente_documento: `RUC${index + 1}`,
        total: 100,
    }));

const crearPagos = (cantidad) =>
    Array.from({ length: cantidad }, (_, index) => ({
        id_movimientocaja: index + 1,
        f_movimiento: "2026-10-01",
        tipo_nombre: "Ingreso",
        tipo_signo: "+",
        concepto_nombre: `Pago ${index + 1}`,
        recepcion_numero: index + 1,
        metodo_nombre: "Efectivo",
        numero_operacion: `OP${index + 1}`,
        monto: 100,
    }));

beforeEach(() => {
    listarHabitaciones.mockResolvedValue([]);
    listarClientes.mockResolvedValue([]);
    listarRecepciones.mockResolvedValue(crearRecepciones(30));
    listarCatalogosPago.mockResolvedValue({
        cajas: [],
        usuarios: [],
        metodos: [],
        conceptos: [],
        tipos: [],
    });
    listarComprobantes.mockResolvedValue(crearComprobantes(30));
    listarRecepcionesFacturables.mockResolvedValue([]);
    listarAperturasAbiertas.mockResolvedValue([]);
    listarRecepcionesPendientesPago.mockResolvedValue([]);
    listarPagos.mockResolvedValue(crearPagos(30));
    buscarDisponibilidadHabitaciones.mockResolvedValue([]);
    listarCatalogosReserva.mockResolvedValue({
        clientes: [],
        identidades: [{ id_tipoidentidad: 1, abreviatura: "DNI" }],
        distritos: [{ id_distrito: 5, d_distrito: "Ica" }],
        metodos: [{ id_metodopago: 2, n_metodopago: "Efectivo" }],
    });
    registrarIngresoReserva.mockResolvedValue({});
    listarRecepcionesHospedadas.mockResolvedValue([]);
    listarProductosConsumo.mockResolvedValue([]);
    listarConsumosRecepcion.mockResolvedValue([]);
    registrarConsumo.mockResolvedValue({ total: 0 });
});

test("registra consumos para un huésped alojado y los asocia a su recepción", async () => {
    listarConsumosRecepcion.mockClear();
    listarRecepcionesHospedadas.mockResolvedValue([{
        id_recepcion: 42,
        cliente_nombre: "Juan Carlos Pérez López",
        cliente_documento: "12345678",
        habitacion_numero: "102",
        totaldeuda: 100,
    }]);
    listarProductosConsumo.mockResolvedValue([{
        id_producto: 9,
        n_producto: "Desayuno Buffet",
        precio: 25,
    }]);
    registrarConsumo.mockResolvedValue({ total: 50 });
    render(<Consumos />);

    await screen.findByRole("option", { name: /Juan Carlos Pérez López/ });
    await act(async () => userEvent.selectOptions(screen.getByLabelText("Huésped alojado"), "42"));
    expect(await screen.findByText("Aún no hay consumos registrados.")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Servicio o producto"), "9");
    await userEvent.clear(screen.getByLabelText("Cantidad"));
    await userEvent.type(screen.getByLabelText("Cantidad"), "2");
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(screen.getByText("Total nuevo: S/ 50.00")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Registrar consumo" }));
    await waitFor(() => expect(registrarConsumo).toHaveBeenCalledWith({
        id_recepcion: 42,
        items: [{ id_producto: 9, cantidad: 2 }],
    }));
    expect(await screen.findByText(/Consumo registrado por S\/ 50.00/)).toBeInTheDocument();
    await waitFor(() => expect(listarConsumosRecepcion).toHaveBeenCalledTimes(2));
});

test("registra el check-in sobre una reserva existente sin crear otra recepción", async () => {
    listarRecepciones.mockResolvedValue([{
        ...crearRecepciones(1)[0],
        f_entrada: hoy(),
        habitacion_estado: "Disponible",
    }]);
    render(<CheckInOut />);

    await screen.findByText("Huesped 1");
    await userEvent.click(screen.getByRole("button", { name: "Registrar check-in" }));

    await waitFor(() => expect(registrarIngresoReserva).toHaveBeenCalledWith(1));
    expect(await screen.findByText(/Check-in registrado para la habitación 1/)).toBeInTheDocument();
    expect(registrarCheckIn).not.toHaveBeenCalled();
});

test("prepara la pre-cuenta con consumos y confirma el check-out", async () => {
    const recepcion = {
        ...crearRecepciones(1)[0],
        id_recepcion: 42,
        cliente_nombre: "Juan Carlos Pérez López",
        cliente_documento: "12345678",
        habitacion_numero: "102",
        f_entrada: hoy(),
        f_salida: sumarDias(hoy(), 1),
        d_inicial: 100,
        d_asistente: 50,
        t_pagado: 25,
        totaldeuda: 125,
        habitacion_estado: "Ocupada",
    };
    listarRecepciones.mockResolvedValue([recepcion]);
    listarConsumosRecepcion.mockResolvedValue([{
        id_detalle: 1,
        id_producto: 9,
        producto_nombre: "Desayuno Buffet",
        cantidad: 2,
        sub_total: 50,
    }]);
    registrarCheckOut.mockResolvedValue({});
    const confirmar = jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<CheckInOut />);

    await screen.findByText("Juan Carlos Pérez López");
    await userEvent.click(screen.getByRole("button", { name: "Preparar check-out" }));
    expect(await screen.findByText("Preparar check-out · Recepción #42")).toBeInTheDocument();
    expect(await screen.findByText("Desayuno Buffet")).toBeInTheDocument();
    expect(screen.getByText("Saldo pendiente:").parentElement).toHaveTextContent("S/ 125.00");

    expect(screen.getByRole("button", { name: "Generar pre-cuenta" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Registrar check-out" }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("S/ 125.00"));
    await waitFor(() => expect(registrarCheckOut).toHaveBeenCalledWith(42));
    expect(await screen.findByText("Check-out registrado. La habitación quedó disponible.")).toBeInTheDocument();
    confirmar.mockRestore();
});

test("Check-in/Check-out pagina las recepciones", async () => {
    render(<CheckInOut />);

    await screen.findByText("Huesped 1");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Huesped 26")).toBeInTheDocument();
    expect(screen.queryByText("Huesped 1")).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 26–30 de 30 registros/)).toBeInTheDocument();
});

test("Facturación pagina los comprobantes filtrados", async () => {
    render(<Facturacion />);

    await screen.findByText("Cliente 1");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Cliente 26")).toBeInTheDocument();
    expect(screen.queryByText("Cliente 1")).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 26–30 de 30 registros/)).toBeInTheDocument();
});

test("Facturación requiere una caja abierta para emitir comprobantes", async () => {
    listarAperturasAbiertas.mockResolvedValue([]);
    render(<Facturacion />);

    expect(await screen.findByText(/Debes abrir una caja desde Finanzas y caja/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Emitir comprobante" })).toBeDisabled();
});

test("Reservas busca habitaciones por fechas y huéspedes y permite seleccionarlas", async () => {
    const entrada = sumarDias(hoy(), 1);
    const salida = sumarDias(entrada, 2);
    buscarDisponibilidadHabitaciones.mockResolvedValue([
        {
            id_habitacion: 17,
            numero: "204",
            categoria_nombre: "Doble",
            piso_nombre: "Segundo piso",
            estado_nombre: "Disponible",
            detalle: "Vista interior",
            precio: 120,
        },
    ]);
    render(<Reservas />);

    fireEvent.change(screen.getByLabelText("Fecha de entrada"), { target: { value: entrada } });
    fireEvent.change(screen.getByLabelText("Fecha de salida"), { target: { value: salida } });
    fireEvent.change(screen.getByLabelText("Número de huéspedes"), { target: { value: "3" } });
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Habitación 204")).toBeInTheDocument();
    expect(screen.getByText("S/ 240.00")).toBeInTheDocument();
    expect(buscarDisponibilidadHabitaciones).toHaveBeenCalledWith({
        f_entrada: entrada,
        f_salida: salida,
    });

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar" }));
    expect(await screen.findByRole("heading", { name: "Nueva reserva" })).toBeInTheDocument();
    expect(screen.getByText(`Habitación 204 · ${entrada} al ${salida} · 3 huésped(es)`)).toBeInTheDocument();
});

test("reserva una habitación seleccionada con un huésped existente sin cobrar ni hacer check-in", async () => {
    const entrada = sumarDias(hoy(), 1);
    const salida = sumarDias(entrada, 2);
    buscarDisponibilidadHabitaciones.mockResolvedValue([{
        id_habitacion: 17,
        numero: "204",
        categoria_nombre: "Doble",
        estado_nombre: "Disponible",
        precio: 120,
    }]);
    listarCatalogosReserva.mockResolvedValue({
        clientes: [{
            id_cliente: 9,
            id_persona: 21,
            nombre: "Ana Huamán",
            documento: "12345678",
            email: "ana@example.com",
        }],
        identidades: [{ id_tipoidentidad: 1, abreviatura: "DNI" }],
        distritos: [{ id_distrito: 5, d_distrito: "Ica" }],
        metodos: [{ id_metodopago: 2, n_metodopago: "Efectivo" }],
    });
    registrarReserva.mockResolvedValue({
        id_recepcion: 42,
        d_inicial: 240,
        f_entrada: entrada,
        f_salida: salida,
        cliente_nombre: "Ana Huamán",
    });
    render(<Reservas onVerReservas={jest.fn()} />);

    fireEvent.change(screen.getByLabelText("Fecha de entrada"), { target: { value: entrada } });
    fireEvent.change(screen.getByLabelText("Fecha de salida"), { target: { value: salida } });
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Seleccionar" }));
    await userEvent.click(await screen.findByRole("radio", { name: /Usar huésped registrado/ }));
    await userEvent.selectOptions(screen.getByLabelText("Huésped registrado"), "9");
    await userEvent.click(screen.getByRole("button", { name: /Siguiente: detalles de reserva/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Guardar reserva" }));

    await waitFor(() => expect(registrarReserva).toHaveBeenCalledWith(expect.objectContaining({
        id_cliente: 9,
        id_habitacion: 17,
        id_metodopago: 2,
        f_entrada: entrada,
        f_salida: salida,
        huespedes: 2,
        total: 240,
    })));
    expect(await screen.findByText("Reserva registrada correctamente")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Huésped: Ana Huamán");
    expect(screen.getByText("Pendiente de check-in")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preparar correo" }).getAttribute("href"))
        .toContain("mailto:ana%40example.com");
    expect(screen.getByRole("button", { name: "Descargar comprobante PDF" })).toBeInTheDocument();
});

test("muestra un error al guardar si la habitación dejó de estar disponible", async () => {
    const entrada = sumarDias(hoy(), 1);
    const salida = sumarDias(entrada, 1);
    buscarDisponibilidadHabitaciones.mockResolvedValue([{
        id_habitacion: 17,
        numero: "204",
        categoria_nombre: "Doble",
        estado_nombre: "Disponible",
        precio: 120,
    }]);
    listarCatalogosReserva.mockResolvedValue({
        clientes: [{ id_cliente: 9, nombre: "Ana Huamán", documento: "12345678" }],
        identidades: [],
        distritos: [],
        metodos: [{ id_metodopago: 2, n_metodopago: "Efectivo" }],
    });
    registrarReserva.mockRejectedValue(new Error("La habitación ya no está disponible"));
    render(<Reservas />);

    fireEvent.change(screen.getByLabelText("Fecha de entrada"), { target: { value: entrada } });
    fireEvent.change(screen.getByLabelText("Fecha de salida"), { target: { value: salida } });
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Seleccionar" }));
    await userEvent.click(await screen.findByRole("radio", { name: /Usar huésped registrado/ }));
    await userEvent.selectOptions(screen.getByLabelText("Huésped registrado"), "9");
    await userEvent.click(screen.getByRole("button", { name: /Siguiente: detalles de reserva/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Guardar reserva" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La habitación ya no está disponible");
    expect(screen.queryByText("Reserva registrada correctamente")).not.toBeInTheDocument();
});

test("Pagos y caja pagina todos los movimientos recibidos", async () => {
    render(<Pagos />);

    await screen.findByText("Pago 1");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Pago 26")).toBeInTheDocument();
    expect(screen.queryByText("Pago 1")).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 26–30 de 30 registros/)).toBeInTheDocument();
    await waitFor(() => expect(listarPagos).toHaveBeenCalledTimes(1));
});

test("registra un cobro de recepción y ofrece descargar su constancia interna", async () => {
    listarAperturasAbiertas.mockResolvedValue([{
        id_aperturacaja: 8,
        numero_turno: "T0008",
        caja_nombre: "Recepción",
    }]);
    listarCatalogosPago.mockResolvedValue({
        cajas: [],
        usuarios: [],
        metodos: [{ id_metodopago: 2, n_metodopago: "Efectivo" }],
        conceptos: [{ id_concepto: 5, n_concepto: "Pago de hospedaje", id_tipomovimiento: 3 }],
        tipos: [{ id_tipomovimiento: 3, n_tipomovimiento: "Ingreso", signo: "+" }],
    });
    listarRecepcionesPendientesPago.mockResolvedValue([{
        id_recepcion: 42,
        cliente_nombre: "Ana Huamán",
        cliente_documento: "12345678",
        habitacion_numero: "102",
        saldo_pendiente: 75,
        totaldeuda: 75,
    }]);
    registrarPago.mockResolvedValue({
        id_movimientocaja: 19,
        f_movimiento: "2026-10-28T15:00:00",
        numero_operacion: "OP-19",
        saldo_anterior: 75,
        saldo_pendiente: 45,
        total_pagado: 30,
    });
    render(<Pagos />);

    await userEvent.selectOptions(await screen.findByLabelText("Recepción con saldo (opcional)"), "42");
    await userEvent.selectOptions(screen.getByLabelText("Concepto *"), "5");
    await userEvent.selectOptions(screen.getByLabelText("Método de pago *"), "2");
    await userEvent.clear(screen.getByLabelText(/Monto \(S\/\)/));
    await userEvent.type(screen.getByLabelText(/Monto \(S\/\)/), "30");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(() => expect(registrarPago).toHaveBeenCalledWith(expect.objectContaining({
        id_aperturacaja: "8",
        id_recepcion: "42",
        id_concepto: "5",
        id_metodopago: "2",
        id_tipomovimiento: 3,
        monto: 30,
    })));
    expect(await screen.findByText("Comprobante de pago generado · CP-19")).toBeInTheDocument();
    expect(screen.getByText("Saldo restante:").parentElement).toHaveTextContent("S/ 45.00");
    expect(screen.getByRole("button", { name: "Descargar constancia" })).toBeInTheDocument();
    expect(screen.getByText(/no reemplaza una boleta o factura/i)).toBeInTheDocument();
});

test("impide cobrar a una recepción un importe superior a su saldo", async () => {
    listarAperturasAbiertas.mockResolvedValue([{ id_aperturacaja: 8, numero_turno: "T0008" }]);
    listarCatalogosPago.mockResolvedValue({
        cajas: [],
        usuarios: [],
        metodos: [{ id_metodopago: 2, n_metodopago: "Efectivo" }],
        conceptos: [{ id_concepto: 5, n_concepto: "Pago de hospedaje", id_tipomovimiento: 3 }],
        tipos: [{ id_tipomovimiento: 3, n_tipomovimiento: "Ingreso", signo: "+" }],
    });
    listarRecepcionesPendientesPago.mockResolvedValue([{
        id_recepcion: 42,
        cliente_nombre: "Ana Huamán",
        saldo_pendiente: 75,
        totaldeuda: 75,
    }]);
    render(<Pagos />);

    await userEvent.selectOptions(await screen.findByLabelText("Recepción con saldo (opcional)"), "42");
    await userEvent.selectOptions(screen.getByLabelText("Concepto *"), "5");
    await userEvent.selectOptions(screen.getByLabelText("Método de pago *"), "2");
    await userEvent.clear(screen.getByLabelText(/Monto \(S\/\)/));
    await userEvent.type(screen.getByLabelText(/Monto \(S\/\)/), "80");
    await userEvent.click(screen.getByRole("button", { name: "Registrar pago" }));

    expect(await screen.findByText(/no puede superar el saldo pendiente de S\/ 75\.00/i)).toBeInTheDocument();
    expect(registrarPago).not.toHaveBeenCalled();
});

test("la apertura propone el fondo del cierre anterior y registra notas", async () => {
    listarCatalogosPago.mockResolvedValue({
        cajas: [{ id_caja: 7, n_caja: "Recepción", monto_base: 50 }],
        usuarios: [],
        metodos: [],
        conceptos: [],
        tipos: [],
    });
    obtenerUltimaAperturaCaja.mockResolvedValue({
        numero_turno: "T0001",
        monto_declarado: 80,
        saldo_siguiente: 30,
    });
    abrirCaja.mockResolvedValue({
        id_aperturacaja: 2,
        numero_turno: "T0002",
        f_apertura: "2026-10-28T08:00:00",
    });
    render(<Pagos />);

    await screen.findByText("Pago 1");
    await userEvent.click(screen.getByRole("button", { name: "Abrir caja" }));
    expect(screen.getByLabelText("Fecha").value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByLabelText("Usuario")).toHaveValue("Usuario actual");
    expect(screen.getByLabelText("Turno *")).toHaveValue("Mañana");
    await screen.findByRole("option", { name: "Recepción" });
    await userEvent.selectOptions(screen.getByLabelText(/Caja/), "7");
    await screen.findByText(/Último cierre:/);
    expect(screen.getByLabelText(/Fondo inicial contado/)).toHaveValue(30);
    await userEvent.clear(screen.getByLabelText(/Notas de apertura/));
    await userEvent.type(screen.getByLabelText(/Notas de apertura/), "Billetes revisados");
    await userEvent.click(screen.getByRole("button", { name: "Aperturar" }));

    await waitFor(() => expect(abrirCaja).toHaveBeenCalledWith(expect.objectContaining({
        id_caja: 7,
        monto_inicial: 30,
        observacion: "Billetes revisados",
        turno: "Mañana",
        saldo_anterior: 30,
    })));
    expect(await screen.findByRole("status")).toHaveTextContent("Caja abierta correctamente");
    expect(screen.getByRole("status")).toHaveTextContent("T0002");
});

test("el cierre captura conteos, fondo de siguiente turno y observación", async () => {
    const apertura = {
        id_aperturacaja: 8,
        numero_turno: "T0008",
        caja_nombre: "Recepción",
        usuario_nombre: "cajero",
        f_apertura: "2026-10-28T08:00:00",
        monto_inicial: 50,
        monto_sistema: 75,
    };
    listarAperturasAbiertas.mockResolvedValue([apertura]);
    listarCatalogosPago.mockResolvedValue({
        cajas: [],
        usuarios: [],
        metodos: [
            { id_metodopago: 1, n_metodopago: "Efectivo" },
            { id_metodopago: 2, n_metodopago: "Tarjeta" },
        ],
        conceptos: [],
        tipos: [],
    });
    obtenerArqueoCaja.mockResolvedValue({
        apertura,
        metodos: [
            { id_metodopago: 1, nombre: "Efectivo", esperado: 75 },
            { id_metodopago: 2, nombre: "Tarjeta", esperado: 20 },
        ],
    });
    cerrarCaja.mockResolvedValue({
        ...apertura,
        f_cierre: "2026-10-28T16:00:00",
        monto_sistema: 75,
        monto_declarado: 70,
        diferencia: -5,
        arqueo: [
            { metodo: "Efectivo", esperado: 75, contado: 70 },
            { metodo: "Tarjeta", esperado: 20, contado: 20 },
        ],
        fondo_siguiente: 20,
    });
    render(<Pagos />);

    await userEvent.click(await screen.findByRole("button", { name: "Iniciar arqueo y cierre" }));
    await screen.findByRole("dialog");
    await userEvent.type(screen.getByLabelText("Contado Efectivo"), "70");
    await userEvent.type(screen.getByLabelText("Contado Tarjeta"), "20");
    await userEvent.type(screen.getByLabelText(/Efectivo que queda como fondo/), "20");
    await userEvent.type(screen.getByLabelText(/Observaciones de cierre/), "Un voucher pendiente");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cierre" }));

    await waitFor(() => expect(cerrarCaja).toHaveBeenCalledWith(8, expect.objectContaining({
        monto_declarado: 70,
        fondo_siguiente: 20,
        observacion: "Un voucher pendiente",
        conteo_metodos: [
            { id_metodopago: 1, metodo: "Efectivo", contado: "70" },
            { id_metodopago: 2, metodo: "Tarjeta", contado: "20" },
        ],
    })));
    expect(await screen.findByText(/Cierre de T0008 registrado/)).toBeInTheDocument();
});
