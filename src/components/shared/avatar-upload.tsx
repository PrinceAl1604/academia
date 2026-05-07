"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp"] as const;
// 5 MB — matches storage.buckets.file_size_limit on the `avatars`
// bucket. The bucket cap is the authoritative boundary (Storage
// rejects oversized uploads server-side regardless of what the
// client claims); this constant is only here so the user gets
// instant rejection feedback without waiting on a round trip.
const MAX_BYTES = 5 * 1024 * 1024;

interface AvatarUploadProps {
  /** Initials shown when no avatar is set. */
  fallback: string;
  /** Optional className for the wrapper. */
  className?: string;
}

/**
 * Profile picture uploader. Drops into the dashboard settings page
 * and works against the `avatars` Supabase Storage bucket.
 *
 * Path layout: `{userId}/avatar.{ext}` — overwrite-in-place model.
 * On every successful upload we patch `users.avatar_url` and call
 * setAvatarUrl in the auth context with a cache-busting query
 * string so the topbar avatar refreshes immediately.
 *
 * Why no cropper UI: a browser-side cropper (react-image-crop or
 * similar) is ~30KB of dependency for a feature most users will
 * use once. The Avatar component already uses object-fit cover, so
 * a non-square upload still renders cleanly inside the circle.
 * Worth revisiting if profile-pic engagement justifies the size.
 */
export function AvatarUpload({ fallback, className }: AvatarUploadProps) {
  const { user, avatarUrl, setAvatarUrl } = useAuth();
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice in a row still
    // fires onChange — browsers treat repeat selections as no-ops
    // unless the value is cleared.
    if (inputRef.current) inputRef.current.value = "";
    if (!file || !user) return;

    setError(null);

    if (!ALLOWED_MIME.includes(file.type as typeof ALLOWED_MIME[number])) {
      setError(
        isEn
          ? "Please upload a JPEG, PNG, or WebP image."
          : "Veuillez choisir une image JPEG, PNG ou WebP."
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(
        isEn
          ? "Image must be under 5 MB."
          : "L'image doit faire moins de 5 Mo."
      );
      return;
    }

    // Validate extension separately from MIME — both can lie
    // independently, allow-listing both closes the door on
    // file-type spoofing across the two checks.
    const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? "")
      .toLowerCase();
    if (!ALLOWED_EXT.includes(ext as typeof ALLOWED_EXT[number])) {
      setError(
        isEn ? "Unsupported file extension." : "Extension non supportée."
      );
      return;
    }

    setBusy(true);
    try {
      // Path = `{userId}/avatar.{ext}` — RLS policy on the bucket
      // (see migration `avatars_bucket`) restricts INSERT/UPDATE to
      // files where the first folder segment matches auth.uid().
      const objectPath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(objectPath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(objectPath);
      // Cache-bust: the public URL is stable across uploads (we
      // overwrite the same object), so browsers would keep showing
      // the old image from cache. Append the upload timestamp so
      // every successful upload yields a unique URL.
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      const { error: dbError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (dbError) throw dbError;

      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error("[avatar-upload] failed:", err);
      setError(
        isEn
          ? "Couldn't upload — please try again."
          : "Échec du téléversement — réessayez."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!user || !avatarUrl) return;
    setBusy(true);
    setError(null);
    try {
      // The path-without-querystring is what Storage knows about;
      // strip the cache-buster.
      const baseUrl = avatarUrl.split("?")[0];
      const marker = "/avatars/";
      const idx = baseUrl.indexOf(marker);
      if (idx >= 0) {
        const path = baseUrl.slice(idx + marker.length);
        await supabase.storage.from("avatars").remove([path]);
      }
      const { error: dbError } = await supabase
        .from("users")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (dbError) throw dbError;
      setAvatarUrl(null);
    } catch (err) {
      console.error("[avatar-upload] remove failed:", err);
      setError(
        isEn
          ? "Couldn't remove — please try again."
          : "Échec de la suppression — réessayez."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-16 w-16">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback className="bg-muted text-lg font-semibold dark:text-muted-foreground/70">
              {fallback}
            </AvatarFallback>
          </Avatar>
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
            {avatarUrl
              ? isEn ? "Change photo" : "Changer la photo"
              : isEn ? "Upload photo" : "Téléverser une photo"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              {isEn ? "Remove" : "Supprimer"}
            </button>
          )}
          <p className="text-[11px] text-muted-foreground/70">
            {isEn ? "JPEG, PNG, WebP · Max 5 MB" : "JPEG, PNG, WebP · Max 5 Mo"}
          </p>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
