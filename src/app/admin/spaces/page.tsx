"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronUp,
  ChevronDown,
  Star,
  ExternalLink,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Space,
  type SpaceType,
  type SpaceAccess,
  type PageConfig,
  COMMUNITY_COLUMNS,
  SPACE_COLUMNS,
} from "@/lib/community/types";

type GroupRow = {
  id: string;
  community_id: string;
  name: string;
  emoji: string | null;
  sort_order: number;
};

type CommunityRow = {
  id: string;
  name: string;
  welcome_space_id: string | null;
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const TYPES: SpaceType[] = ["page", "course", "event", "link"];
const ACCESS: SpaceAccess[] = ["public", "members", "pro"];

export default function AdminSpacesPage() {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  const [community, setCommunity] = useState<CommunityRow | null>(null);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  const [newGroup, setNewGroup] = useState("");
  const [editor, setEditor] = useState<{ space: Space | null; groupId: string } | null>(null);

  const load = useCallback(async () => {
    const { data: comm } = await supabase
      .from("communities")
      .select(COMMUNITY_COLUMNS)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!comm) {
      setLoading(false);
      return;
    }
    const c = comm as CommunityRow;
    const [{ data: g }, { data: s }] = await Promise.all([
      supabase.from("space_groups").select("id,community_id,name,emoji,sort_order").eq("community_id", c.id).order("sort_order"),
      supabase.from("spaces").select(SPACE_COLUMNS).eq("community_id", c.id).order("sort_order"),
    ]);
    setCommunity(c);
    setGroups((g ?? []) as GroupRow[]);
    setSpaces((s ?? []) as Space[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Groups ────────────────────────────────────────────────────
  const addGroup = async () => {
    if (!newGroup.trim() || !community) return;
    const sort = groups.length;
    const { data, error } = await supabase
      .from("space_groups")
      .insert({ community_id: community.id, name: newGroup.trim(), sort_order: sort })
      .select("id,community_id,name,emoji,sort_order")
      .single();
    if (error || !data) return toast.error(isEn ? "Could not add group" : "Échec de l'ajout du groupe");
    setGroups((p) => [...p, data as GroupRow]);
    setNewGroup("");
  };

  const renameGroup = async (id: string, name: string, emoji: string | null) => {
    const { error } = await supabase.from("space_groups").update({ name, emoji }).eq("id", id);
    if (error) return toast.error(isEn ? "Save failed" : "Échec");
    setGroups((p) => p.map((g) => (g.id === id ? { ...g, name, emoji } : g)));
  };

  const deleteGroup = async (g: GroupRow) => {
    if (!confirm(isEn ? `Delete group "${g.name}"? Its spaces become ungrouped.` : `Supprimer le groupe « ${g.name} » ? Ses espaces seront dégroupés.`)) return;
    const { error } = await supabase.from("space_groups").delete().eq("id", g.id);
    if (error) return toast.error(isEn ? "Delete failed" : "Échec");
    setGroups((p) => p.filter((x) => x.id !== g.id));
    setSpaces((p) => p.map((s) => (s.group_id === g.id ? { ...s, group_id: null } : s)));
  };

  const moveGroup = async (id: string, dir: -1 | 1) => {
    const ordered = [...groups].sort((a, b) => a.sort_order - b.sort_order);
    const i = ordered.findIndex((g) => g.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    // Reindex contiguously so equal/seeded sort_order values can't get stuck.
    await Promise.all(
      ordered.map((g, idx) => supabase.from("space_groups").update({ sort_order: idx }).eq("id", g.id))
    );
    const orderMap = new Map(ordered.map((g, idx) => [g.id, idx]));
    setGroups((p) => p.map((g) => ({ ...g, sort_order: orderMap.get(g.id) ?? g.sort_order })));
  };

  // ── Spaces ────────────────────────────────────────────────────
  const deleteSpace = async (s: Space) => {
    if (!confirm(isEn ? `Delete space "${s.name}"?` : `Supprimer l'espace « ${s.name} » ?`)) return;
    const { error } = await supabase.from("spaces").delete().eq("id", s.id);
    if (error) return toast.error(isEn ? "Delete failed" : "Échec");
    setSpaces((p) => p.filter((x) => x.id !== s.id));
  };

  const moveSpace = async (s: Space, dir: -1 | 1) => {
    const siblings = spaces.filter((x) => x.group_id === s.group_id).sort((a, b) => a.sort_order - b.sort_order);
    const i = siblings.findIndex((x) => x.id === s.id);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
    await Promise.all(
      siblings.map((x, idx) => supabase.from("spaces").update({ sort_order: idx }).eq("id", x.id))
    );
    const orderMap = new Map(siblings.map((x, idx) => [x.id, idx]));
    setSpaces((p) => p.map((x) => (orderMap.has(x.id) ? { ...x, sort_order: orderMap.get(x.id)! } : x)));
  };

  const setWelcome = async (s: Space) => {
    if (!community) return;
    const { error } = await supabase.from("communities").update({ welcome_space_id: s.id }).eq("id", community.id);
    if (error) return toast.error(isEn ? "Failed" : "Échec");
    setCommunity({ ...community, welcome_space_id: s.id });
    toast.success(isEn ? "Welcome page set" : "Page d'accueil définie");
  };

  const onSaved = (saved: Space) => {
    setSpaces((p) => {
      const exists = p.some((x) => x.id === saved.id);
      return exists ? p.map((x) => (x.id === saved.id ? saved : x)) : [...p, saved];
    });
    setEditor(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  const orderedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);
  const ungrouped = spaces.filter((s) => !s.group_id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{isEn ? "Spaces" : "Espaces"}</h1>
        <p className="mt-1 text-muted-foreground">
          {isEn
            ? "Organize the community sidebar — groups, spaces, and the Welcome page."
            : "Organise la barre latérale — groupes, espaces et la page d'accueil."}
        </p>
      </div>

      {/* Add group */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
          <Input
            placeholder={isEn ? "New group name…" : "Nom du nouveau groupe…"}
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGroup()}
            className="flex-1"
          />
          <Button onClick={addGroup} disabled={!newGroup.trim()} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {isEn ? "Add group" : "Ajouter un groupe"}
          </Button>
        </CardContent>
      </Card>

      {orderedGroups.map((group, gi) => (
        <GroupBlock
          key={group.id}
          group={group}
          first={gi === 0}
          last={gi === orderedGroups.length - 1}
          spaces={spaces.filter((s) => s.group_id === group.id).sort((a, b) => a.sort_order - b.sort_order)}
          welcomeId={community?.welcome_space_id ?? null}
          isEn={isEn}
          onRename={renameGroup}
          onDelete={deleteGroup}
          onMove={moveGroup}
          onAddSpace={() => setEditor({ space: null, groupId: group.id })}
          onEditSpace={(s) => setEditor({ space: s, groupId: group.id })}
          onDeleteSpace={deleteSpace}
          onMoveSpace={moveSpace}
          onSetWelcome={setWelcome}
        />
      ))}

      {ungrouped.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {isEn ? "Ungrouped" : "Sans groupe"}
            </div>
            <div className="divide-y">
              {ungrouped.sort((a, b) => a.sort_order - b.sort_order).map((s) => (
                <SpaceRow
                  key={s.id}
                  space={s}
                  isWelcome={community?.welcome_space_id === s.id}
                  isEn={isEn}
                  onEdit={() => setEditor({ space: s, groupId: "" })}
                  onDelete={() => deleteSpace(s)}
                  onMove={() => {}}
                  onSetWelcome={() => setWelcome(s)}
                  first
                  last
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {editor && community && (
        <SpaceEditor
          communityId={community.id}
          groups={orderedGroups}
          initial={editor.space}
          defaultGroupId={editor.groupId}
          nextSortOrder={(gid) => spaces.filter((s) => s.group_id === (gid ?? null)).length}
          isEn={isEn}
          onClose={() => setEditor(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

/* ── Group block ─────────────────────────────────────────────── */
function GroupBlock({
  group, first, last, spaces, welcomeId, isEn,
  onRename, onDelete, onMove, onAddSpace, onEditSpace, onDeleteSpace, onMoveSpace, onSetWelcome,
}: {
  group: GroupRow; first: boolean; last: boolean; spaces: Space[]; welcomeId: string | null; isEn: boolean;
  onRename: (id: string, name: string, emoji: string | null) => void;
  onDelete: (g: GroupRow) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onAddSpace: () => void;
  onEditSpace: (s: Space) => void;
  onDeleteSpace: (s: Space) => void;
  onMoveSpace: (s: Space, dir: -1 | 1) => void;
  onSetWelcome: (s: Space) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [emoji, setEmoji] = useState(group.emoji ?? "");

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          {editing ? (
            <>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="h-9 w-14 text-center" placeholder="🙂" />
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 flex-1" autoFocus />
              <Button size="sm" onClick={() => { onRename(group.id, name.trim() || group.name, emoji.trim() || null); setEditing(false); }}>
                {isEn ? "Save" : "OK"}
              </Button>
            </>
          ) : (
            <>
              <span className="text-base">{group.emoji}</span>
              <span className="flex-1 text-sm font-semibold uppercase tracking-wide text-foreground">{group.name}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={first} onClick={() => onMove(group.id, -1)}><ChevronUp className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={last} onClick={() => onMove(group.id, 1)}><ChevronDown className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(group)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
            </>
          )}
        </div>

        <div className="divide-y">
          {spaces.map((s, i) => (
            <SpaceRow
              key={s.id}
              space={s}
              isWelcome={welcomeId === s.id}
              isEn={isEn}
              first={i === 0}
              last={i === spaces.length - 1}
              onEdit={() => onEditSpace(s)}
              onDelete={() => onDeleteSpace(s)}
              onMove={(dir) => onMoveSpace(s, dir)}
              onSetWelcome={() => onSetWelcome(s)}
            />
          ))}
        </div>

        <div className="px-4 py-2">
          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={onAddSpace}>
            <Plus className="h-3.5 w-3.5" />
            {isEn ? "Add space" : "Ajouter un espace"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Space row ───────────────────────────────────────────────── */
function SpaceRow({
  space, isWelcome, isEn, first, last, onEdit, onDelete, onMove, onSetWelcome,
}: {
  space: Space; isWelcome: boolean; isEn: boolean; first: boolean; last: boolean;
  onEdit: () => void; onDelete: () => void; onMove: (dir: -1 | 1) => void; onSetWelcome: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <span className="w-5 text-center">{space.emoji || <Hash className="inline h-3.5 w-3.5 text-muted-foreground/60" />}</span>
      <span className="flex-1 truncate text-sm font-medium text-foreground">
        {space.name}
        {space.type === "link" && <ExternalLink className="ml-1 inline h-3 w-3 text-muted-foreground/60" />}
      </span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{space.type}</span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{space.access}</span>
      {space.type === "page" && (
        <Button size="icon" variant="ghost" className="h-7 w-7" title={isEn ? "Set as Welcome page" : "Définir comme page d'accueil"} onClick={onSetWelcome}>
          <Star className={`h-3.5 w-3.5 ${isWelcome ? "fill-amber-400 text-amber-400" : "text-muted-foreground/60"}`} />
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={first} onClick={() => onMove(-1)}><ChevronUp className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={last} onClick={() => onMove(1)}><ChevronDown className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
    </div>
  );
}

/* ── Space editor dialog ─────────────────────────────────────── */
function SpaceEditor({
  communityId, groups, initial, defaultGroupId, nextSortOrder, isEn, onClose, onSaved,
}: {
  communityId: string;
  groups: GroupRow[];
  initial: Space | null;
  defaultGroupId: string;
  nextSortOrder: (groupId: string | null) => number;
  isEn: boolean;
  onClose: () => void;
  onSaved: (s: Space) => void;
}) {
  const cfg = (initial?.config ?? {}) as PageConfig & { url?: string; open_in_new?: boolean };
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [type, setType] = useState<SpaceType>(initial?.type ?? "page");
  const [access, setAccess] = useState<SpaceAccess>(initial?.access ?? "members");
  const [groupId, setGroupId] = useState<string>(initial?.group_id ?? defaultGroupId ?? "");
  // type-specific
  const [url, setUrl] = useState(cfg.url ?? "");
  const [openInNew, setOpenInNew] = useState(cfg.open_in_new ?? true);
  const [coverUrl, setCoverUrl] = useState(cfg.cover_url ?? "");
  const [videoUrl, setVideoUrl] = useState(cfg.video_url ?? "");
  const [contentMd, setContentMd] = useState(cfg.content_md ?? "");
  const [saving, setSaving] = useState(false);

  const buildConfig = (): Record<string, unknown> => {
    if (type === "link") return { url: url.trim(), open_in_new: openInNew };
    if (type === "page") return { cover_url: coverUrl.trim() || null, video_url: videoUrl.trim() || null, content_md: contentMd };
    return {};
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const config = buildConfig();
    if (initial) {
      const { data, error } = await supabase
        .from("spaces")
        .update({ name: name.trim(), emoji: emoji.trim() || null, type, access, group_id: groupId || null, config })
        .eq("id", initial.id)
        .select(SPACE_COLUMNS)
        .single();
      setSaving(false);
      if (error || !data) return toast.error(isEn ? "Save failed" : "Échec de l'enregistrement");
      onSaved(data as Space);
    } else {
      const { data, error } = await supabase
        .from("spaces")
        .insert({ community_id: communityId, group_id: groupId || null, name: name.trim(), slug: slugify(name), emoji: emoji.trim() || null, type, access, sort_order: nextSortOrder(groupId || null), config })
        .select(SPACE_COLUMNS)
        .single();
      setSaving(false);
      if (error || !data) return toast.error(isEn ? "Create failed (slug may already exist)" : "Échec (le slug existe peut-être déjà)");
      onSaved(data as Space);
    }
  };

  const selectCls = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? (isEn ? "Edit space" : "Modifier l'espace") : (isEn ? "New space" : "Nouvel espace")}</DialogTitle>
          <DialogDescription>
            {isEn ? "Configure how this space appears and what it shows." : "Configure l'apparence et le contenu de cet espace."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-16">
              <label className="text-xs text-muted-foreground">{isEn ? "Emoji" : "Emoji"}</label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🚀" className="text-center" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">{isEn ? "Name" : "Nom"}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-muted-foreground">Type</label>
              <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as SpaceType)}>
                {TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">{isEn ? "Access" : "Accès"}</label>
              <select className={selectCls} value={access} onChange={(e) => setAccess(e.target.value as SpaceAccess)}>
                {ACCESS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">{isEn ? "Group" : "Groupe"}</label>
              <select className={selectCls} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">{isEn ? "(none)" : "(aucun)"}</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          {type === "link" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">URL</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://chat.whatsapp.com/…" />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={openInNew} onChange={(e) => setOpenInNew(e.target.checked)} />
                {isEn ? "Open in a new tab" : "Ouvrir dans un nouvel onglet"}
              </label>
            </div>
          )}

          {type === "page" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">{isEn ? "Cover image URL" : "URL de l'image de couverture"}</label>
                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{isEn ? "Video URL (YouTube / Vimeo)" : "URL de la vidéo (YouTube / Vimeo)"}</label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtu.be/…" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{isEn ? "Content" : "Contenu"}</label>
                <Textarea value={contentMd} onChange={(e) => setContentMd(e.target.value)} rows={6} placeholder={isEn ? "Welcome text… (**bold** supported)" : "Texte de bienvenue… (**gras** pris en charge)"} />
              </div>
            </div>
          )}

          {(type === "course" || type === "event") && (
            <p className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              {type === "course"
                ? (isEn ? "Course spaces show the catalog. Per-category scoping comes later." : "Les espaces cours affichent le catalogue. Le filtrage par catégorie viendra plus tard.")
                : (isEn ? "Event spaces list live sessions." : "Les espaces événements listent les sessions.")}
            </p>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{isEn ? "Cancel" : "Annuler"}</Button>
          <Button onClick={save} disabled={saving || !name.trim()} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEn ? "Save" : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
