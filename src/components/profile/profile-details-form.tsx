"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Visibility = "public" | "members" | "private";

/**
 * Community profile editor (Phase 2, UC-2.3). Mounted inside the Settings
 * "Profile" tab. Edits the directory-facing fields (headline, bio,
 * location, socials, visibility); name + avatar stay in the card above.
 */
export function ProfileDetailsForm() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("members");

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("headline,bio,location,socials,profile_visibility")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setHeadline(data.headline ?? "");
        setLocation(data.location ?? "");
        setBio(data.bio ?? "");
        const s = (data.socials ?? {}) as Record<string, string>;
        setWebsite(s.website ?? "");
        setTwitter(s.twitter ?? "");
        setLinkedin(s.linkedin ?? "");
        setInstagram(s.instagram ?? "");
        setVisibility((data.profile_visibility as Visibility) ?? "members");
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const socials: Record<string, string> = {};
    if (website.trim()) socials.website = website.trim();
    if (twitter.trim()) socials.twitter = twitter.trim();
    if (linkedin.trim()) socials.linkedin = linkedin.trim();
    if (instagram.trim()) socials.instagram = instagram.trim();

    const { error } = await supabase
      .from("users")
      .update({
        headline: headline.trim() || null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        socials,
        profile_visibility: visibility,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast.error(isEn ? "Could not save profile" : "Échec de l'enregistrement");
      return;
    }
    toast.success(isEn ? "Profile saved" : "Profil enregistré");
  };

  const visibilityLabel = (v: Visibility) =>
    v === "members"
      ? isEn
        ? "Members only"
        : "Membres uniquement"
      : v === "public"
        ? "Public"
        : isEn
          ? "Private (hidden)"
          : "Privé (masqué)";

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {isEn ? "Community profile" : "Profil communautaire"}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isEn
              ? "How you appear in the member directory."
              : "Votre apparence dans l'annuaire des membres."}
          </p>
        </div>
        {user && (
          <Link
            href={`/members/${user.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {isEn ? "View" : "Voir"}
          </Link>
        )}
      </div>
      <Separator className="my-4" />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{isEn ? "Headline" : "Titre"}</Label>
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={120}
            placeholder={
              isEn ? "e.g. Product designer & mentor" : "ex. Designer produit & mentor"
            }
          />
        </div>

        <div className="space-y-2">
          <Label>{isEn ? "Location" : "Localisation"}</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            placeholder={isEn ? "e.g. Douala, Cameroon" : "ex. Douala, Cameroun"}
          />
        </div>

        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder={
              isEn
                ? "Tell the community about yourself…"
                : "Présentez-vous à la communauté…"
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{isEn ? "Website" : "Site web"}</Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label>Twitter / X</Label>
            <Input
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="https://x.com/…"
            />
          </div>
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/…"
            />
          </div>
          <div className="space-y-2">
            <Label>Instagram</Label>
            <Input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{isEn ? "Directory visibility" : "Visibilité dans l'annuaire"}</Label>
          <Select
            value={visibility}
            onValueChange={(v) => v && setVisibility(v as Visibility)}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue>{visibilityLabel(visibility)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="members">{visibilityLabel("members")}</SelectItem>
              <SelectItem value="public">{visibilityLabel("public")}</SelectItem>
              <SelectItem value="private">{visibilityLabel("private")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground/70">
            {visibility === "private"
              ? isEn
                ? "You won't appear in the member directory."
                : "Vous n'apparaîtrez pas dans l'annuaire des membres."
              : isEn
                ? "Logged-in members can find you in the directory."
                : "Les membres connectés peuvent vous trouver dans l'annuaire."}
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEn ? "Save profile" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
