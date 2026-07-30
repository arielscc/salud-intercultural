"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function getBreadcrumbItems(pathname: string): BreadcrumbItem[] | null {
  const segments = pathname.split("/").filter(Boolean);
  const moduleSegment = segments[1];
  const section = segments[2];
  const id = segments[3];
  const action = segments[4];

  if (moduleSegment === "recepcion" && section === "nuevo") {
    return [
      { label: "Recepción", href: "/sigeco/recepcion" },
      { label: "Registrar llegada" }
    ];
  }

  if (moduleSegment === "recepcion" && section === "duplicados") {
    return id
      ? [
          { label: "Recepción", href: "/sigeco/recepcion" },
          {
            label: "Duplicados",
            href: "/sigeco/recepcion/duplicados"
          },
          { label: "Comparar" }
        ]
      : [
          { label: "Recepción", href: "/sigeco/recepcion" },
          { label: "Duplicados" }
        ];
  }

  if (moduleSegment === "recepcion" && section === "abandonos") {
    return [
      { label: "Recepción", href: "/sigeco/recepcion" },
      { label: "Abandonos y pendientes" }
    ];
  }

  if (moduleSegment === "recepcion" && section === "pacientes" && id) {
    const items: BreadcrumbItem[] = [
      { label: "Recepción", href: "/sigeco/recepcion" },
      { label: "Pacientes", href: "/sigeco/recepcion?vista=pacientes" }
    ];

    if (action === "editar") {
      items.push({ label: "Ficha", href: `/sigeco/recepcion/pacientes/${id}` });
      items.push({ label: "Editar" });
    } else {
      items.push({ label: "Ficha" });
    }

    return items;
  }

  if (moduleSegment === "recepcion" && section === "visitas" && id) {
    return [
      { label: "Recepción", href: "/sigeco/recepcion" },
      { label: "Visitas", href: "/sigeco/recepcion" },
      { label: "Detalle" }
    ];
  }

  if (moduleSegment === "consultas" && section && id === "historial") {
    return [
      { label: "Consulta", href: "/sigeco/consultas" },
      {
        label: "Atención",
        href: `/sigeco/consultas/${section}`
      },
      { label: "Historial" }
    ];
  }

  const detailModules: Record<string, { label: string; href: string; detail: string }> = {
    consultas: { label: "Consulta", href: "/sigeco/consultas", detail: "Atención" },
    enfermeria: { label: "Enfermería", href: "/sigeco/enfermeria", detail: "Tarea" },
    seguimientos: {
      label: "Seguimiento",
      href: "/sigeco/seguimientos",
      detail: "Contacto"
    },
    inventario: { label: "Inventario", href: "/sigeco/inventario", detail: "Producto" }
  };
  const detailModule = detailModules[moduleSegment];

  if (detailModule && section) {
    return [
      { label: detailModule.label, href: detailModule.href },
      { label: detailModule.detail }
    ];
  }

  if (moduleSegment === "administracion" && section === "ventas" && id) {
    return [
      { label: "Caja", href: "/sigeco/administracion" },
      { label: "Ventas", href: "/sigeco/administracion" },
      { label: "Comprobante" }
    ];
  }

  if (
    moduleSegment === "administracion" &&
    section === "caja" &&
    id === "cierres"
  ) {
    return [
      { label: "Caja", href: "/sigeco/administracion" },
      { label: "Control de Caja", href: "/sigeco/administracion/caja" },
      { label: "Cierre" }
    ];
  }

  if (moduleSegment === "administracion" && section === "caja") {
    return [
      { label: "Caja", href: "/sigeco/administracion" },
      { label: "Control de Caja" }
    ];
  }

  if (moduleSegment === "administracion" && section) {
    return [
      { label: "Caja", href: "/sigeco/administracion" },
      { label: "Cobro" }
    ];
  }

  if (moduleSegment === "auditoria") {
    return [{ label: "Auditoría" }];
  }

  if (moduleSegment === "atribucion") {
    return [{ label: "Captación y atribución" }];
  }

  if (moduleSegment === "usuarios") {
    return section
      ? [
          { label: "Usuarios", href: "/sigeco/usuarios" },
          { label: "Detalle" }
        ]
      : [{ label: "Usuarios" }];
  }

  if (moduleSegment === "mi-cuenta") {
    return [{ label: "Mi cuenta" }];
  }

  return null;
}

export function DesktopBreadcrumb() {
  const pathname = usePathname();
  const items = getBreadcrumbItems(pathname);

  if (!items) return null;

  return (
    <nav className="mb-3 hidden min-h-5 items-center lg:flex" aria-label="Ruta de navegación">
      <ol className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted/60" aria-hidden="true" />
              ) : null}
              {item.href && !current ? (
                <Link
                  href={item.href}
                  className="focus-ring truncate rounded-[7px] hover:text-primary-dark hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="truncate font-semibold text-text"
                  aria-current={current ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
