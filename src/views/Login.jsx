import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import HotelLogo from "../components/HotelLogo";
import InputField from "../components/InputField";

import {
    validarLogin,
    ejecutarLogin
} from "../controllers/authController";
import { guardarSesion, obtenerSesion } from "../services/authSession";


const Login = () => {

    const navigate = useNavigate();

    useEffect(() => {
        if (obtenerSesion()) {
            navigate("/dashboard", { replace: true });
        }
    }, [navigate]);

    const [formData, setFormData] = useState({
        logeo: "",
        clave: ""
    });

    const [errors, setErrors] = useState({});

    const [showPassword, setShowPassword] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [loginSuccess, setLoginSuccess] =
        useState(false);
    const [recordarme, setRecordarme] = useState(false);
    const [mensajeInformativo, setMensajeInformativo] = useState("");


    const handleChange = (event) => {

        const {
            name,
            value
        } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));

        setErrors((previous) => ({
            ...previous,
            [name]: "",
            general: ""
        }));

        setMensajeInformativo("");
        setLoginSuccess(false);
    };


    const handleSubmit = async (event) => {

        event.preventDefault();

        setLoginSuccess(false);
        setMensajeInformativo("");

        const validacion =
            validarLogin(
                formData.logeo,
                formData.clave
            );


        if (!validacion.success) {

            setErrors(
                validacion.errors
            );

            return;
        }


        setErrors({});

        setLoading(true);


        const resultado =
            await ejecutarLogin(
                formData.logeo,
                formData.clave
            );


        setLoading(false);


        if (!resultado.success) {

            setErrors({
                general:
                    resultado.message ||
                    "No se pudo iniciar sesión."
            });

            return;
        }


        try {
            guardarSesion(resultado, recordarme);
        } catch (error) {
            setErrors({
                general: error.message || "No se pudo guardar la sesión."
            });
            return;
        }

        navigate("/dashboard", {
            replace: true
        });

    };


    return (

        <main className="min-h-screen bg-slate-100">

            <div className="grid min-h-screen lg:grid-cols-2">


                {/* ==============================
                    PANEL VISUAL
                =============================== */}

                <section
                    className="
                        relative
                        hidden
                        overflow-hidden
                        bg-hotel-navy
                        lg:flex
                    "
                >

                    <div
                        className="
                            absolute
                            -left-32
                            -top-32
                            h-96
                            w-96
                            rounded-full
                            bg-blue-700/30
                            blur-3xl
                        "
                    ></div>


                    <div
                        className="
                            absolute
                            -bottom-32
                            -right-32
                            h-96
                            w-96
                            rounded-full
                            bg-hotel-gold/20
                            blur-3xl
                        "
                    ></div>


                    <div
                        className="
                            relative
                            z-10
                            flex
                            w-full
                            flex-col
                            justify-between
                            p-12
                            xl:p-16
                        "
                    >

                        <HotelLogo light />


                        <div className="max-w-xl">

                            <div
                                className="
                                    mb-5
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-full
                                    border
                                    border-white/10
                                    bg-white/5
                                    px-4
                                    py-2
                                    text-xs
                                    font-medium
                                    uppercase
                                    tracking-wider
                                    text-white/80
                                    backdrop-blur
                                "
                            >

                                <i className="bi bi-stars text-hotel-gold"></i>

                              <span>
                                  Sistema de Gestión Hotelera
                              </span>
                            </div>


                            <h2
                                className="
                                    mb-6
                                    font-['Playfair_Display']
                                    text-5xl
                                    font-bold
                                    leading-tight
                                    text-white
                                    xl:text-6xl
                                "
                            >

                              <span>
                                  Una experiencia
                              </span>
                                <span
                                    className="
                                        block
                                        text-hotel-gold
                                    "
                                >
                                    que empieza aquí.
                                </span>

                            </h2>


                            <p
                                className="
                                    max-w-lg
                                    text-base
                                    leading-7
                                    text-slate-300
                                "
                            >
                               <span>
                                   Gestiona las operaciones
                                   de Hotel Sol Ica desde
                                   un solo lugar, de manera
                                   organizada, rápida y eficiente.
                               </span>
                            </p>


                            <div
                                className="
                                    mt-8
                                    flex
                                    flex-wrap
                                    gap-3
                                "
                            >

                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                        rounded-lg
                                        border
                                        border-white/10
                                        bg-white/5
                                        px-4
                                        py-3
                                        text-sm
                                        text-slate-200
                                    "
                                >

                                    <i
                                        className="
                                            bi
                                            bi-shield-check
                                            text-hotel-gold
                                        "
                                    ></i>

                                  <span>
                                      Acceso seguro
                                  </span>
                                </div>


                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                        rounded-lg
                                        border
                                        border-white/10
                                        bg-white/5
                                        px-4
                                        py-3
                                        text-sm
                                        text-slate-200
                                    "
                                >

                                    <i
                                        className="
                                            bi
                                            bi-speedometer2
                                            text-hotel-gold
                                        "
                                    ></i>

                                  <span>
                                      Gestión eficiente
                                  </span>
                                </div>

                            </div>

                        </div>


                        <div
                            className="
                                flex
                                items-center
                                justify-between
                                text-xs
                                text-slate-400
                            "
                        >

                            <span>
                                © 2026 Hotel Sol Ica
                            </span>

                            <span>
                                Sistema Administrativo
                            </span>

                        </div>

                    </div>

                </section>



                {/* ==============================
                    PANEL LOGIN
                =============================== */}

                <section
                    className="
                        flex
                        min-h-screen
                        items-center
                        justify-center
                        bg-white
                        px-6
                        py-10
                        sm:px-10
                    "
                >

                    <div
                        className="
                            w-full
                            max-w-md
                        "
                    >

                        {/* Logo móvil */}

                        <div
                            className="
                                mb-10
                                lg:hidden
                            "
                        >
                            <HotelLogo />
                        </div>


                        {/* Encabezado */}

                        <div className="mb-8">

                            <div
                                className="
                                    mb-4
                                    flex
                                    h-12
                                    w-12
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-blue-50
                                "
                            >

                                <i
                                    className="
                                        bi
                                        bi-person-lock
                                        text-2xl
                                        text-blue-800
                                    "
                                ></i>

                            </div>


                            <h2
                                className="
                                    mb-2
                                    font-['Playfair_Display']
                                    text-3xl
                                    font-bold
                                    text-slate-900
                                "
                            >
                               <span>
                                   Bienvenido
                               </span>
                            </h2>


                            <p
                                className="
                                    text-sm
                                    leading-6
                                    text-gray-500
                                "
                            >
                               <span>
                                   Ingresa tus credenciales
                                   para acceder al sistema
                                   de gestión hotelera.
                               </span>
                            </p>

                        </div>



                        {/* Error */}

                        {errors.general && (

                            <div
                                className="
                                    mb-5
                                    flex
                                    items-start
                                    gap-3
                                    rounded-xl
                                    border
                                    border-red-200
                                    bg-red-50
                                    p-4
                                    text-sm
                                    text-red-700
                                "
                            >

                                <i
                                    className="
                                        bi
                                        bi-exclamation-triangle-fill
                                        mt-0.5
                                    "
                                ></i>


                                <div>

                                    <p
                                        className="
                                            font-semibold
                                        "
                                    >
                                       <span>
                                           No se pudo iniciar sesión
                                       </span>
                                    </p>


                                    <p
                                        className="
                                            mt-1
                                            text-xs
                                        "
                                    >
                                        <span>
                                            {errors.general}
                                        </span>
                                    </p>

                                </div>

                            </div>

                        )}

                        {mensajeInformativo && (
                            <p
                                role="status"
                                className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"
                            >
                                {mensajeInformativo}
                            </p>
                        )}



                        {/* Éxito */}

                        {loginSuccess && (

                            <div
                                className="
                                    mb-5
                                    flex
                                    items-start
                                    gap-3
                                    rounded-xl
                                    border
                                    border-green-200
                                    bg-green-50
                                    p-4
                                    text-sm
                                    text-green-700
                                "
                            >

                                <i
                                    className="
                                        bi
                                        bi-check-circle-fill
                                        mt-0.5
                                    "
                                ></i>


                                <div>

                                    <p
                                        className="
                                            font-semibold
                                        "
                                    >
                                       <span>
                                           Inicio de sesión correcto
                                       </span>
                                    </p>


                                    <p
                                        className="
                                            mt-1
                                            text-xs
                                        "
                                    >
                                       <span>
                                           Bienvenido al sistema.
                                       </span>
                                    </p>

                                </div>

                            </div>

                        )}



                        {/* FORMULARIO */}

                        <form onSubmit={handleSubmit}>

                            <InputField
                                label="Usuario"
                                type="text"
                                name="logeo"
                                value={formData.logeo}
                                onChange={handleChange}
                                placeholder="Ingresa tu usuario"
                                icon="bi-person"
                                error={errors.logeo}
                            />


                            <InputField
                                label="Contraseña"
                                type="password"
                                name="clave"
                                value={formData.clave}
                                onChange={handleChange}
                                placeholder="Ingresa tu contraseña"
                                icon="bi-lock"
                                error={errors.clave}
                                showPassword={
                                    showPassword
                                }
                                onTogglePassword={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }
                            />


                            {/* Recordarme */}

                            <div
                                className="
                                    mb-6
                                    flex
                                    items-center
                                    justify-between
                                "
                            >

                                <label
                                    className="
                                        flex
                                        cursor-pointer
                                        items-center
                                        gap-2
                                        text-xs
                                        text-gray-500
                                    "
                                >

                                    <input
                                        type="checkbox"
                                        className="
                                            h-4
                                            w-4
                                            rounded
                                            border-gray-300
                                            text-blue-700
                                        "
                                        checked={recordarme}
                                        onChange={(event) =>
                                            setRecordarme(event.target.checked)
                                        }
                                    />

                                  <span>
                                      Recordarme
                                  </span>
                                </label>


                                <button
                                    type="button"
                                    className="
                                        text-xs
                                        font-semibold
                                        text-blue-800
                                    "
                                    onClick={() =>
                                        setMensajeInformativo(
                                            "Contacta al administrador del sistema para restablecer tu contraseña. La recuperación automática aún no está configurada."
                                        )
                                    }
                                >
                                   <span>
                                       ¿Olvidaste tu contraseña?
                                   </span>
                                </button>

                            </div>



                            {/* BOTÓN */}

                            <button
                                type="submit"
                                disabled={loading}
                                className="
                                    group
                                    flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-blue-800
                                    px-5
                                    py-3.5
                                    text-sm
                                    font-semibold
                                    text-white
                                    shadow-lg
                                    shadow-blue-900/20
                                    transition-all
                                    duration-200
                                    hover:-translate-y-0.5
                                    hover:bg-blue-900
                                    disabled:cursor-not-allowed
                                    disabled:opacity-70
                                "
                            >

                                {loading ? (

                                    <>

                                        <span
                                            className="
                                                h-4
                                                w-4
                                                animate-spin
                                                rounded-full
                                                border-2
                                                border-white/30
                                                border-t-white
                                            "
                                        ></span>

                                        Verificando...

                                    </>

                                ) : (

                                    <>

                                        Iniciar sesión

                                        <i
                                            className="
                                                bi
                                                bi-arrow-right
                                            "
                                        ></i>

                                    </>

                                )}

                            </button>

                        </form>



                        {/* Información */}

                        <div
                            className="
                                mt-8
                                border-t
                                border-gray-100
                                pt-6
                            "
                        >

                            <div
                                className="
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                    text-xs
                                    text-gray-400
                                "
                            >

                                <i
                                    className="
                                        bi
                                        bi-shield-check
                                    "
                                ></i>

                                <span>
                                    Sistema protegido
                                    y de acceso restringido
                                </span>

                            </div>

                        </div>

                    </div>

                </section>

            </div>

        </main>
    );
};

export default Login;