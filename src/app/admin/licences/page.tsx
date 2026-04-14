"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Copy,
  Check,
  Search,
  Loader2,
  KeyRound,
  User,
  Calendar,
  Clock,
  Shield,
  Plus,
  Download,
} from "lucide-react";
import { generateLicenceKey } from "@/lib/licence";

interface LicenceKey {
  id: string;
  key: string;
  type: string;
  status: string;
  assigned_to: string | null;
  assigned_email: string | null;
  activated_by: string | null;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function AdminLicencesPage() {
  const [keys, setKeys] = useState<LicenceKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<LicenceKey | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(5);
  const [showGenerate, setShowGenerate] = useState(false);
  const [newlyGenerated, setNewlyGenerated] = useState<string[]>([]);

  const loadKeys = useCallback(async () => {
    const { data } = await supabase
      .from("licence_keys")
      .select("*")
      .order("created_at", { ascending: false });
    setKeys(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const generated: string[] = [];

    for (let i = 0; i < generateCount; i++) {
      const key = generateLicenceKey();
      const { error } = await supabase.from("licence_keys").insert({
        key,
        type: "student",
        status: "created",
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (!error) generated.push(key);
    }

    setNewlyGenerated(generated);
    setGenerating(false);
    setShowGenerate(false);
    loadKeys();
  };

  const copyAllNewKeys = () => {
    navigator.clipboard.writeText(newlyGenerated.join("\n"));
    setCopiedId("all-new");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportKeysCSV = () => {
    const createdKeys = keys.filter((k) => k.status === "created");
    const csv = "Licence Key,Status,Created\n" +
      createdKeys.map((k) => `${k.key},${k.status},${new Date(k.created_at).toLocaleDateString()}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `licence-keys-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredKeys = keys.filter(
    (k) =>
      k.key.toLowerCase().includes(search.toLowerCase()) ||
      (k.assigned_to || "").toLowerCase().includes(search.toLowerCase()) ||
      (k.assigned_email || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "created": return "bg-amber-100 text-amber-700";
      case "active": return "bg-green-100 text-green-700";
      case "inactive": return "bg-neutral-100 text-neutral-500";
      case "used": return "bg-neutral-100 text-neutral-500";
      case "expired": return "bg-red-100 text-red-600";
      default: return "bg-neutral-100 text-neutral-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Licence Keys</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {keys.length} keys · {keys.filter((k) => k.status === "created").length} available · {keys.filter((k) => k.status === "active").length} activated
          </p>
        </div>
        <div className="flex items-center gap-2">
          {keys.filter((k) => k.status === "created").length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportKeysCSV}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => setShowGenerate(true)}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Generate Keys</span>
            <span className="sm:hidden">Generate</span>
          </Button>
        </div>
      </div>

      {/* Newly generated keys banner */}
      {newlyGenerated.length > 0 && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              {newlyGenerated.length} keys generated! Copy them and upload to Chariow.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-green-300 text-green-700 hover:bg-green-100"
                onClick={copyAllNewKeys}
              >
                {copiedId === "all-new" ? (
                  <><Check className="h-3.5 w-3.5" /> Copied!</>
                ) : (
                  <><Copy className="h-3.5 w-3.5" /> Copy All</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600"
                onClick={() => setNewlyGenerated([])}
              >
                Dismiss
              </Button>
            </div>
          </div>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {newlyGenerated.map((k) => (
              <code key={k} className="rounded bg-white dark:bg-neutral-800 px-2 py-1 text-xs font-mono text-neutral-700 dark:text-neutral-300">
                {k}
              </code>
            ))}
          </div>
        </Card>
      )}

      {/* Generate Keys Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Licence Keys</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-neutral-500">
              Generate keys and upload them to Chariow as your product deliverable. Each key can only be used once.
            </p>
            <div className="space-y-2">
              <Label>Number of keys</Label>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {[5, 10, 25, 50].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGenerateCount(n)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      generateCount === n
                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                        : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Plus className="h-4 w-4" /> Generate {generateCount} Keys</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="Search by key, name, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Keys table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[600px]">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 border-b px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
            <div className="col-span-4">Licence Key</div>
            <div className="col-span-3">Customer</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1"></div>
          </div>

          {/* Rows */}
          {filteredKeys.length === 0 ? (
            <p className="p-8 text-center text-neutral-500">
              {keys.length === 0 ? "No licence keys yet. Keys are generated when students purchase on Chariow." : "No results found"}
            </p>
          ) : (
            <div className="divide-y">
              {filteredKeys.map((lk) => (
                <div
                  key={lk.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-neutral-50 cursor-pointer"
                  onClick={() => setSelectedKey(lk)}
                >
                  <div className="col-span-4 flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
                    <code className="text-xs font-mono text-neutral-700 truncate">
                      {lk.key}
                    </code>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyKey(lk.id, lk.key); }}
                      className="shrink-0 text-neutral-300 hover:text-neutral-600"
                    >
                      {copiedId === lk.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-neutral-900 truncate">
                      {lk.assigned_to || "—"}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      {lk.assigned_email || ""}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Badge variant="secondary" className={statusColor(lk.status)}>
                      {lk.status}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-xs text-neutral-500">
                    {new Date(lk.created_at).toLocaleDateString()}
                  </div>
                  <div className="col-span-1 text-right text-xs text-neutral-400">
                    →
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedKey} onOpenChange={() => setSelectedKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Licence Key Details
            </DialogTitle>
          </DialogHeader>

          {selectedKey && (
            <div className="space-y-4 mt-2">
              {/* Key */}
              <div className="rounded-lg bg-neutral-50 p-4 text-center">
                <p className="text-xs text-neutral-500 mb-1">Key</p>
                <code className="text-lg font-mono font-bold text-neutral-900">
                  {selectedKey.key}
                </code>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => copyKey(selectedKey.id, selectedKey.key)}
                  >
                    {copiedId === selectedKey.id ? (
                      <><Check className="h-3.5 w-3.5 text-green-500" /> Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Details grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-neutral-400" />
                  <div className="flex-1">
                    <p className="text-xs text-neutral-500">Customer</p>
                    <p className="text-sm font-medium text-neutral-900">
                      {selectedKey.assigned_to || "Not assigned"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-neutral-400 text-sm">@</span>
                  <div className="flex-1">
                    <p className="text-xs text-neutral-500">Email</p>
                    <p className="text-sm text-neutral-900">
                      {selectedKey.assigned_email || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-neutral-400" />
                  <div className="flex-1">
                    <p className="text-xs text-neutral-500">Status</p>
                    <Badge variant="secondary" className={statusColor(selectedKey.status)}>
                      {selectedKey.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-neutral-400 text-sm">🏷</span>
                  <div className="flex-1">
                    <p className="text-xs text-neutral-500">Type</p>
                    <p className="text-sm text-neutral-900">{selectedKey.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-neutral-400" />
                  <div className="flex-1">
                    <p className="text-xs text-neutral-500">Created</p>
                    <p className="text-sm text-neutral-900">
                      {new Date(selectedKey.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedKey.activated_at && (
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <p className="text-xs text-neutral-500">Activated</p>
                      <p className="text-sm text-neutral-900">
                        {new Date(selectedKey.activated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {selectedKey.expires_at && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-neutral-400" />
                    <div className="flex-1">
                      <p className="text-xs text-neutral-500">Expires</p>
                      <p className="text-sm text-neutral-900">
                        {new Date(selectedKey.expires_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
