import { useCallback, useEffect, useMemo, useState } from "react";

import {
    listarConsumosRecepcion,
    listarProductosConsumo,
    listarRecepcionesHospedadas,
    registrarConsumo,
} from "../services/procesosService";
import { soles } from "../utils/format";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const Consumos = () => {
    const [recepciones, setRecepciones] = useState([]);
    const [productos, setProductos] = useState([]);
    const [recepcionId, setRecepcionId] = useState("");
    const [productoId, setProductoId] = useState("");
    const [cantidad, setCantidad] = useState("1");
    const [busquedaProducto, setBusquedaProducto] = useState("");
    const [items, setItems] = useState([]);
    const [consumosGuardados, setConsumosGuardados] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const cargarCatalogos = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const [recepcionesActivas, productosActivos] = await Promise.all([
                listarRecepcionesHospedadas(),
                listarProductosConsumo(),
            ]);
            setRecepciones(recepcionesActivas);
            setProductos(productosActivos);
        } catch (errorCarga) {
            setError(errorCarga.message || "No se pudieron cargar los datos de consumos.");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarCatalogos();
    }, [cargarCatalogos]);

    useEffect(() => {
        let vigente = true;
        if (!recepcionId) {
            setConsumosGuardados([]);
            return () => { vigente = false; };
        }
        setCargandoDetalle(true);
        listarConsumosRecepcion(recepcionId)
            .then((detalles) => {
                if (vigente) setConsumosGuardados(detalles);
            })
            .catch((errorDetalle) => {
                if (vigente) setError(errorDetalle.message || "No se pudo consultar el historial de consumos.");
            })
            .finally(() => {
                if (vigente) setCargandoDetalle(false);
            });
        return () => { vigente = false; };
    }, [recepcionId]);

    const recepcionSeleccionada = recepciones.find(
        (recepcion) => String(recepcion.id_recepcion) === String(recepcionId)
    );
    const productoSeleccionado = productos.find(
        (producto) => String(producto.id_producto) === String(productoId)
    );
    const productosFiltrados = productos.filter((producto) =>
        `${producto.n_producto} ${producto.categoria_nombre} ${producto.marca || ""}`
            .toLowerCase().includes(busquedaProducto.trim().toLowerCase())
    );
    const totalNuevo = useMemo(
        () => Math.round(items.reduce((total, item) => total + item.sub_total, 0) * 100) / 100,
        [items]
    );
    const totalGuardado = useMemo(
        () => Math.round(consumosGuardados.reduce(
            (total, detalle) => total + (Number(detalle.sub_total) || 0),
            0
        ) * 100) / 100,
        [consumosGuardados]
    );

    const agregarItem = () => {
        setError("");
        setMensaje("");
        const cantidadNumero = Number(cantidad);
        if (!productoSeleccionado) {
            setError("Selecciona un servicio o producto.");
            return;
        }
        if (!Number.isInteger(cantidadNumero) || cantidadNumero <= 0) {
            setError("La cantidad debe ser un número entero mayor a cero.");
            return;
        }
        const precio = Number(productoSeleccionado.precio);
        if (!Number.isFinite(precio) || precio <= 0) {
            setError("El producto seleccionado no tiene un precio mayor a cero.");
            return;
        }
        const producto = productoSeleccionado;
        setItems((actuales) => {
            const existente = actuales.find(
                (item) => String(item.id_producto) === String(producto.id_producto)
            );
            if (existente) {
                return actuales.map((item) => item === existente
                    ? {
                        ...item,
                        cantidad: item.cantidad + cantidadNumero,
                        sub_total: Math.round(precio * (item.cantidad + cantidadNumero) * 100) / 100,
                    }
                    : item);
            }
            return [...actuales, {
                id_producto: producto.id_producto,
                nombre: producto.n_producto,
                cantidad: cantidadNumero,
                precio,
                sub_total: Math.round(precio * cantidadNumero * 100) / 100,
            }];
        });
        setCantidad("1");
    };

    const guardarConsumo = async (event) => {
        event.preventDefault();
        setError("");
        setMensaje("");
        if (!recepcionSeleccionada) {
            setError("Selecciona un huésped que ya tenga check-in.");
            return;
        }
        if (!items.length) {
            setError("Agrega al menos un servicio o producto al detalle.");
            return;
        }

        setGuardando(true);
        try {
            const resultado = await registrarConsumo({
                id_recepcion: Number(recepcionId),
                items: items.map(({ id_producto, cantidad: cantidadItem }) => ({
                    id_producto,
                    cantidad: cantidadItem,
                })),
            });
            setItems([]);
            setMensaje(`Consumo registrado por ${soles(resultado.total)}. El importe se agregó a la deuda de la estadía.`);
            try {
                const detalles = await listarConsumosRecepcion(recepcionId);
                setConsumosGuardados(detalles);
                await cargarCatalogos();
            } catch (errorRefresco) {
                setError(`Consumo registrado, pero no se pudo actualizar la pantalla: ${errorRefresco.message}`);
            }
        } catch (errorRegistro) {
            setError(errorRegistro.message || "No se pudo registrar el consumo.");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div>
            <header className="mb-6 flex items-center gap-4">
                <div className="module-icon"><i className="bi bi-bag-plus"></i></div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Registro de consumo</h2>
                    <p className="text-sm text-gray-500">Agrega servicios y productos a la cuenta de un huésped alojado.</p>
                </div>
            </header>

            {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            {mensaje && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{mensaje}</div>}

            {cargando ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">Cargando huéspedes y servicios...</div>
            ) : (
                <form onSubmit={guardarConsumo} className="grid gap-6 xl:grid-cols-5">
                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
                        <h3 className="mb-4 font-semibold text-slate-900">Huésped alojado</h3>
                        <label className="block text-xs font-semibold text-slate-700">
                            Seleccionar huésped *
                            <select
                                aria-label="Huésped alojado"
                                required
                                value={recepcionId}
                                onChange={(event) => {
                                    setRecepcionId(event.target.value);
                                    setItems([]);
                                    setError("");
                                    setMensaje("");
                                }}
                                className={`${inputClase} mt-1.5 font-normal`}
                            >
                                <option value="">-- Seleccione --</option>
                                {recepciones.map((recepcion) => (
                                    <option key={recepcion.id_recepcion} value={recepcion.id_recepcion}>
                                        #{recepcion.id_recepcion} · {recepcion.cliente_nombre} · Hab. {recepcion.habitacion_numero}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {recepcionSeleccionada ? (
                            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
                                <p className="font-semibold">{recepcionSeleccionada.cliente_nombre}</p>
                                <p>{recepcionSeleccionada.cliente_documento || "Sin documento"} · Hab. {recepcionSeleccionada.habitacion_numero}</p>
                                <p className="mt-2">Saldo de estadía: <strong>{soles(recepcionSeleccionada.totaldeuda)}</strong></p>
                            </div>
                        ) : (
                            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                                Solo aparecen huéspedes con check-in realizado y sin check-out.
                            </p>
                        )}
                        {recepciones.length === 0 && (
                            <p className="mt-3 text-sm text-amber-700">No hay huéspedes alojados disponibles para registrar consumos.</p>
                        )}

                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                            Los consumos quedan asociados a la recepción y aumentan su saldo pendiente. No se registra un pago ni se modifica la caja.
                            Las tablas actuales no tienen campos para observación o desglose de IGV del consumo.
                        </div>
                    </section>

                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-3">
                        <h3 className="mb-4 font-semibold text-slate-900">Detalle del consumo</h3>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
                            <label className="block text-xs font-semibold text-slate-700">
                                Servicio o producto *
                                <select
                                    aria-label="Servicio o producto"
                                    value={productoId}
                                    onChange={(event) => setProductoId(event.target.value)}
                                    className={`${inputClase} mt-1.5 font-normal`}
                                >
                                    <option value="">-- Seleccione --</option>
                                    {productosFiltrados.map((producto) => (
                                        <option key={producto.id_producto} value={producto.id_producto}>
                                            {producto.n_producto}{producto.categoria_nombre ? ` · ${producto.categoria_nombre}` : ""} · {soles(producto.precio)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-xs font-semibold text-slate-700">
                                Cantidad *
                                <input
                                    aria-label="Cantidad"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={cantidad}
                                    onChange={(event) => setCantidad(event.target.value)}
                                    className={`${inputClase} mt-1.5 font-normal`}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={agregarItem}
                                disabled={!recepcionSeleccionada}
                                className="self-end rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <i className="bi bi-plus-lg mr-1"></i>Agregar
                            </button>
                        </div>
                        <label className="mt-3 block text-xs font-semibold text-slate-700">
                            Buscar servicio
                            <input
                                aria-label="Buscar servicio"
                                type="search"
                                value={busquedaProducto}
                                onChange={(event) => setBusquedaProducto(event.target.value)}
                                placeholder="Nombre, categoría o marca..."
                                className={`${inputClase} mt-1.5 font-normal`}
                            />
                        </label>
                        {productoSeleccionado && (
                            <p className="mt-2 text-xs text-slate-500">Precio unitario actual: {soles(productoSeleccionado.precio)}</p>
                        )}
                        {productos.length === 0 && (
                            <p className="mt-3 text-sm text-amber-700">No hay productos o servicios activos. Configúralos en el módulo Servicios.</p>
                        )}

                        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Servicio</th>
                                        <th className="px-4 py-3">Cant.</th>
                                        <th className="px-4 py-3">Precio</th>
                                        <th className="px-4 py-3">Subtotal</th>
                                        <th className="px-4 py-3">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.length ? items.map((item) => (
                                        <tr key={item.id_producto}>
                                            <td className="px-4 py-3">{item.nombre}</td>
                                            <td className="px-4 py-3">{item.cantidad}</td>
                                            <td className="px-4 py-3">{soles(item.precio)}</td>
                                            <td className="px-4 py-3 font-semibold">{soles(item.sub_total)}</td>
                                            <td className="px-4 py-3">
                                                <button type="button" aria-label={`Quitar ${item.nombre}`} onClick={() => setItems((actuales) => actuales.filter((actual) => actual.id_producto !== item.id_producto))} className="text-red-600 hover:text-red-800">
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Agrega productos para preparar el consumo.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {recepcionId && (
                            <div className="mt-5">
                                <h4 className="mb-2 text-sm font-semibold text-slate-800">Consumos guardados en esta estadía</h4>
                                {cargandoDetalle ? <p className="text-sm text-gray-500">Cargando historial...</p> : consumosGuardados.length ? (
                                    <div className="space-y-1 text-sm">
                                        {consumosGuardados.map((detalle) => (
                                            <p key={detalle.id_detalle}>
                                                {detalle.producto_nombre} × {detalle.cantidad}
                                                <span className="float-right font-medium">{soles(detalle.sub_total)}</span>
                                            </p>
                                        ))}
                                        <p className="border-t pt-2 font-semibold">Total ya registrado <span className="float-right">{soles(totalGuardado)}</span></p>
                                    </div>
                                ) : <p className="text-sm text-gray-500">Aún no hay consumos registrados.</p>}
                            </div>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                            <p className="text-lg font-bold text-slate-900">Total nuevo: {soles(totalNuevo)}</p>
                            <button
                                type="submit"
                                disabled={guardando || !recepcionSeleccionada || !items.length}
                                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {guardando ? "Registrando..." : "Registrar consumo"}
                            </button>
                        </div>
                    </section>
                </form>
            )}
        </div>
    );
};

export default Consumos;
