import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CrudModule from "./CrudModule";
import { ENTIDADES } from "../config/entidades";
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
    await waitFor(() => expect(screen.queryByText("Cargando...")).not.toBeInTheDocument());

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
    await waitFor(() => expect(screen.queryByText("Cargando...")).not.toBeInTheDocument());

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

test("la paginación cambia de página y ajusta la cantidad de registros mostrados", async () => {
    listarPaginado.mockImplementation(async (_tabla, _pk, opciones) => {
        const total = 60;
        const totalPaginas = Math.ceil(total / opciones.pageSize);
        const inicio = (opciones.pagina - 1) * opciones.pageSize;
        const cantidad = Math.min(opciones.pageSize, total - inicio);

        return {
            data: Array.from({ length: cantidad }, (_, index) => ({
                id_empresa: inicio + index + 1,
                ruc: String(20000000000 + inicio + index + 1),
                razon_social: `Empresa ${inicio + index + 1}`,
            })),
            total,
            pagina: opciones.pagina,
            totalPaginas,
        };
    });
    render(<CrudModule entidadKey="empresa" />);

    await screen.findByText("Empresa 1");
    await waitFor(() => expect(screen.queryByText("Cargando...")).not.toBeInTheDocument());
    expect(screen.getByText(/Mostrando 1–25 de 60 registros/)).toBeInTheDocument();

    const siguiente = screen.getByRole("button", { name: "Siguiente" });
    await waitFor(() => expect(siguiente).toBeEnabled());
    await userEvent.click(siguiente);
    await screen.findByText("Empresa 26");
    await waitFor(() =>
        expect(listarPaginado).toHaveBeenLastCalledWith(
            "empresa",
            "id_empresa",
            expect.objectContaining({ pagina: 2, pageSize: 25 })
        )
    );
    await waitFor(() => expect(screen.queryByText("Cargando...")).not.toBeInTheDocument());
    await waitFor(() =>
        expect(
            screen.getByText((_, elemento) =>
                elemento.tagName === "SPAN" && elemento.textContent.includes("Mostrando")
            )
        ).toHaveTextContent(/26.*50.*60/)
    );

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Registros por página" }), "50");
    await screen.findByText("Empresa 50");
    await waitFor(() =>
        expect(listarPaginado).toHaveBeenLastCalledWith(
            "empresa",
            "id_empresa",
            expect.objectContaining({ pagina: 1, pageSize: 50 })
        )
    );
    await waitFor(() => expect(screen.queryByText("Cargando...")).not.toBeInTheDocument());
    expect(
        screen.getByText((_, elemento) =>
            elemento.tagName === "SPAN" && elemento.textContent.includes("Mostrando")
        )
    ).toHaveTextContent(/1.*50.*60/);
    expect(screen.queryByText("Empresa 51")).not.toBeInTheDocument();
});

test("mantiene visible el error de una tabla relacionada mientras carga el listado", async () => {
    listar.mockImplementation(async (tabla) => {
        if (tabla === "tipo_identidad") throw new Error("acceso denegado");
        return [];
    });
    render(<CrudModule entidadKey="huespedes" />);

    expect(
        await screen.findByText(/No se pudieron leer las tablas relacionadas: acceso denegado/)
    ).toBeInTheDocument();
});

test.each(["reservas", "venta", "detalle_venta", "factura", "boleta", "movimiento_caja"])(
    "configura %s como solo lectura para proteger operaciones generadas por los flujos",
    (entidadKey) => expect(ENTIDADES[entidadKey].soloLectura).toBe(true)
);
