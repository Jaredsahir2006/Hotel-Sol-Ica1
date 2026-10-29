import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HistorialTrazabilidad from "./HistorialTrazabilidad";
import { listarHistorial, listarUsuariosHistorial } from "../services/historialService";

jest.mock("../services/historialService", () => ({
    listarHistorial: jest.fn(),
    listarUsuariosHistorial: jest.fn(),
}));

const evento = {
    id_auditoria: 17,
    f_evento: "2026-10-28T15:00:00.000Z",
    id_usuario: 4,
    n_tabla: "RECEPCION",
    accion: "UPDATE",
    id_registro: 82,
    terminal: "PC-RECEPCION",
    ip: "192.0.2.10",
    valor_anterior: '{"estado":"RESERVA"}',
    valor_nuevo: '{"estado":"CHECK_IN"}',
};

beforeEach(() => {
    listarUsuariosHistorial.mockResolvedValue([{ id_usuario: 4, logeo: "recepcionista" }]);
    listarHistorial.mockResolvedValue({
        data: [evento],
        total: 1,
        pagina: 1,
        pageSize: 25,
        totalPaginas: 1,
    });
});

test("muestra la trazabilidad y permite revisar los valores del cambio", async () => {
    render(<HistorialTrazabilidad />);

    expect(await screen.findByText("RECEPCION")).toBeInTheDocument();
    expect(screen.getAllByText("recepcionista")).toHaveLength(2);
    expect(screen.getByText("UPDATE")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ver cambios" }));
    expect(screen.getByText(/"estado": "RESERVA"/)).toBeInTheDocument();
    expect(screen.getByText(/"estado": "CHECK_IN"/)).toBeInTheDocument();
});

test("aplica el rango de fechas, usuario y acción seleccionados", async () => {
    render(<HistorialTrazabilidad />);
    await screen.findByText("RECEPCION");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-28" } });
    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Acción"), { target: { value: "UPDATE" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() => {
        expect(listarHistorial).toHaveBeenLastCalledWith(expect.objectContaining({
            desde: "2026-10-01",
            hasta: "2026-10-28",
            usuario: "4",
            accion: "UPDATE",
            pagina: 1,
        }));
    });
});

test("advierte si el rango de fechas no es válido y conserva el resultado visible", async () => {
    render(<HistorialTrazabilidad />);
    await screen.findByText("RECEPCION");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-29" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-28" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
        "La fecha inicial no puede ser posterior a la fecha final."
    );
    expect(listarHistorial).toHaveBeenCalledTimes(1);
});
