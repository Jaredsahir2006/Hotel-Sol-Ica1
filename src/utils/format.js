export const soles = (valor) =>
    `S/ ${Number(valor || 0).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export const fecha = (valor) => {
    if (!valor) return "-";
    return String(valor).slice(0, 10);
};

export const fechaHora = (valor) => {
    if (!valor) return "-";
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return String(valor);
    return d.toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const fechaLocal = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const hoy = () => fechaLocal(new Date());

export const sumarDias = (fechaBase, dias) => {
    const d = new Date(`${fechaBase}T12:00:00`);
    d.setDate(d.getDate() + Number(dias || 0));
    return fechaLocal(d);
};

export const noches = (entrada, salida) => {
    if (!entrada || !salida) return 0;
    const a = new Date(`${entrada}T12:00:00`);
    const b = new Date(`${salida}T12:00:00`);
    const dif = Math.round((b - a) / 86400000);
    return dif > 0 ? dif : 0;
};
