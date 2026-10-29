import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Reportes from "./Reportes";
import { generarReporte, obtenerCatalogoReportes } from "../services/reportesService";

jest.mock("../services/reportesService", () => ({
    generarReporte: jest.fn(),
    obtenerCatalogoReportes: jest.fn(),
}));

const reporteEjemplo = (id = "resumen") => ({
    id,
    kpis: [{
        id: "ingresos",
        etiqueta: "Ingresos",
        valor: 250,
        formato: "moneda",
        detalle: "Datos del período",
        icono: "bi-cash",
        color: "emerald",
    }],
    graficos: [{
        id: "por-periodo",
        titulo: "Ingresos por período",
        tipo: "barras",
        etiquetas: ["oct 26"],
        series: [{ nombre: "Ingresos", valores: [250] }],
        formato: "moneda",
    }],
    tablas: [{
        id: "detalle",
        titulo: "Detalle real",
        columnas: [{ clave: "cliente", nombre: "Cliente", tipo: "texto" }],
        filas: [{ cliente: "Ana Huamán" }],
    }],
    contexto: {
        desde: "2026-10-01",
        hasta: "2026-10-28",
        generadoEn: "2026-10-28T15:00:00",
        filtros: [{ etiqueta: "Empresa", valor: "Hotel Sol" }],
    },
});

beforeEach(() => {
    obtenerCatalogoReportes.mockResolvedValue({
        filtros: {
            fechas: { tipo: "fechas", label: "Rango de fechas" },
            periodo: {
                tipo: "select",
                label: "Agrupar por",
                opciones: [{ value: "mes", label: "Mes" }],
            },
            cliente: {
                tipo: "select",
                label: "Persona / cliente",
                opciones: [{ value: "4", label: "Ana Huamán · 12345678" }],
                vacio: "Todas las personas",
            },
            empresa: {
                tipo: "select",
                label: "Empresa",
                opciones: [{ value: "3", label: "Hotel Sol" }],
                vacio: "Todas las empresas",
            },
            usuario: {
                tipo: "select",
                label: "Responsable",
                opciones: [{ value: "2", label: "admin" }],
                vacio: "Todos los responsables",
            },
            categoriaHabitacion: {
                tipo: "select",
                label: "Categoría de habitación",
                opciones: [{ value: "1", label: "Doble" }],
                vacio: "Todas las categorías",
            },
            estadoHabitacion: {
                tipo: "select",
                label: "Estado de habitación",
                opciones: [{ value: "1", label: "Disponible" }],
                vacio: "Todos los estados",
            },
            categoriaProducto: {
                tipo: "select",
                label: "Categoría de producto",
                opciones: [{ value: "2", label: "Bebidas" }],
                vacio: "Todas las categorías",
            },
            estadoReserva: {
                tipo: "select",
                label: "Estado de la reserva",
                opciones: [{ value: "en_curso", label: "En curso" }],
                vacio: "Todos los estados",
            },
            tipoComprobante: {
                tipo: "select",
                label: "Tipo de comprobante",
                opciones: [{ value: "BOLETA", label: "Boletas" }],
                vacio: "Facturas y boletas",
            },
            tipoMovimiento: {
                tipo: "select",
                label: "Tipo de movimiento",
                opciones: [{ value: "1", label: "Ingreso" }],
                vacio: "Ingresos y egresos",
            },
            concepto: {
                tipo: "select",
                label: "Concepto de caja",
                opciones: [{ value: "Hospedaje", label: "Hospedaje" }],
                vacio: "Todos los conceptos",
            },
            caja: {
                tipo: "select",
                label: "Caja",
                opciones: [{ value: "1", label: "Recepción" }],
                vacio: "Todas las cajas",
            },
            metodoPago: {
                tipo: "select",
                label: "Método de pago",
                opciones: [{ value: "1", label: "Efectivo" }],
                vacio: "Todos los métodos",
            },
            afectaEfectivo: {
                tipo: "select",
                label: "Afecta efectivo",
                opciones: [{ value: "S", label: "Sí" }],
                vacio: "Todos",
            },
            accion: {
                tipo: "select",
                label: "Acción",
                opciones: [{ value: "INSERT", label: "Insertar" }],
                vacio: "Todas las acciones",
            },
            tablaAuditada: {
                tipo: "select",
                label: "Tabla auditada",
                opciones: [{ value: "RECEPCION", label: "RECEPCION" }],
                vacio: "Todas las tablas",
            },
            agrupacionClientes: {
                tipo: "select",
                label: "Agrupar ranking por",
                opciones: [
                    { value: "cliente", label: "Persona / cliente" },
                    { value: "empresa", label: "Empresa" },
                ],
            },
        },
    });
    generarReporte.mockImplementation(async (id) => reporteEjemplo(id));
});

test("carga reportes reales, filtros, gráficos, tablas y exportaciones", async () => {
    render(<Reportes />);

    expect(await screen.findByText("Ingresos por período")).toBeInTheDocument();
    expect(screen.getByText("Detalle real")).toBeInTheDocument();
    expect(screen.getByText("Ana Huamán")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar Excel/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar PDF/ })).toBeInTheDocument();
    expect(generarReporte).toHaveBeenCalledWith("resumen", expect.objectContaining({
        desde: expect.any(String),
        hasta: expect.any(String),
    }));
});

test("aplica filtros al generar un reporte y permite seleccionar otro reporte", async () => {
    render(<Reportes />);
    await screen.findByText("Ingresos por período");
    fireEvent.change(screen.getByLabelText("Persona / cliente"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-04" } });
    await act(async () => userEvent.click(screen.getByRole("button", { name: "Generar reporte" })));

    await waitFor(() => expect(generarReporte).toHaveBeenLastCalledWith("resumen", expect.objectContaining({
        desde: "2026-10-04",
        cliente: "4",
    })));

    await userEvent.click(screen.getByRole("button", { name: /Estadísticos/ }));
    await userEvent.click(screen.getByRole("button", { name: /Ventas por producto y categoría/ }));
    expect(screen.getByRole("heading", { name: "Ventas por producto y categoría" })).toBeInTheDocument();
    await act(async () => userEvent.click(screen.getByRole("button", { name: "Generar reporte" })));
    await waitFor(() => expect(generarReporte).toHaveBeenLastCalledWith("ventas", expect.objectContaining({
        desde: "2026-10-04",
        cliente: "4",
    })));
});

test("el constructor permite escoger el conjunto y la agregación personalizada", async () => {
    render(<Reportes />);
    await screen.findByText("Ingresos por período");
    await userEvent.click(screen.getByRole("button", { name: /Personalizados/ }));
    await userEvent.click(screen.getByRole("button", { name: /Constructor personalizado/ }));

    expect(screen.getByLabelText("Conjunto de datos")).toHaveValue("reservas");
    expect(screen.getByLabelText("Agrupar por")).toHaveValue("periodo");
    await userEvent.selectOptions(screen.getByLabelText("Conjunto de datos"), "ventas");
    expect(screen.getByLabelText("Métrica")).toHaveValue("importe");
    await userEvent.selectOptions(screen.getByLabelText("Agrupar por"), "producto");
    await act(async () => userEvent.click(screen.getByRole("button", { name: "Generar reporte" })));

    await waitFor(() => expect(generarReporte).toHaveBeenLastCalledWith("personalizado", expect.objectContaining({
        dataset: "ventas",
        agruparPor: "producto",
    })));
});
