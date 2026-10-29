import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CrudModule from "./CrudModule";
import { ENTIDADES } from "../config/entidades";
import {
    buscarPersonaPorDni,
    guardarEmpleadoConPersona,
    insertar,
    listar,
    listarPaginado,
} from "../services/crudService";
import { consultarDocumento } from "../services/factilizaService";

jest.mock("../services/crudService", () => ({
    listar: jest.fn(),
    listarPaginado: jest.fn(),
    POR_PAGINA: 25,
    insertar: jest.fn(),
    actualizar: jest.fn(),
    eliminar: jest.fn(),
    buscarPersonaPorDni: jest.fn(),
    guardarEmpleadoConPersona: jest.fn(),
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
        if (tabla === "categoria_habitacion") {
            return [{ id_categoria: 7, descripcion: "Doble", precio: 180 }];
        }
        if (tabla === "piso") {
            return [{ id_piso: 2, descripcion: "Piso 2" }];
        }
        if (tabla === "estado_habitacion") {
            return [{ id_estadohabitacion: 1, descripcion: "Disponible" }];
        }
        if (tabla === "cargo") {
            return [{ id_cargo: 2, n_cargo: "Recepcionista" }];
        }
        if (tabla === "contrato") {
            return [{ id_contrato: 3, n_contrato: "Indeterminado" }];
        }
        if (tabla === "usuario") {
            return [
                { id_usuario: 1, logeo: "admin" },
                { id_usuario: 2, logeo: "recepcionista" },
                { id_usuario: 3, logeo: "caja" },
            ];
        }
        if (tabla === "rol") {
            return [{ id_rol: 4, n_rol: "Recepción" }];
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
    insertar.mockReset().mockResolvedValue(undefined);
    buscarPersonaPorDni.mockReset();
    guardarEmpleadoConPersona.mockReset().mockResolvedValue(undefined);
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

test("registra empleado buscando DNI y creando la persona solo si no existe", async () => {
    consultarDocumento.mockResolvedValue({
        numero: "12345678",
        nombres: "ANA MARIA",
        apellido_paterno: "PEREZ",
        apellido_materno: "LOPEZ",
        fecha_nacimiento: "1990-03-12",
        sexo: "F",
        direccion: "Av. Ica 123",
    });
    buscarPersonaPorDni.mockResolvedValue({ persona: null, id_tipoidentidad: 1 });
    render(<CrudModule entidadKey="empleados" />);
    await waitFor(() => expect(screen.queryByText("Cargando...")).not.toBeInTheDocument());

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo" }));
    expect(screen.queryByLabelText("Persona *")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("DNI del empleado"), "12345678");
    await userEvent.click(screen.getByRole("button", { name: "Consultar DNI en Factiliza" }));

    await waitFor(() => expect(screen.getByLabelText("Nombres")).toHaveValue("ANA MARIA"));
    expect(screen.getByLabelText("Apellido paterno")).toHaveValue("PEREZ");
    await userEvent.selectOptions(screen.getByLabelText("Distrito de la persona"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Cargo *"), "2");
    await userEvent.selectOptions(screen.getByLabelText("Contrato *"), "3");
    await userEvent.type(screen.getByLabelText("Salario (S/) *"), "2500");
    await userEvent.selectOptions(screen.getByLabelText("Turno *"), "MANANA");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(guardarEmpleadoConPersona).toHaveBeenCalledWith({
        empleado: expect.objectContaining({
            id_cargo: 2,
            id_contrato: 3,
            salario: 2500,
            turno: "MANANA",
        }),
        persona: expect.objectContaining({
            n_documento: "12345678",
            nombre: "ANA MARIA",
            ap_paterno: "PEREZ",
            id_distrito: 1,
        }),
    }));
    expect(consultarDocumento).toHaveBeenCalledWith("dni", "12345678");
    expect(buscarPersonaPorDni).toHaveBeenCalledWith("12345678");
    expect(insertar).not.toHaveBeenCalled();
});

test("reutiliza los datos de una persona ya registrada con el DNI consultado", async () => {
    consultarDocumento.mockResolvedValue({
        numero: "12345678",
        nombres: "NOMBRE DE FACTILIZA",
        apellido_paterno: "APELLIDO API",
    });
    buscarPersonaPorDni.mockResolvedValue({
        id_tipoidentidad: 1,
        persona: {
            id_persona: 28,
            n_documento: "12345678",
            nombre: "ANA MARIA",
            ap_paterno: "PEREZ",
            ap_materno: "LOPEZ",
            id_distrito: 1,
        },
    });
    render(<CrudModule entidadKey="empleados" />);
    await waitFor(() => expect(screen.queryByText("Cargando...")).not.toBeInTheDocument());

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo" }));
    await userEvent.type(screen.getByLabelText("DNI del empleado"), "12345678");
    await userEvent.click(screen.getByRole("button", { name: "Consultar DNI en Factiliza" }));

    expect(await screen.findByText(/Esta persona ya existe en Personas/)).toBeInTheDocument();
    expect(screen.getByLabelText("Nombres")).toHaveValue("ANA MARIA");
    expect(screen.getByLabelText("Nombres")).toBeDisabled();
    expect(screen.getByLabelText("Distrito de la persona")).toHaveValue("1");
});

test("filtra usuarios por nombre en la asignación de roles", async () => {
    render(<CrudModule entidadKey="usuario_rol" />);
    await waitFor(() => expect(screen.queryByText("Cargando...")).not.toBeInTheDocument());
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo" }));

    const buscarUsuario = screen.getByLabelText("Buscar usuario");
    const selectorUsuario = screen.getByLabelText("Usuario *");
    expect(selectorUsuario.querySelectorAll("option")).toHaveLength(4);

    await userEvent.type(buscarUsuario, "recep");
    expect(selectorUsuario.querySelector('option[value="2"]')).toHaveTextContent("recepcionista");
    expect(selectorUsuario.querySelector('option[value="1"]')).not.toBeInTheDocument();
    expect(screen.getByText("1 de 3 usuarios")).toBeInTheDocument();
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

test("asigna a la habitación el precio de su categoría y limita el número al piso seleccionado", async () => {
    render(<CrudModule entidadKey="habitaciones" />);
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo" }));

    await userEvent.selectOptions(screen.getByLabelText("Categoría *"), "7");
    const precio = screen.getByLabelText("Precio por noche (S/) *");
    expect(precio).toHaveValue(180);
    expect(precio).toHaveAttribute("readonly");

    await userEvent.selectOptions(screen.getByLabelText("Piso *"), "2");
    const numero = screen.getByLabelText("Número de habitación *");
    expect(numero).toHaveAttribute("maxlength", "3");
    await userEvent.type(numero, "201");
    await userEvent.selectOptions(screen.getByLabelText("Estado *"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(insertar).toHaveBeenCalledWith("habitacion", expect.objectContaining({
        numero: "201",
        id_categoria: 7,
        id_piso: 2,
        id_estadohabitacion: 1,
        precio: 180,
    })));
});

test("rechaza un número de habitación cuya centena no corresponde al piso", async () => {
    render(<CrudModule entidadKey="habitaciones" />);
    await userEvent.click(await screen.findByRole("button", { name: "Nuevo" }));

    await userEvent.selectOptions(screen.getByLabelText("Categoría *"), "7");
    await userEvent.selectOptions(screen.getByLabelText("Piso *"), "2");
    const numero = screen.getByLabelText("Número de habitación *");
    expect(numero).toHaveAttribute("placeholder", "201");
    await userEvent.type(numero, "101");
    await userEvent.selectOptions(screen.getByLabelText("Estado *"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(/debe tener tres dígitos y comenzar con 2/)).toBeInTheDocument();
    expect(insertar).not.toHaveBeenCalled();
});
