import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckInOut from "./CheckInOut";
import Facturacion from "./Facturacion";
import Pagos from "./Pagos";
import {
    abrirCaja,
    listarAperturasAbiertas,
    listarCatalogosPago,
    listarClientes,
    listarComprobantes,
    listarHabitaciones,
    listarPagos,
    listarRecepciones,
    listarRecepcionesActivas,
    listarRecepcionesFacturables,
    obtenerArqueoCaja,
    obtenerUltimaAperturaCaja,
    cerrarCaja,
} from "../services/procesosService";

jest.mock("../services/procesosService", () => ({
    abrirCaja: jest.fn(),
    cerrarCaja: jest.fn(),
    emitirComprobante: jest.fn(),
    listarAperturasAbiertas: jest.fn(),
    listarCatalogosPago: jest.fn(),
    listarClientes: jest.fn(),
    listarComprobantes: jest.fn(),
    listarHabitaciones: jest.fn(),
    listarPagos: jest.fn(),
    listarRecepciones: jest.fn(),
    listarRecepcionesActivas: jest.fn(),
    listarRecepcionesFacturables: jest.fn(),
    obtenerArqueoCaja: jest.fn(),
    obtenerUltimaAperturaCaja: jest.fn(),
    registrarCheckIn: jest.fn(),
    registrarCheckOut: jest.fn(),
    registrarPago: jest.fn(),
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
    listarRecepcionesActivas.mockResolvedValue([]);
    listarPagos.mockResolvedValue(crearPagos(30));
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

test("Pagos y caja pagina todos los movimientos recibidos", async () => {
    render(<Pagos />);

    await screen.findByText("Pago 1");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Pago 26")).toBeInTheDocument();
    expect(screen.queryByText("Pago 1")).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 26–30 de 30 registros/)).toBeInTheDocument();
    await waitFor(() => expect(listarPagos).toHaveBeenCalledTimes(1));
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
    abrirCaja.mockResolvedValue({ id_aperturacaja: 2 });
    render(<Pagos />);

    await screen.findByText("Pago 1");
    await userEvent.click(screen.getByRole("button", { name: "Abrir caja" }));
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
        saldo_anterior: 30,
    })));
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
