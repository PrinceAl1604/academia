"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, User, Users } from "lucide-react";

/**
 * Admin edit-slot form — `/admin/sessions/[id]/edit`
 *
 * Same shape as the new-slot form, pre-filled from the existing slot.
 * Saves through /api/sessions/update-slot which handles the cascade
 * (notifying booked users via email when time changes, etc.).
 *
 * Type is intentionally NOT editable — switching 1:1 ↔ group while
 * bookings exist would be confusing (capacity changes, attendees
 * may need to re-confirm). If admin needs that, cancel + recreate.
 */

type SessionType = "one_on_one" | "group";

interface SessionSlot {
  id: string;
  type: SessionType;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  max_attendees: number;
  status: "open" | "cancelled" | "completed";
}

export default function AdminSlotEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useLanguage();
  const router = useRouter();

  const [slot, setSlot] = useState<SessionSlot | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [maxAttendees, setMaxAttendees] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("session_slots")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        const s = data as SessionSlot;
        setSlot(s);
        setTitle(s.title);
        setDescription(s.description ?? "");
        // datetime-local needs YYYY-MM-DDTHH:MM in local time, not UTC.
        const localIso = new Date(
          new Date(s.starts_at).getTime() -
            new Date().getTimezoneOffset() * 60_000
        )
          .toISOString()
          .slice(0, 16);
        setStartsAt(localIso);
        setDurationMinutes(s.duration_minutes);
        setMaxAttendees(s.max_attendees);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot) return;
    setError(null);

    if (!title.trim()) {
      setError(t.sessions.formErrorTitle);
      return;
    }
    const startMs = new Date(startsAt).getTime();
    if (startMs <= Date.now()) {
      setError(t.sessions.formErrorPast);
      return;
    }
    if (slot.type === "group" && maxAttendees < 2) {
      setError(t.sessions.formErrorCapacity);
      return;
    }

    setSaving(true);
    const res = await fetch("/api/sessions/update-slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slot_id: slot.id,
        title: title.trim(),
        description: description.trim(),
        starts_at: new Date(startsAt).toISOString(),
        duration_minutes: durationMinutes,
        max_attendees: maxAttendees,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.detail || body?.error || "Save failed");
      setSaving(false);
      return;
    }
    router.push(`/admin/sessions/${slot.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-2xl mx-auto">
        <p className="text-muted-foreground">Slot not found.</p>
      </div>
    );
  }

  const isGroup = slot.type === "group";
  const minDateTime = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60_000
  )
    .toISOString()
    .slice(0, 16);

  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-2xl mx-auto space-y-8">
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/admin/sessions/${slot.id}`} />}
          className="gap-1.5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {slot.title}
        </Button>
        <header className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            / Sessions / Edit
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            Edit slot
          </h1>
        </header>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type read-only — switching mid-bookings is confusing */}
            <div className="space-y-2">
              <Label>{t.sessions.formTypeLabel}</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm text-foreground">
                {isGroup ? (
                  <Users className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span>
                  {isGroup ? t.sessions.typeGroup : t.sessions.typeOneOnOne}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">{t.sessions.formTitleLabel}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t.sessions.formDescriptionLabel}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
              <div className="space-y-2">
                <Label htmlFor="starts_at">{t.sessions.formStartsAtLabel}</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  min={minDateTime}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">{t.sessions.formDurationLabel}</Label>
                <Select
                  value={String(durationMinutes)}
                  onValueChange={(v) => setDurationMinutes(Number(v))}
                >
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} {t.sessions.formMinutes}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">{t.sessions.formCapacityLabel}</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={50}
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(Number(e.target.value))}
                disabled={!isGroup}
              />
              {!isGroup && (
                <p className="text-xs text-muted-foreground">
                  {t.sessions.formCapacityHint}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                render={<Link href={`/admin/sessions/${slot.id}`} />}
              >
                {t.sessions.formCancel}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    {t.sessions.formSaving}
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
