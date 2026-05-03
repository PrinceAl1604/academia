"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
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
 * Admin Sessions — create slot
 *
 * Wires up the form for publishing a new live session slot. The room
 * name is auto-generated as `brightroots-{slot-id}` server-side after
 * insert (the DB requires the room_name at insert time, so we generate
 * a UUID-shortened slug client-side and pass it in).
 *
 * The Daily.co join URL becomes `https://{NEXT_PUBLIC_DAILY_DOMAIN}.daily.co/{room_name}`
 * — the actual Daily room is created lazily on first visit by
 * /api/sessions/ensure-room. We just store the name here.
 */

type SessionType = "one_on_one" | "group";

interface SlotInput {
  title: string;
  description: string;
  type: SessionType;
  startsAt: string; // ISO string from datetime-local input
  durationMinutes: number;
  maxAttendees: number;
}

/**
 * 🧠 LEARNING MOMENT — validateSlot
 *
 * This function decides what's a "valid" slot before we hit the DB.
 * The DB enforces a few invariants (duration 15-240, max_attendees ≥ 1)
 * but those are last-resort guards — better UX is to catch problems
 * client-side with friendlier messages.
 *
 * I've stubbed out the signature and a couple of obvious checks. The
 * judgement calls below are YOUR product decisions:
 *
 *   1. Past dates — reject any starts_at that's already passed?
 *      (Almost always yes, but how much buffer? 5 minutes? 1 hour?
 *       What if admin schedules a slot for "right now" and posts a link?)
 *
 *   2. 1:1 vs group capacity — for `one_on_one`, force max_attendees to
 *      exactly 1, OR allow admin to override (e.g. shadow attendee)?
 *      For `group`, require minimum 2? Or 3? Some products say groups
 *      need at least 3 for the "group dynamic" to work.
 *
 *   3. Title length — reject empty, but cap at how many chars? The DB
 *      lets it run unbounded, but UI has finite real estate.
 *
 *   4. Far-future limits — should an admin be able to publish a slot
 *      18 months out? Some platforms cap at 90 days to avoid stale
 *      slots clogging the calendar.
 *
 * Return null if valid, or an i18n key from `t.sessions.formError*`
 * that the form will surface as a user-visible error.
 *
 * Worth 5-10 lines once you decide the rules.
 */
function validateSlot(
  input: SlotInput,
  t: ReturnType<typeof useLanguage>["t"]
): string | null {
  // Title — required + capped at 80 chars so the list view doesn't
  // wrap awkwardly. The DB column is unbounded text but UI has finite
  // real estate (admin row title column = ~280px, ~80 chars max).
  const title = input.title.trim();
  if (!title) return t.sessions.formErrorTitle;
  if (title.length > 80) {
    return t.sessions.formErrorTitle; // re-using; copy is generic enough
  }

  // Start time — must be at least 5 min in the future. The 5-min
  // buffer prevents "I clicked publish at 3:00:00 for a 3:00:01 slot"
  // edge cases where the user perceives the slot as past by the time
  // it's saved.
  const startsAtMs = new Date(input.startsAt).getTime();
  const FIVE_MIN_MS = 5 * 60 * 1000;
  if (startsAtMs <= Date.now() + FIVE_MIN_MS) {
    return t.sessions.formErrorPast;
  }

  // Far-future cap — 6 months. Beyond that, the slot is more likely
  // to be a typo than intentional, and group composition (who's a Pro
  // user, who's around) shifts so much that pre-publishing months
  // ahead just creates stale slots that need cleanup.
  const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
  if (startsAtMs > Date.now() + SIX_MONTHS_MS) {
    return t.sessions.formErrorPast; // closest existing copy
  }

  // Group capacity — at least 2. A "group" of 1 is a 1:1, so refuse
  // it to prevent the admin from accidentally creating a dead slot.
  if (input.type === "group" && input.maxAttendees < 2) {
    return t.sessions.formErrorCapacity;
  }

  return null;
}

/**
 * Generate a stable, URL-safe room name. Used as the unique part of
 * the Daily room URL. Format: `brightroots-{12 hex chars}`. We don't
 * use the slot's UUID directly because Daily room names with long
 * hyphenated UUIDs read badly in URLs — short hex is cleaner.
 */
function generateRoomName(): string {
  const hex = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `brightroots-${hex}`;
}

export default function AdminSessionsNewPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SessionType>("one_on_one");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [maxAttendees, setMaxAttendees] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When the admin flips type, default the capacity sensibly. They can
  // still override (e.g. a 1:1 with a silent observer), but defaults
  // matter — this is the difference between "0 clicks to publish" and
  // "fix the capacity field every time."
  const handleTypeChange = (next: SessionType) => {
    setType(next);
    if (next === "one_on_one") setMaxAttendees(1);
    else if (maxAttendees < 4) setMaxAttendees(8); // sensible group default
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const input: SlotInput = {
      title,
      description,
      type,
      startsAt,
      durationMinutes,
      maxAttendees,
    };

    const validationError = validateSlot(input, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    const { error: dbError } = await supabase.from("session_slots").insert({
      host_id: user.id,
      type: input.type,
      title: input.title.trim(),
      description: input.description.trim() || null,
      starts_at: new Date(input.startsAt).toISOString(),
      duration_minutes: input.durationMinutes,
      max_attendees: input.maxAttendees,
      room_name: generateRoomName(),
    });

    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }

    router.push("/admin/sessions");
  };

  // Compute the minimum value for the datetime-local input (now,
  // formatted as YYYY-MM-DDTHH:MM). Browser blocks anything earlier.
  const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="px-4 py-8 lg:px-8 lg:py-12 max-w-2xl mx-auto space-y-8">
      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/sessions" />}
          className="gap-1.5 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.sessions.adminTitle}
        </Button>
        <header className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            / Sessions / New
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
            {t.sessions.newSlot}
          </h1>
        </header>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type — radio-like with two big buttons. Visual cue makes
                 the choice unambiguous; admin doesn't have to read a
                 tiny dropdown label. */}
            <div className="space-y-2">
              <Label>{t.sessions.formTypeLabel}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange("one_on_one")}
                  className={`flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                    type === "one_on_one"
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {t.sessions.typeOneOnOne}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("group")}
                  className={`flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                    type === "group"
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {t.sessions.typeGroup}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t.sessions.formTitleLabel}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.sessions.formTitlePlaceholder}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {t.sessions.formDescriptionLabel}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.sessions.formDescriptionPlaceholder}
                rows={3}
              />
            </div>

            {/* Date/time + duration in a row — they're conceptually
                 paired (when + how long). */}
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

            {/* Capacity — only relevant for group sessions. We DON'T
                 hide it for 1:1 because "where did the field go" is a
                 worse experience than "this field is disabled." */}
            <div className="space-y-2">
              <Label htmlFor="capacity">{t.sessions.formCapacityLabel}</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={50}
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(Number(e.target.value))}
                disabled={type === "one_on_one"}
              />
              {type === "one_on_one" && (
                <p className="text-xs text-muted-foreground">
                  {t.sessions.formCapacityHint}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                render={<Link href="/admin/sessions" />}
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
                  t.sessions.formSave
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
