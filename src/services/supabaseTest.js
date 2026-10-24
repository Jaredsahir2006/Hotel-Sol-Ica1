import { supabase } from "../config/supabase";

export const probarConexionSupabase = async () => {
  const { data, error } = await supabase
    .from("usuario")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error de Supabase:", error);
    return {
      success: false,
      error,
    };
  }

  console.log("Conexión correcta con Supabase.");
  console.log("Registro obtenido:", data);

  return {
    success: true,
    data,
  };
};