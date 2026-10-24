import { iniciarSesion } from "./authService";

describe("iniciarSesion", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("reports connection failures with API configuration guidance", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

        const resultado = await iniciarSesion("admin", "clave");

        expect(global.fetch).toHaveBeenCalledWith(
            "/api/auth/login",
            expect.objectContaining({ method: "POST" })
        );
        expect(resultado).toEqual({
            success: false,
            message: expect.stringContaining("REACT_APP_API_URL")
        });
    });

    test("reports invalid server responses separately from connection failures", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockRejectedValue(new SyntaxError("Invalid JSON"))
        });

        const resultado = await iniciarSesion("admin", "clave");

        expect(resultado).toEqual({
            success: false,
            message: "El servidor devolvió una respuesta inválida."
        });
    });
});
