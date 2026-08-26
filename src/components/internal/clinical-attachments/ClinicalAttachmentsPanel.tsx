"use client";

import {
  Camera,
  Download,
  Eye,
  FileImage,
  FileText,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { internalInputClassName } from "@/components/internal/Field";
import { Button } from "@/components/internal/ui/Button";
import { Card, CardHeader } from "@/components/internal/ui/Card";
import { formatDateTime } from "@/lib/dates";

type AttachmentItem = {
  id: string;
  label: string;
  contentType: string;
  sizeBytes: number;
  scanStatus: "basic_validation_only" | "pending" | "clean" | "rejected";
  createdAt: string;
  visitId: string | null;
  studyId: string | null;
  uploadedByName: string | null;
  visitLabel: string | null;
  studyTitle: string | null;
};

type RelatedOption = {
  id: string;
  label: string;
};

type UploadState = {
  progress: number;
  state: "pending" | "uploading" | "done" | "error";
  message?: string;
};

type PreviewState = {
  url: string;
  contentType: string;
  label: string;
};

const maximumSelection = 8;
const imageCompressionThreshold = 1_500_000;
const maximumImageDimension = 2200;

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function compressMobilePhoto(file: File) {
  if (
    file.type !== "image/jpeg" ||
    file.size < imageCompressionThreshold ||
    typeof createImageBitmap !== "function"
  ) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    maximumImageDimension / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82)
  );

  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name, {
    type: "image/jpeg",
    lastModified: file.lastModified
  });
}

async function readJsonResponse(response: Response) {
  return (await response.json().catch(() => null)) as {
    error?: string;
    token?: string;
  } | null;
}

export function ClinicalAttachmentsPanel({
  patientId,
  attachments,
  visits,
  studies,
  canWrite,
  canDelete
}: {
  patientId: string;
  attachments: AttachmentItem[];
  visits: RelatedOption[];
  studies: RelatedOption[];
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const requestIds = useRef(new Map<string, string>());
  const [files, setFiles] = useState<File[]>([]);
  const [label, setLabel] = useState("Documento clínico");
  const [visitId, setVisitId] = useState("");
  const [studyId, setStudyId] = useState("");
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [generalMessage, setGeneralMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview]
  );

  function selectFiles(selected: FileList | null) {
    if (!selected) return;
    const next = Array.from(selected).slice(0, maximumSelection);
    setFiles(next);
    setGeneralMessage(
      selected.length > maximumSelection
        ? `Se seleccionaron solo los primeros ${maximumSelection} archivos.`
        : ""
    );
    setUploadStates(
      Object.fromEntries(
        next.map((file) => [
          fileKey(file),
          { progress: 0, state: "pending" satisfies UploadState["state"] }
        ])
      )
    );
  }

  async function uploadFile(originalFile: File) {
    const key = fileKey(originalFile);
    const uploadRequestId = requestIds.current.get(key) ?? crypto.randomUUID();
    requestIds.current.set(key, uploadRequestId);
    let file = originalFile;

    try {
      file = await compressMobilePhoto(originalFile);
    } catch {
      file = originalFile;
    }

    setUploadStates((current) => ({
      ...current,
      [key]: { progress: 0, state: "uploading" }
    }));

    await new Promise<void>((resolve) => {
      const request = new XMLHttpRequest();
      const formData = new FormData();
      formData.set("patientId", patientId);
      formData.set("uploadRequestId", uploadRequestId);
      formData.set("label", label);
      if (visitId) formData.set("visitId", visitId);
      if (studyId) formData.set("studyId", studyId);
      formData.set("file", file);

      request.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        setUploadStates((current) => ({
          ...current,
          [key]: {
            progress: Math.round((event.loaded / event.total) * 100),
            state: "uploading"
          }
        }));
      });

      request.addEventListener("load", () => {
        const body = (() => {
          try {
            return JSON.parse(request.responseText) as { error?: string };
          } catch {
            return null;
          }
        })();
        const succeeded = request.status >= 200 && request.status < 300;
        setUploadStates((current) => ({
          ...current,
          [key]: {
            progress: succeeded ? 100 : current[key]?.progress ?? 0,
            state: succeeded ? "done" : "error",
            message: succeeded
              ? file.size < originalFile.size
                ? `Comprimida a ${formatBytes(file.size)} y guardada`
                : "Guardado"
              : body?.error ?? "No se pudo subir"
          }
        }));
        resolve();
      });

      request.addEventListener("error", () => {
        setUploadStates((current) => ({
          ...current,
          [key]: {
            progress: current[key]?.progress ?? 0,
            state: "error",
            message: "Se perdió la conexión. Puedes reintentar sin duplicar."
          }
        }));
        resolve();
      });

      request.open("POST", "/sigeco/api/clinical-attachments");
      request.setRequestHeader("Accept", "application/json");
      request.send(formData);
    });
  }

  async function uploadSelected() {
    if (!files.length || !label.trim()) return;
    setUploading(true);
    setGeneralMessage("");

    for (const file of files) {
      if (uploadStates[fileKey(file)]?.state === "done") continue;
      await uploadFile(file);
    }

    setUploading(false);
    router.refresh();
  }

  async function requestContent(
    attachment: AttachmentItem,
    purpose: "preview" | "download"
  ) {
    setOpeningId(attachment.id);
    setGeneralMessage("");
    const grantResponse = await fetch(
      `/sigeco/api/clinical-attachments/${attachment.id}/grant`,
      {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose })
      }
    );
    const grant = await readJsonResponse(grantResponse);

    if (!grantResponse.ok || !grant?.token) {
      setGeneralMessage(grant?.error ?? "No se pudo autorizar el archivo.");
      setOpeningId(null);
      return;
    }

    const contentResponse = await fetch(
      `/sigeco/api/clinical-attachments/${attachment.id}/content`,
      {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, token: grant.token })
      }
    );

    if (!contentResponse.ok) {
      const body = await readJsonResponse(contentResponse);
      setGeneralMessage(body?.error ?? "No se pudo abrir el archivo.");
      setOpeningId(null);
      return;
    }

    const blob = await contentResponse.blob();
    const url = URL.createObjectURL(blob);

    if (purpose === "download") {
      const link = document.createElement("a");
      const extension =
        attachment.contentType === "application/pdf"
          ? "pdf"
          : attachment.contentType === "image/png"
            ? "png"
            : attachment.contentType === "image/webp"
              ? "webp"
              : "jpg";
      link.href = url;
      link.download = `documento-clinico.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({
        url,
        contentType: attachment.contentType,
        label: attachment.label
      });
    }

    setOpeningId(null);
  }

  async function deleteAttachment(attachmentId: string) {
    setDeletingId(attachmentId);
    setGeneralMessage("");
    const response = await fetch(
      `/sigeco/api/clinical-attachments/${attachmentId}`,
      {
        method: "DELETE",
        cache: "no-store"
      }
    );
    const body = await readJsonResponse(response);
    setDeletingId(null);
    setDeleteCandidate(null);

    if (!response.ok) {
      setGeneralMessage(body?.error ?? "No se pudo eliminar el archivo.");
      return;
    }
    if (preview) {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
    router.refresh();
  }

  return (
    <Card className="max-sm:order-10">
      <CardHeader
        title="Adjuntos clínicos privados"
        description="Resultados, fotografías y documentos accesibles solo para personal autorizado."
        action={<ShieldCheck className="h-5 w-5 text-primary-dark" aria-hidden="true" />}
      />

      {generalMessage ? (
        <p className="mb-4 rounded-[9px] bg-warning/10 px-3 py-2 text-sm text-text">
          {generalMessage}
        </p>
      ) : null}

      {canWrite ? (
        <div className="mb-5 grid gap-3 rounded-[9px] border border-border bg-surface-soft p-3">
          <label className="grid gap-1 text-xs font-semibold text-text">
            Descripción para todos los archivos seleccionados
            <input
              className={internalInputClassName}
              value={label}
              maxLength={80}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ej. Resultado de laboratorio"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-text">
              Visita relacionada, opcional
              <select
                className={internalInputClassName}
                value={visitId}
                onChange={(event) => setVisitId(event.target.value)}
              >
                <option value="">Ficha general del paciente</option>
                {visits.map((visit) => (
                  <option key={visit.id} value={visit.id}>
                    {visit.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-text">
              Estudio relacionado, opcional
              <select
                className={internalInputClassName}
                value={studyId}
                onChange={(event) => setStudyId(event.target.value)}
              >
                <option value="">Sin estudio específico</option>
                {studies.map((study) => (
                  <option key={study.id} value={study.id}>
                    {study.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-border bg-surface px-3 text-sm font-semibold text-text hover:border-primary/40">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Elegir archivos
              <input
                className="sr-only"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => selectFiles(event.target.files)}
              />
            </label>
            <label className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-border bg-surface px-3 text-sm font-semibold text-text hover:border-primary/40">
              <Camera className="h-4 w-4" aria-hidden="true" />
              Tomar foto
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg"
                capture="environment"
                onChange={(event) => selectFiles(event.target.files)}
              />
            </label>
          </div>

          {files.length > 0 ? (
            <ul className="grid gap-2" aria-label="Progreso de archivos">
              {files.map((file) => {
                const state = uploadStates[fileKey(file)];
                return (
                  <li
                    key={fileKey(file)}
                    className="rounded-[7px] border border-border bg-surface px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate font-semibold text-text">
                        {file.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {state?.message ?? formatBytes(file.size)}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                      <span
                        className={`block h-full rounded-full ${
                          state?.state === "error" ? "bg-error" : "bg-primary"
                        }`}
                        style={{ width: `${state?.progress ?? 0}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <Button
            type="button"
            disabled={uploading || files.length === 0 || !label.trim()}
            onClick={uploadSelected}
          >
            {uploading ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {Object.values(uploadStates).some((item) => item.state === "error")
              ? "Reintentar pendientes"
              : `Subir ${files.length || ""} archivo${files.length === 1 ? "" : "s"}`}
          </Button>
          <p className="text-xs text-muted">
            Máximo 8 archivos de 4 MB cada uno. Las fotos JPG grandes se comprimen
            antes de subirlas.
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        {attachments.map((attachment) => (
          <article
            key={attachment.id}
            className="rounded-[9px] border border-border px-3 py-3"
          >
            <div className="flex items-start gap-3">
              {attachment.contentType === "application/pdf" ? (
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />
              ) : (
                <FileImage className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text">{attachment.label}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatBytes(attachment.sizeBytes)} ·{" "}
                  {formatDateTime(new Date(attachment.createdAt))}
                  {attachment.uploadedByName
                    ? ` · ${attachment.uploadedByName}`
                    : ""}
                </p>
                {attachment.studyTitle || attachment.visitLabel ? (
                  <p className="mt-1 text-xs text-muted">
                    {attachment.studyTitle ?? attachment.visitLabel}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={openingId === attachment.id}
                onClick={() => requestContent(attachment, "preview")}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                Ver
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={openingId === attachment.id}
                onClick={() => requestContent(attachment, "download")}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Descargar
              </Button>
              {canDelete ? (
                deleteCandidate === attachment.id ? (
                  <>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={deletingId === attachment.id}
                      onClick={() => deleteAttachment(attachment.id)}
                    >
                      Confirmar eliminación
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteCandidate(null)}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteCandidate(attachment.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Eliminar
                  </Button>
                )
              ) : null}
            </div>
          </article>
        ))}
        {attachments.length === 0 ? (
          <p className="rounded-[9px] border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            Todavía no existen adjuntos clínicos para este paciente.
          </p>
        ) : null}
      </div>

      {preview ? (
        <div className="mt-5 rounded-[9px] border border-border bg-surface-soft p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-semibold text-text">{preview.label}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                URL.revokeObjectURL(preview.url);
                setPreview(null);
              }}
            >
              Cerrar vista previa
            </Button>
          </div>
          {preview.contentType === "application/pdf" ? (
            <iframe
              className="h-[60dvh] w-full rounded-[7px] border border-border bg-white"
              src={preview.url}
              title={`Vista previa: ${preview.label}`}
              sandbox=""
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- private object URL cannot use next/image.
            <img
              className="max-h-[60dvh] w-full rounded-[7px] object-contain"
              src={preview.url}
              alt={preview.label}
            />
          )}
        </div>
      ) : null}
    </Card>
  );
}
