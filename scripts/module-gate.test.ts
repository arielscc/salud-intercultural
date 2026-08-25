import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { InternalPermission } from "@/generated/prisma/client";
import { sigecoModuleCodes } from "@/features/modules/catalog";
import { permissionModules } from "@/features/modules/permission-modules";
import { sigecoNavItems } from "@/components/internal/nav-items";

/*
 * El gate de módulos vive en `requirePermission` y `runAuditedAction`, así que
 * cubre todas las páginas y acciones sin repetir código. Queda un caso que el
 * gate no puede resolver solo: cuando varios módulos habilitan el mismo permiso,
 * el sistema no sabe a cuál pertenece la pantalla. `/sigeco/inventario` usa
 * `inventory_read`, que también habilitan Administración y Compras; sin fijar el
 * módulo, Inventario seguiría abierto con Inventario apagado.
 *
 * Estas pruebas obligan a decidirlo cada vez que aparece un caso nuevo.
 */

function source(path: string) {
  return readFileSync(path, "utf8");
}

function applicationFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" ? [] : applicationFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")
      ? [path]
      : [];
  });
}

function relative(path: string) {
  return path.replace(`${process.cwd()}/`, "");
}

function isShared(permission: string) {
  const modules = permissionModules[permission as InternalPermission];
  return Boolean(modules) && modules.length > 1;
}

/**
 * Acciones que usan un permiso compartido a propósito: pertenecen a varias
 * áreas y basta con que una esté lanzada. Agregar una entrada aquí es una
 * decisión consciente, no un descuido.
 */
const intentionallyShared: Record<string, string> = {
  "src/features/area-times/actions.ts:area_time_write":
    "Recepción, Consulta, Enfermería y Administración marcan su propio tiempo de atención.",
  "src/features/attribution/actions.ts:attribution_manage":
    "La fuente de captación se registra en la llegada y se analiza en los reportes.",
  "src/features/patients/actions.ts:patients_create":
    "El alta de una ficha la hacen Recepción y, desde la Etapa 1, Administración.",
  "src/app/(internal)/sigeco/api/clinical-attachments/route.ts:attachments_write":
    "Los adjuntos se cargan desde la ficha, la consulta y Enfermería.",
  "src/app/(internal)/sigeco/api/clinical-attachments/[attachmentId]/route.ts:attachments_delete":
    "Borrar un adjunto sigue reservado al super administrador por rol.",
  "src/app/(internal)/sigeco/api/clinical-attachments/[attachmentId]/content/route.ts:attachments_read":
    "El contenido de un adjunto se lee desde la ficha, la consulta y Enfermería.",
  "src/app/(internal)/sigeco/api/clinical-attachments/[attachmentId]/grant/route.ts:attachments_read":
    "El acceso temporal se concede desde la ficha, la consulta y Enfermería."
};

describe("gate de módulos", () => {
  it("fija el módulo en cada página cuyo permiso comparten varios módulos", () => {
    const pages = applicationFiles(
      resolve(process.cwd(), "src/app/(internal)/sigeco/(app)")
    ).filter((file) => file.endsWith("/page.tsx"));

    for (const file of pages) {
      const contents = source(file);
      const calls = contents.matchAll(
        /requirePermission\(\s*"(\w+)"\s*(,\s*\{[^}]*\})?\s*\)/g
      );

      for (const [, permission, options] of calls) {
        if (!isShared(permission)) continue;
        expect(
          options ?? "",
          `${relative(file)} usa ${permission}, que comparten ${permissionModules[
            permission as InternalPermission
          ].join(", ")}: debe fijar { module: ... }`
        ).toMatch(/module:\s*"\w+"/);
      }
    }
  });

  it("solo fija módulos que existen en el catálogo", () => {
    const files = applicationFiles(resolve(process.cwd(), "src"));

    for (const file of files) {
      for (const [, code] of source(file).matchAll(/\bmodule:\s*"([\w-]+)"/g)) {
        expect(sigecoModuleCodes, `${relative(file)} fija un módulo desconocido`).toContain(
          code
        );
      }
    }
  });

  it("obliga a decidir el módulo de cada acción con permiso compartido", () => {
    const files = applicationFiles(resolve(process.cwd(), "src")).filter(
      (file) => file.includes("/features/") || file.includes("/api/")
    );

    for (const file of files) {
      const contents = source(file);
      for (const match of contents.matchAll(/permission:\s*"(\w+)",\n([^\n]*\n)?/g)) {
        const permission = match[1];
        if (!isShared(permission)) continue;
        const pinned = /module:\s*"\w+"/.test(match[2] ?? "");
        const key = `${relative(file)}:${permission}`;
        expect(
          pinned || key in intentionallyShared,
          `${key} usa un permiso compartido: fija { module } o documenta por qué no`
        ).toBe(true);
      }
    }
  });

  it("no deja entradas obsoletas en la lista de permisos compartidos", () => {
    for (const key of Object.keys(intentionallyShared)) {
      const [file, permission] = key.split(":");
      expect(isShared(permission), `${key} ya no es un permiso compartido`).toBe(true);
      expect(
        source(resolve(process.cwd(), file)),
        `${key} ya no usa ese permiso`
      ).toContain(`permission: "${permission}"`);
    }
  });

  it("declara un módulo del catálogo en cada entrada del menú", () => {
    for (const item of sigecoNavItems) {
      expect(sigecoModuleCodes, `${item.href} declara un módulo desconocido`).toContain(
        item.module
      );
    }
  });

  it("mantiene el módulo del menú igual al que fija su página", () => {
    for (const item of sigecoNavItems) {
      const file = resolve(
        process.cwd(),
        `src/app/(internal)/sigeco/(app)${item.href.replace("/sigeco", "")}/page.tsx`
      );
      const call = source(file).match(
        new RegExp(
          `requirePermission\\(\\s*"${item.permission}"\\s*,\\s*\\{[^}]*module:\\s*"(\\w+)"`
        )
      );

      // Si la página no fija módulo, el permiso ya identifica al suyo.
      if (!call) continue;
      expect(call[1], `${item.href}: el menú y la página no coinciden`).toBe(item.module);
    }
  });
});
