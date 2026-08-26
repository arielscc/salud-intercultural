import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SidebarNav } from "@/components/internal/SidebarNav";
import { normalizeActiveModules } from "@/features/modules/activation";
import type { ModuleAccessState } from "@/features/modules/access";
import { sigecoModuleCodes, type SigecoModuleCode } from "@/features/modules/catalog";

function access(
  active: string[],
  suspended: SigecoModuleCode[] = []
): ModuleAccessState {
  return { active: normalizeActiveModules(active), suspended };
}

const stageOne = access(["administracion", "inventario", "compras", "catalogo"]);
const everything = access([...sigecoModuleCodes]);

function labels() {
  return screen
    .getAllByRole("link")
    .map((link) => link.textContent?.trim())
    .filter(Boolean);
}

describe("SidebarNav", () => {
  it("muestra en la Etapa 1 solo Caja, Inventario, Compras, Catálogo y el núcleo", () => {
    render(<SidebarNav role="super_admin" moduleAccess={stageOne} />);

    expect(labels()).toEqual([
      "Inicio",
      "Caja",
      "Catálogo",
      "Inventario",
      "Compras",
      "Sucursales",
      "Auditoría",
      "Módulos",
      "Documentos",
      "Usuarios",
      "Mi cuenta"
    ]);
  });

  it("no ofrece ningún módulo clínico mientras no esté lanzado", () => {
    render(<SidebarNav role="super_admin" moduleAccess={stageOne} />);

    for (const label of ["Recepción", "Consulta", "Enfermería", "Seguimiento", "Opiniones"]) {
      expect(screen.queryByRole("link", { name: label })).toBeNull();
    }
  });

  it("muestra todo el menú del rol cuando los once módulos están activos", () => {
    render(<SidebarNav role="super_admin" moduleAccess={everything} />);

    for (const label of ["Recepción", "Consulta", "Enfermería", "Caja", "Seguimiento"]) {
      expect(screen.getByRole("link", { name: label })).toBeTruthy();
    }
  });

  it("sigue respetando el permiso del rol aunque el módulo esté activo", () => {
    render(<SidebarNav role="enfermeria" moduleAccess={everything} />);

    expect(screen.getByRole("link", { name: "Enfermería" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Caja" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Usuarios" })).toBeNull();
  });

  it("conserva el núcleo aunque no haya ningún módulo lanzado", () => {
    render(<SidebarNav role="super_admin" moduleAccess={access([])} />);

    expect(labels()).toEqual([
      "Inicio",
      "Sucursales",
      "Auditoría",
      "Módulos",
      "Documentos",
      "Usuarios",
      "Mi cuenta"
    ]);
  });
});
