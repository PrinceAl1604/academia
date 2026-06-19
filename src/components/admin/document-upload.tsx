"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload, FileText, X } from "lucide-react";
import type { SpaceDocument } from "@/lib/community/types";

const MAX_BYTES = 50 * 1024 * 1024; // matches the bucket file_size_limit

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Admin multi-file uploader for `document` spaces. Uploads each file to the
 * private `space-documents` bucket and maintains the `SpaceDocument[]` list
 * (name + storage path + size + mime) that gets saved into the space config.
 * Removing a file deletes the storage object too, so the bucket stays clean.
 */
export function DocumentUpload({
  value,
  onChange,
  prefix,
  isEn,
}: {
  value: SpaceDocument[];
  onChange: (docs: SpaceDocument[]) => void;
  prefix?: string;
  isEn: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    const added: SpaceDocument[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        alert(`${file.name}: ${isEn ? "over 50MB" : "dépasse 50 Mo"}`);
        continue;
      }
      // Don't pass the user filename into the object key (traversal / ugly
      // keys); namespace by a sanitized prefix + a uuid, keep a cleaned name.
      const safe =
        (prefix ?? "doc").replace(/[^a-z0-9-]/gi, "").toLowerCase().slice(0, 40) || "doc";
      const cleanName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${safe}/${crypto.randomUUID()}-${cleanName}`;
      const { error } = await supabase.storage
        .from("space-documents")
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
      if (error) {
        alert(`${isEn ? "Upload failed" : "Échec de l'envoi"}: ${file.name} — ${error.message}`);
        continue;
      }
      added.push({
        name: file.name,
        path,
        size: file.size,
        mime: file.type || "application/octet-stream",
      });
    }
    if (added.length) onChange([...value, ...added]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (doc: SpaceDocument) => {
    const { error } = await supabase.storage.from("space-documents").remove([doc.path]);
    if (error) {
      alert(`${isEn ? "Remove failed" : "Échec de la suppression"}: ${error.message}`);
      return; // keep it in the list so we don't orphan the object
    }
    onChange(value.filter((d) => d.path !== doc.path));
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((doc) => (
            <li
              key={doc.path}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-foreground">{doc.name}</span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">
                {humanSize(doc.size)}
              </span>
              <button
                type="button"
                onClick={() => remove(doc)}
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-red-500"
                title={isEn ? "Remove" : "Supprimer"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-input hover:bg-muted/50 disabled:opacity-60"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isEn ? "Uploading…" : "Envoi…"}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {isEn ? "Upload files" : "Téléverser des fichiers"}
          </>
        )}
      </button>
      <p className="text-xs text-muted-foreground/70">
        {isEn ? "Any file · Max 50MB each" : "Tout fichier · 50 Mo max chacun"}
      </p>
    </div>
  );
}
