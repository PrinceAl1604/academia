"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { licenceKeys } from "@/data/admin-mock";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Check } from "lucide-react";

export default function AdminLicencesPage() {
  const { t } = useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-yellow-100 text-yellow-700",
    expired: "bg-red-100 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    active: t.admin.active,
    inactive: t.admin.inactive,
    expired: t.admin.expired,
  };

  const typeLabels: Record<string, string> = {
    student: t.admin.student,
    admin: t.admin.admin,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {t.admin.allLicences}
          </h1>
          <p className="mt-1 text-neutral-500">
            {licenceKeys.length} {t.admin.licences}
          </p>
        </div>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t.admin.generateNewKey}
        </Button>
      </div>

      {/* Licence List */}
      <div className="space-y-3">
        {licenceKeys.map((licence) => (
          <Card key={licence.id}>
            <CardContent className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-sm font-mono font-medium text-neutral-900">
                    {licence.key}
                  </code>
                  <Badge
                    variant="secondary"
                    className={
                      licence.type === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }
                  >
                    {typeLabels[licence.type]}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={statusColors[licence.status]}
                  >
                    {statusLabels[licence.status]}
                  </Badge>
                </div>
                <div className="mt-1.5 flex items-center gap-4 text-sm text-neutral-500">
                  <span>
                    {t.admin.assignedTo}:{" "}
                    {licence.assignedTo || t.admin.unassigned}
                  </span>
                  <span>
                    {t.admin.createdAt}: {licence.createdAt}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => handleCopy(licence.key, licence.id)}
              >
                {copiedId === licence.id ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {t.admin.copyKey}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
