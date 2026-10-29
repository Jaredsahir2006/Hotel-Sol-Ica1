const test = require("node:test");
const assert = require("node:assert/strict");

const consultas = [];
const filas = {
    usuario_rol: [
        { id_usuario: 42, id_rol: 1, vigente: "1", estado: "1" },
        { id_usuario: 42, id_rol: 2, vigente: "1", estado: "0" },
        { id_usuario: 42, id_rol: 3, vigente: "0", estado: "1" }
    ],
    rol: [
        { id_rol: 1, n_rol: "ADMINISTRADOR", estado: "1" },
        { id_rol: 2, n_rol: "INACTIVO", estado: "0" }
    ],
    rol_permiso: [
        { id_permiso: 6, id_rol: 1, concedido: "1", estado: "1" },
        { id_permiso: 7, id_rol: 1, concedido: "1", estado: "0" },
        { id_permiso: 8, id_rol: 1, concedido: "1", estado: "1" }
    ],
    permiso: [
        { id_permiso: 6, n_permiso: "USUARIOS_TOTAL", id_modulo: 4, estado: "1" },
        { id_permiso: 8, n_permiso: "CLIENTES_LECTURA", id_modulo: 1, estado: "1" }
    ],
    modulo: [
        { id_modulo: 4, n_modulo: "USUARIOS", estado: "1" },
        { id_modulo: 1, n_modulo: "CLIENTES", estado: "1" }
    ]
};

const supabaseSimulado = {
    from(tabla) {
        const consulta = { tabla, filtros: [] };
        consultas.push(consulta);

        const builder = {
            select() {
                return this;
            },
            eq(campo, valor) {
                consulta.filtros.push({ tipo: "eq", campo, valor });
                return this;
            },
            in(campo, valores) {
                consulta.filtros.push({ tipo: "in", campo, valores });
                return this;
            },
            then(resolve, reject) {
                const resultado = (filas[tabla] || []).filter((fila) =>
                    consulta.filtros.every((filtro) => {
                        if (filtro.tipo === "eq") {
                            return String(fila[filtro.campo]) === String(filtro.valor);
                        }
                        return filtro.valores.includes(fila[filtro.campo]);
                    })
                );

                return Promise.resolve({ data: resultado, error: null }).then(resolve, reject);
            }
        };

        return builder;
    }
};

const rutaSupabase = require.resolve("../config/supabase");
require.cache[rutaSupabase] = {
    exports: supabaseSimulado
};

const { obtenerPermisosUsuario } = require("../models/permisosModel");

test("resolves only active roles and granted active module-wide permissions", async () => {
    const resultado = await obtenerPermisosUsuario(42);

    assert.deepEqual(resultado, {
        roles: ["ADMINISTRADOR"],
        modulos: ["USUARIOS"]
    });

    const consultaRoles = consultas.find((consulta) => consulta.tabla === "rol");
    const consultaPermisos = consultas.find((consulta) => consulta.tabla === "rol_permiso");
    assert.ok(consultaRoles.filtros.some(
        (filtro) => filtro.campo === "estado" && filtro.valor === "1"
    ));
    assert.ok(consultaPermisos.filtros.some(
        (filtro) => filtro.campo === "concedido" && filtro.valor === "1"
    ));
    assert.ok(consultaPermisos.filtros.some(
        (filtro) => filtro.campo === "estado" && filtro.valor === "1"
    ));
});
