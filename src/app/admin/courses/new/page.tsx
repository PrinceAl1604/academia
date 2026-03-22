"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { categories } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function AdminCourseFormPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {t.admin.createCourse}
        </h1>
      </div>

      <Card>
        <CardContent className="space-y-6">
          {/* Course Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t.admin.courseTitle}</Label>
            <Input id="title" placeholder={t.admin.courseTitle} />
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <Label htmlFor="shortDesc">{t.admin.shortDescription}</Label>
            <Textarea
              id="shortDesc"
              placeholder={t.admin.shortDescription}
              rows={2}
            />
          </div>

          {/* Full Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t.admin.courseDescription}</Label>
            <Textarea
              id="description"
              placeholder={t.admin.courseDescription}
              rows={5}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t.admin.category}</Label>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t.admin.selectCategory} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Level */}
          <div className="space-y-2">
            <Label>{t.admin.selectLevel}</Label>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t.admin.selectLevel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">{t.admin.tags}</Label>
            <Input id="tags" placeholder={t.admin.tagsPlaceholder} />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button size="lg">{t.admin.saveCourse}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
