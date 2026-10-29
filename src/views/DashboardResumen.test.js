import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardResumen from "./DashboardResumen";
import { cargarResumenDashboard } from "../services/dashboardService";

jest.mock("../services/dashboardService", () => ({
    cargarResumenDashboard: jest.fn(),
}));

const resumenPrueba = {
    indicadores: [
        {
            id: "reservas",
            etiqueta: "Reservas este mes",
            valor: 2,
            detalle: "Con fecha de ingreso este mes",
            icono: "bi-calendar-check",
            color: "blue",
        },
        {
            id: "ingresos",
            etiqueta: "Ingresos de caja este mes",
            valor: 150,
            formato: "moneda",
            detalle: "Movimientos de ingreso registrados",
            icono: "bi-cash-coin",
            color: "emerald",
        },
        {
            id: "ocupadas",
            etiqueta: "Habitaciones ocupadas",
            valor: 1,
            detalle: "50% de 2 habitaciones",
            icono: "bi-door-closed",
            color: "amber",
        },
        {
            id: "disponibles",
            etiqueta: "Habitaciones disponibles",
            valor: 1,
            detalle: "Disponibles según su estado actual",
            icono: "bi-door-open",
            color: "violet",
        },
    ],
    graficoIngresos: { etiquetas: ["nov", "dic", "ene", "feb", "mar", "abr"], valores: [0, 0, 0, 0, 0, 150] },
    graficoHabitaciones: [{ estado: "Ocupadas", cantidad: 1 }, { estado: "Disponibles", cantidad: 1 }],
    reservasRecientes: [],
    actividades: [],
};

describe("DashboardResumen", () => {
    beforeEach(() => {
        cargarResumenDashboard.mockReset();
    });

    it("muestra un estado de carga y luego los indicadores reales", async () => {
        cargarResumenDashboard.mockResolvedValue(resumenPrueba);

        render(<DashboardResumen />);

        expect(screen.getByLabelText("Cargando indicadores")).toBeInTheDocument();
        expect(await screen.findByText("Ingresos de caja este mes")).toBeInTheDocument();
        expect(screen.getByText("S/ 150.00")).toBeInTheDocument();
    });

    it("muestra el error de lectura y permite reintentar", async () => {
        cargarResumenDashboard
            .mockRejectedValueOnce(new Error("Error de permisos RLS"))
            .mockResolvedValueOnce(resumenPrueba);

        render(<DashboardResumen />);

        expect(await screen.findByRole("alert")).toHaveTextContent("Error de permisos RLS");
        fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

        await waitFor(() => {
            expect(cargarResumenDashboard).toHaveBeenCalledTimes(2);
        });
        expect(await screen.findByText("Reservas este mes")).toBeInTheDocument();
    });
});
