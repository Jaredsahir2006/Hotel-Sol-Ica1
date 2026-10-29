const test = require("node:test");
const assert = require("node:assert/strict");
const requireAuth = require("../middleware/requireAuth");
const { crearTokenSesion } = require("../utils/sessionToken");

const crearRespuesta = () => ({
    statusCode: null,
    contenido: null,
    status(codigo) {
        this.statusCode = codigo;
        return this;
    },
    json(contenido) {
        this.contenido = contenido;
        return this;
    }
});

test("rejects requests without a bearer session", () => {
    const respuesta = crearRespuesta();
    let continuo = false;

    requireAuth(
        { get: () => undefined },
        respuesta,
        () => { continuo = true; }
    );

    assert.equal(respuesta.statusCode, 401);
    assert.equal(continuo, false);
});

test("attaches verified claims before allowing an authorized request", () => {
    const claims = {
        usuario: { id_usuario: 9 },
        roles: ["CAJERO"],
        modulos: ["CAJA"]
    };
    const { token } = crearTokenSesion(claims);
    const solicitud = { get: () => `Bearer ${token}` };
    const respuesta = crearRespuesta();
    let continuo = false;

    requireAuth(solicitud, respuesta, () => { continuo = true; });

    assert.equal(continuo, true);
    assert.deepEqual(solicitud.sesion.usuario, claims.usuario);
    assert.deepEqual(solicitud.sesion.modulos, claims.modulos);
});
