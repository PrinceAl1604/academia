/**
 * Community domain types (Circle-style spaces).
 *
 * Mirrors the Phase 0 tables: communities / space_groups / spaces.
 * Multi-tenant-ready — every row carries `community_id`, though exactly
 * one community is active for now.
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
  /** Per-type extras — e.g. link → { url, open_in_new }, page → { content_md } */
  config: Record<string, unknown>;
}

export interface SpaceGroup {
  id: string;
  community_id: string;
  name: string;
  emoji: string | null;
  sort_order: number;
  spaces: Space[];
}

/** Columns selected for a Space (kept in one place so server + client agree). */
export const SPACE_COLUMNS =
  "id,community_id,group_id,name,slug,emoji,type,access,sort_order,config";
export const COMMUNITY_COLUMNS =
  "id,name,slug,logo_url,brand_color,custom_css,whatsapp_url,welcome_space_id";
