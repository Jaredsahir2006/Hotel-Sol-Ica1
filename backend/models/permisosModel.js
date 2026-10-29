const supabase = require("../config/supabase");

const obtenerPermisosUsuario = async (idUsuario) => {
    const { data: asignaciones, error: errorAsignaciones } = await supabase
        .from("usuario_rol")
        .select("id_rol")
        .eq("id_usuario", idUsuario)
        .eq("vigente", "1")
        .eq("estado", "1");

    if (errorAsignaciones) {
        throw errorAsignaciones;
    }

    const idsRolesAsignados = [
        ...new Set((asignaciones || []).map((fila) => fila.id_rol))
    ];
    if (idsRolesAsignados.length === 0) {
        return { roles: [], modulos: [] };
    }

    const { data: roles, error: errorRoles } = await supabase
        .from("rol")
        .select("id_rol,n_rol")
        .in("id_rol", idsRolesAsignados)
        .eq("estado", "1");

    if (errorRoles) {
        throw errorRoles;
    }

    const idsRolesActivos = (roles || []).map((rol) => rol.id_rol);
    if (idsRolesActivos.length === 0) {
        return { roles: [], modulos: [] };
    }

    const { data: asignacionesPermiso, error: errorPermisos } = await supabase
        .from("rol_permiso")
        .select("id_permiso")
        .in("id_rol", idsRolesActivos)
        .eq("concedido", "1")
        .eq("estado", "1");

    if (errorPermisos) {
        throw errorPermisos;
    }

    const idsPermisos = [
        ...new Set((asignacionesPermiso || []).map((fila) => fila.id_permiso))
    ];
    if (idsPermisos.length === 0) {
        return {
            roles: (roles || []).map((rol) => rol.n_rol),
            modulos: []
        };
    }

    const { data: permisos, error: errorDetallePermisos } = await supabase
        .from("permiso")
        .select("id_permiso,n_permiso,id_modulo")
        .in("id_permiso", idsPermisos)
        .eq("estado", "1");

    if (errorDetallePermisos) {
        throw errorDetallePermisos;
    }

    const idsModulos = [
        ...new Set((permisos || [])
            .filter((permiso) => String(permiso.n_permiso).endsWith("_TOTAL"))
            .map((permiso) => permiso.id_modulo))
    ];
    if (idsModulos.length === 0) {
        return {
            roles: (roles || []).map((rol) => rol.n_rol),
            modulos: []
        };
    }

    const { data: modulos, errorModulos } = await supabase
        .from("modulo")
        .select("id_modulo,n_modulo")
        .in("id_modulo", idsModulos)
        .eq("estado", "1");

    if (errorModulos) {
        throw errorModulos;
    }

    return {
        roles: (roles || []).map((rol) => rol.n_rol),
        modulos: [...new Set((modulos || []).map((modulo) => modulo.n_modulo))]
    };
};

module.exports = { obtenerPermisosUsuario };
