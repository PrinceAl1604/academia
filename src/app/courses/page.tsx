"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CourseCard } from "@/components/shared/course-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { courses, categories } from "@/data/mock";
import { useLanguage } from "@/lib/i18n/language-context";

export default function CoursesPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || course.category === selectedCategory;
    const matchesLevel =
      selectedLevel === "all" || course.level === selectedLevel;
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const activeFilters =
    (selectedCategory !== "all" ? 1 : 0) + (selectedLevel !== "all" ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedLevel("all");
    setSearchQuery("");
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-neutral-900">
              {t.catalog.title}
            </h1>
            <p className="mt-2 text-neutral-500">
              {t.catalog.explore} {courses.length} {t.catalog.coursesAcross} {categories.length}{" "}
              {t.catalog.categories}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder={t.catalog.searchPlaceholder}
                className="h-10 pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={selectedCategory}
                onValueChange={(v) => setSelectedCategory(v ?? "all")}
              >
                <SelectTrigger className="h-10 w-[180px]">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.catalog.allCategories}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v ?? "all")}>
                <SelectTrigger className="h-10 w-[150px]">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.catalog.allLevels}</SelectItem>
                  <SelectItem value="Beginner">{t.common.beginner}</SelectItem>
                  <SelectItem value="Intermediate">{t.common.intermediate}</SelectItem>
                  <SelectItem value="Advanced">{t.common.advanced}</SelectItem>
                </SelectContent>
              </Select>
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-neutral-500"
                  onClick={clearFilters}
                >
                  <X className="h-3 w-3" />
                  {t.catalog.clear} ({activeFilters})
                </Button>
              )}
            </div>
          </div>

          {/* Category pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === "all" ? "default" : "secondary"}
              className="cursor-pointer px-3 py-1"
              onClick={() => setSelectedCategory("all")}
            >
              {t.catalog.all}
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "secondary"}
                className="cursor-pointer px-3 py-1"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {/* Results */}
          <div className="mt-8">
            <p className="mb-6 text-sm text-neutral-500">
              {t.catalog.showing} {filteredCourses.length} {filteredCourses.length !== 1 ? t.catalog.courses : t.catalog.course}
            </p>
            {filteredCourses.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-lg font-medium text-neutral-900">
                  {t.catalog.noCourses}
                </p>
                <p className="mt-1 text-neutral-500">
                  {t.catalog.noCoursesHint}
                </p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  {t.catalog.clearFilters}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
