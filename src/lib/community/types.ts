/**
 * Community domain types (Circle-style spaces).
 *
 * Mirrors the Phase 0 tables (communities / space_groups / spaces) plus the
 * Phase 1 `space_nav` view — a metadata-only projection (no `config`) that
 * lists every space, including `pro` ones, so the sidebar can show locked
 * spaces while their content stays RLS-gated.
 */

export type SpaceType = "page" | "course" | "event" | "link";
export type SpaceAccess = "public" | "members" | "pro";

export interface Community {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  custom_css: string | null;
  whatsapp_url: string | null;
  welcome_space_id: string | null;
}

/** Full space row (includes `config`) — RLS-gated by access tier. */
export interface Space {
  id: string;
  community_id: string;
  group_id: string | null;
  name: string;
  slug: string;
  emoji: string | null;
  type: SpaceType;
  access: SpaceAccess;
  sort_order: number;
  config: Record<string, unknown>;
}

/** Metadata-only space (from `space_nav`) — safe to show to any member. */
export interface SpaceNav {
  id: string;
  community_id: string;
  group_id: string | null;
  name: string;
  slug: string;
  emoji: string | null;
  type: SpaceType;
  access: SpaceAccess;
  sort_order: number;
  link_url: string | null;
  link_open_in_new: boolean | null;
}

export interface SpaceGroup {
  id: string;
  community_id: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  spaces: SpaceNav[];
}

/** Per-type `config` shape for the page (Welcome) spaces. */
export interface PageConfig {
  cover_url?: string | null;
  video_url?: string | null;
  content_md?: string | null;
}

export const COMMUNITY_COLUMNS =
  "id,name,slug,logo_url,brand_color,custom_css,whatsapp_url,welcome_space_id";
export const SPACE_COLUMNS =
  "id,community_id,group_id,name,slug,emoji,type,access,sort_order,config";
export const SPACE_NAV_COLUMNS =
  "id,community_id,group_id,name,slug,emoji,type,access,sort_order,link_url,link_open_in_new";
