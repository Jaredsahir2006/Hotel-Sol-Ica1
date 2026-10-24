import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CrudModule from "./CrudModule";
import { listar, listarPaginado } from "../services/crudService";
import { consultarDocumento } from "../services/factilizaService";

jest.mock("../services/crudService", () => ({
    listar: jest.fn(),
    listarPaginado: jest.fn(),
    POR_PAGINA: 25,
    insertar: jest.fn(),
    actualizar: jest.fn(),
    eliminar: jest.fn(),
}));

jest.mock("../services/factilizaService", () => ({
    consultarDocumento: jest.fn(),
}));

beforeEach(() => {
    listar.mockImplementation(async (tabla) => {
        if (tabla === "tipo_identidad") {
            return [{ id_tipoidentidad: 1, abreviatura: "DNI" }];
        }
        if (tabla === "distrito") {
            return [{ id_distrito: 1, d_distrito: "Ica" }];
        }
        return [];
    });
    listarPaginado.mockResolvedValue({
        data: [],
        total: 0,
        pagina: 1,
        totalPaginas: 1,
    });
    consultarDocumento.mockReset();
});

test("consulta DNI y precarga los datos de persona sin guardar el registro", async () => {
    consultarDocumento.mockResolvedValue({
        numero: "12345678",
        nombres: "ANA MARIA",
        apellido_paterno: "PEREZ",
        apellido_materno: "LOPEZ",
        fecha_nacimiento: "1990-03-12",
        sexo: "F",
        direccion: "Av. Ica 123",
    });
    render(<CrudModule entidadKey="huespedes" />);

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo" }));
    await userEvent.type(screen.getByLabelText(/N° de documento/), "12345678");
    await userEvent.click(screen.getByRole("button", { name: /consultar dni en factiliza/i }));

    await waitFor(() => expect(screen.getByLabelText("Nombres *")).toHaveValue("ANA MARIA"));
    expect(screen.getByLabelText("Apellido paterno *")).toHaveValue("PEREZ");
    expect(screen.getByLabelText("Apellido materno")).toHaveValue("LOPEZ");
    expect(screen.getByLabelText("Fecha de nacimiento")).toHaveValue("1990-03-12");
    expect(screen.getByLabelText("Género")).toHaveValue("F");
    expect(screen.getByLabelText("Dirección")).toHaveValue("Av. Ica 123");
    expect(screen.getByLabelText("Tipo de documento *")).toHaveValue("1");
    expect(screen.getByLabelText("Distrito *")).toHaveValue("");
    expect(consultarDocumento).toHaveBeenCalledWith("dni", "12345678");
});

test("consulta RUC y precarga los datos de empresa sin guardar el registro", async () => {
    consultarDocumento.mockResolvedValue({
        numero: "20123456789",
        nombre_o_razon_social: "HOTEL SOL ICA S.A.C.",
        direccion: "Av. Principal 456",
    });
    render(<CrudModule entidadKey="empresa" />);

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo" }));
    await userEvent.type(screen.getByLabelText("RUC *"), "20123456789");
    await userEvent.click(screen.getByRole("button", { name: /consultar ruc en factiliza/i }));

    await waitFor(() =>
        expect(screen.getByLabelText("Razón social *")).toHaveValue("HOTEL SOL ICA S.A.C.")
    );
    expect(screen.getByLabelText("RUC *")).toHaveValue("20123456789");
    expect(screen.getByLabelText("Dirección")).toHaveValue("Av. Principal 456");
    expect(consultarDocumento).toHaveBeenCalledWith("ruc", "20123456789");
});
