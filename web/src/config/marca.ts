/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  TU MARCA: lo único que tienes que cambiar para hacerla tuya.    ║
 * ║  Nombre, textos, logo y colores. El resto del sistema es igual   ║
 * ║  para todos.                                                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * - Logo: sustituye `public/logo.png` (cuadrado, PNG con fondo transparente, 512×512 recomendado)
 *   y `src/app/icon.png` (el icono de la pestaña).
 * - Colores: en formato hexadecimal (#rrggbb).
 * - Las claves secretas (Discord, base de datos…) NO van aquí: van en las variables de entorno
 *   (mira `.env.example`).
 */
export const MARCA = {
  /** Nombre de tu comunidad o servidor. Sale en la cabecera, títulos, textos y pie. */
  nombre: "Mi Comunidad",

  /**
   * Cómo se pinta el nombre en la cabecera: la primera parte en blanco y la segunda con el color de acento.
   * Ejemplo: ["Mi", "Comunidad"]. Si prefieres todo en blanco, deja el segundo vacío: ["MiComunidad", ""].
   */
  nombrePartes: ["Mi", "Comunidad"] as [string, string],

  /** Descripción corta para Google y al compartir el enlace */
  descripcion: "Postúlate al equipo de Mi Comunidad: responde el examen y sigue tu postulación por MD de Discord.",

  /** Ruta del logo dentro de /public */
  logo: "/logo.png",

  /** Texto grande de la portada */
  portada: {
    titulo: "Construye Mi Comunidad con nosotros.",
    texto:
      "Buscamos gente con ganas para el equipo. Entra con Discord, responde el examen y recibe la respuesta por mensaje privado.",
  },

  /** Nombre del equipo para los textos ("el equipo de …", "el staff de …") */
  equipo: "staff",

  /** Línea opcional en el pie (por ejemplo: "No afiliado a Mojang ni Microsoft."). Vacío = no se muestra. */
  avisoPie: "",

  /** Colores de la web */
  colores: {
    /** Color principal: botones, enlaces, estados "aprobado"… */
    acento: "#4fdc86",
    /** Versión oscura del acento (sombras y degradados) */
    acentoOscuro: "#17633a",
    /** Fondo de la página */
    fondo: "#050807",
    /** Tarjetas y paneles */
    superficie: "#0c1310",
    /** Campos de texto y superficies elevadas */
    superficieAlta: "#121b17",
    /** Bordes y separadores */
    borde: "#213029",
    /** Texto principal */
    texto: "#e4eee8",
    /** Texto secundario */
    textoSuave: "#8c9e94",
  },
};

export type Marca = typeof MARCA;
