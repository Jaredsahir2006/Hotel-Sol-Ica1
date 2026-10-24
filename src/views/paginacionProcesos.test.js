import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckInOut from "./CheckInOut";
import Facturacion from "./Facturacion";
import Pagos from "./Pagos";
import {
    listarAperturasAbiertas,
    listarCatalogosPago,
    listarClientes,
    listarComprobantes,
    listarHabitaciones,
    listarPagos,
    listarRecepciones,
    listarRecepcionesActivas,
    listarRecepcionesFacturables,
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

test("Pagos y caja pagina todos los movimientos recibidos", async () => {
    render(<Pagos />);

    await screen.findByText("Pago 1");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Pago 26")).toBeInTheDocument();
    expect(screen.queryByText("Pago 1")).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 26–30 de 30 registros/)).toBeInTheDocument();
    await waitFor(() => expect(listarPagos).toHaveBeenCalledTimes(1));
});
