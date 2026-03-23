"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Loader2, Check, X, FolderOpen } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    setCategories(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: newName.trim(), slug: slugify(newName) })
      .select()
      .single();
    if (!error && data) {
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } else {
      alert("Failed to create category. Name might already exist.");
    }
    setAdding(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase
      .from("categories")
      .update({ name: editName.trim(), slug: slugify(editName) })
      .eq("id", id);
    if (!error) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: editName.trim(), slug: slugify(editName) } : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Courses in this category will lose their category.`)) return;
    setDeleting(id);
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert("Failed to delete. Category may have courses linked to it.");
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Categories</h1>
        <p className="mt-1 text-neutral-500">
          {categories.length} categories · Organize your courses
        </p>
      </div>

      {/* Add new category */}
      <Card>
        <CardContent className="flex items-center gap-3 py-3">
          <FolderOpen className="h-4 w-4 text-neutral-400 shrink-0" />
          <Input
            placeholder="New category name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="gap-1.5">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </CardContent>
      </Card>

      {/* Category list */}
      <Card>
        <CardContent className="divide-y p-0">
          {categories.length === 0 ? (
            <p className="p-6 text-center text-neutral-500">No categories yet</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(cat.id)}
                      className="flex-1 h-9"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleUpdate(cat.id)}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 text-neutral-400" />
                    </Button>
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-4 w-4 text-neutral-300 shrink-0" />
                    <span className="flex-1 text-sm font-medium text-neutral-900">{cat.name}</span>
                    <span className="text-xs text-neutral-400 font-mono">{cat.slug}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-neutral-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={deleting === cat.id}
                      onClick={() => handleDelete(cat.id, cat.name)}
                    >
                      {deleting === cat.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
