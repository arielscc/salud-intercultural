import { withPayload } from "@payloadcms/next/withPayload";

const privateRouteHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0, must-revalidate"
  },
  {
    key: "Pragma",
    value: "no-cache"
  },
  {
    key: "Referrer-Policy",
    value: "no-referrer"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet"
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb"
    }
  },
  /*
   * `payload.config.ts` importa `sharp` de forma estatica, asi que cualquier
   * ruta que toque Payload lo carga: el formulario publico en `/api/leads` y
   * todas las Server Actions de SIGECO, que comparten el chunk del servidor.
   *
   * El rastreo de archivos de Next sigue los `require` de JavaScript, pero la
   * libreria nativa `libvips-cpp.so` no la pide ningun `require`: la resuelve el
   * enlazador dinamico desde el RPATH del binario `.node`. Sin esta inclusion el
   * `.so` no entra en la funcion y el despliegue devuelve 500 con
   * `ERR_DLOPEN_FAILED: libvips-cpp.so: cannot open shared object file`
   * en cada escritura, aunque el build pase.
   *
   * Detectado el 2026-08-27 en staging: no se podia guardar nada ni cerrar
   * sesion. La ruta es plana porque `pnpm-workspace.yaml` fija
   * `nodeLinker: hoisted`, sin cuyo diseño el empaquetador de Vercel rechaza la
   * funcion por enlaces simbolicos. Los dos archivos van juntos.
   */
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@img/sharp-libvips-linux-x64/lib/**/*"]
  },
  /*
   * Rutas que la fusion V3.7 movio dentro de Recepcion. Existen solo para no
   * romper marcadores viejos: nada en el codigo enlaza a ellas.
   *
   * Vivian como tres `page.tsx` que llamaban a `redirect()` y nada mas. Eso
   * hacia que React instrumentara el render de un componente que lanza al
   * instante, y el navegador registraba en cada visita
   * `Failed to execute 'measure' on 'Performance': cannot have a negative time
   * stamp`. No rompia la navegacion; ensuciaba la consola donde se buscan
   * errores de verdad.
   *
   * Aca la redireccion ocurre antes de renderizar nada. No es permanente a
   * proposito: un 308 se queda cacheado en el navegador y estas rutas todavia
   * pueden moverse.
   */
  async redirects() {
    return [
      {
        source: "/sigeco/pacientes",
        destination: "/sigeco/recepcion?vista=pacientes",
        permanent: false
      },
      {
        source: "/sigeco/pacientes/nuevo",
        destination: "/sigeco/recepcion/nuevo",
        permanent: false
      },
      {
        source: "/sigeco/visitas",
        destination: "/sigeco/recepcion",
        permanent: false
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/sigeco/:path*",
        headers: privateRouteHeaders
      },
      {
        source: "/admin/:path*",
        headers: privateRouteHeaders
      },
      {
        source: "/api/:path*",
        headers: privateRouteHeaders
      },
      {
        source: "/encuesta/:path*",
        headers: privateRouteHeaders
      }
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536],
    imageSizes: [96, 160, 220, 320, 480, 720, 900],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com"
      }
    ]
  }
};

export default withPayload(nextConfig);
