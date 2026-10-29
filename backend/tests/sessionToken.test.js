const test = require("node:test");
const assert = require("node:assert/strict");
const { crearTokenSesion, verificarTokenSesion } = require("../utils/sessionToken");

test("signs a session and verifies its claims and expiry", () => {
    const original = {
        usuario: { id_usuario: 7, logeo: "recepcion" },
        roles: ["RECEPCIONISTA"],
        modulos: ["RECEPCION"]
    };

    const sesion = crearTokenSesion(original);
    const payload = verificarTokenSesion(sesion.token);

    assert.deepEqual(payload.usuario, original.usuario);
    assert.deepEqual(payload.roles, original.roles);
    assert.deepEqual(payload.modulos, original.modulos);
    assert.equal(sesion.expiraEn, payload.exp * 1000);
    assert.ok(payload.exp > payload.iat);
});

test("rejects a token whose signature has been changed", () => {
    const { token } = crearTokenSesion({
        usuario: { id_usuario: 7 }
    });
    const [contenido, firma] = token.split(".");
    const firmaAlterada = `${firma[0] === "a" ? "b" : "a"}${firma.slice(1)}`;

    assert.throws(
        () => verificarTokenSesion(`${contenido}.${firmaAlterada}`),
        /Firma de sesión inválida/
    );
});
