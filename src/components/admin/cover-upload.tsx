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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    setUploading(true);

    const ext = file.name.split(".").pop();
    const fileName = `${courseSlug || Date.now()}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("course-covers")
      .upload(fileName, file, { upsert: true });

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
        <div className="relative group rounded-xl overflow-hidden border border-border">
          <img
            src={value}
            alt="Course cover"
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white transition-colors"
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
          className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-muted-foreground hover:border-primary/40 hover:bg-muted/50 transition-colors"
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
