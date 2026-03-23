"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Camera } from "lucide-react";
import { currentUser } from "@/data/mock";
import { useLanguage } from "@/lib/i18n/language-context";

export default function ProfilePage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t.profile.title}</h1>
        <p className="mt-1 text-neutral-500">
          {t.profile.subtitle}
        </p>
      </div>

      {/* Avatar */}
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-neutral-200 text-xl font-semibold">
                {currentUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-neutral-900 text-white hover:bg-neutral-700">
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">
              {currentUser.name}
            </h3>
            <p className="text-sm text-neutral-500">{currentUser.email}</p>
            <p className="mt-1 text-xs text-neutral-400">
              {t.profile.memberSince}{" "}
              {new Date(currentUser.joinedAt).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </Card>

      {/* Personal info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900">
          {t.profile.personalInfo}
        </h3>
        <Separator className="my-4" />

        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t.auth.fullName}</Label>
              <Input id="firstName" defaultValue="Alex" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t.profile.title}</Label>
              <Input id="lastName" defaultValue="Landrin" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input
              id="email"
              type="email"
              defaultValue={currentUser.email}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">{t.profile.bio}</Label>
            <Textarea
              id="bio"
              placeholder={t.profile.bioPlaceholder}
              className="min-h-[100px]"
            />
          </div>
          <div className="flex justify-end">
            <Button>{t.profile.saveChanges}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
