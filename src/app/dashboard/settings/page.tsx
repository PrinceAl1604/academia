"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/language-context";

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t.settings.title}</h1>
        <p className="mt-1 text-neutral-500">
          {t.settings.subtitle}
        </p>
      </div>

      {/* Notifications */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          {t.settings.notifications}
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          {t.settings.notificationsDesc}
        </p>
        <Separator className="my-4" />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t.settings.courseUpdates}</Label>
              <p className="text-sm text-neutral-500">
                {t.settings.courseUpdatesDesc}
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t.settings.newCourses}</Label>
              <p className="text-sm text-neutral-500">
                {t.settings.newCoursesDesc}
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t.settings.weeklyDigest}</Label>
              <p className="text-sm text-neutral-500">
                {t.settings.weeklyDigestDesc}
              </p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                {t.settings.marketingEmails}
              </Label>
              <p className="text-sm text-neutral-500">
                {t.settings.marketingEmailsDesc}
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900">{t.settings.preferences}</h3>
        <Separator className="my-4" />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t.settings.language}</Label>
              <p className="text-sm text-neutral-500">
                {t.settings.languageDesc}
              </p>
            </div>
            <Select defaultValue="en">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t.settings.videoQuality}</Label>
              <p className="text-sm text-neutral-500">
                {t.settings.videoQualityDesc}
              </p>
            </div>
            <Select defaultValue="auto">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="1080">1080p</SelectItem>
                <SelectItem value="720">720p</SelectItem>
                <SelectItem value="480">480p</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t.settings.autoplay}</Label>
              <p className="text-sm text-neutral-500">
                {t.settings.autoplayDesc}
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-600">{t.settings.dangerZone}</h3>
        <p className="mt-1 text-sm text-neutral-500">
          {t.settings.dangerDesc}
        </p>
        <Separator className="my-4" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {t.settings.deleteAccount}
            </p>
            <p className="text-sm text-neutral-500">
              {t.settings.deleteAccountDesc}
            </p>
          </div>
          <Button variant="destructive" size="sm">
            {t.settings.deleteAccount}
          </Button>
        </div>
      </Card>
    </div>
  );
}
