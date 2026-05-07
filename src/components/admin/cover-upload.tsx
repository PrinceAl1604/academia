"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface CoverUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  courseSlug?: string;
}

export function CoverUpload({ value, onChange, courseSlug }: CoverUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Whitelist of accepted image extensions. We use this rather than
  // parsing `file.name.split(".").pop()` directly because:
  //   1. The split returns the entire trailing segment after the
  //      LAST dot — `evil.png.html` → `html`, but `..\\..\\evil` →
  //      `evil` (no dot at all, returns the whole filename). Both
  //      slip past the original code.
  //   2. The MIME type from `file.type` is browser-supplied and
  //      can be spoofed by renaming a `.exe` to `.png`. The bucket
  //      should also enforce content-type, but client-side allow-
  //      list is the cheap first line.
  const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp"] as const;
  const ALLOWED_MIME = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as const;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type as typeof ALLOWED_MIME[number])) {
      alert("Please upload a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    // Extract extension from the filename, validate against the
    // allow-list, and DON'T pass the user-supplied filename through
    // to the storage path. A filename like `../../etc/passwd.png`
    // would otherwise become a Storage object key with traversal
    // segments, and while Supabase Storage is bucket-scoped (so
    // there's no real escape), the resulting key is still ugly and
    // makes the bucket harder to admin.
    const rawExt = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? "")
      .toLowerCase();
    if (!ALLOWED_EXT.includes(rawExt as typeof ALLOWED_EXT[number])) {
      alert("Unsupported file extension");
      return;
    }
    // Sanitize the slug part: keep only the alphabet that's safe
    // for Storage object keys. If the caller didn't pass one (new
    // course not yet saved), use a random suffix to keep keys
    // unique and unguessable. crypto.randomUUID returns 36 chars
    // including 4 hyphens — perfect for this use.
    const safeSlug = (courseSlug ?? "")
      .replace(/[^a-z0-9-]/gi, "")
      .toLowerCase()
      .slice(0, 60) || crypto.randomUUID();
    const fileName = `${safeSlug}-${Date.now()}.${rawExt}`;

    setUploading(true);

    const { error } = await supabase.storage
      .from("course-covers")
      .upload(fileName, file, { upsert: true, contentType: file.type });

    if (error) {
      alert("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("course-covers")
      .getPublicUrl(fileName);

    onChange(urlData.publicUrl);
    setUploading(false);

    // Reset input
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-input">
          <img
            src={value}
            alt="Course cover"
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg bg-red-500/90 p-1.5 text-white hover:bg-red-500 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-muted-foreground hover:border-input hover:bg-muted/50 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Uploading...</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              <div className="text-left">
                <p className="text-sm font-medium">Upload cover image</p>
                <p className="text-xs text-muted-foreground/70">
                  JPEG, PNG or WebP · Max 5MB · 16:9 recommended
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}
