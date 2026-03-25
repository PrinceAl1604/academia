"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Users,
  Crown,
  UserCheck,
  Clock,
  BookOpen,
  CheckCircle,
  X,
  Loader2,
  Mail,
  Calendar,
  Shield,
  ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";

interface Student {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  subscription_tier: string;
  created_at: string;
  last_active_at: string | null;
  pro_expires_at: string | null;
  enrollment_count?: number;
}

interface Enrollment {
  id: string;
  course: {
    id: string;
    title: string;
    category: { name: string } | null;
  };
  enrolled_at: string;
  completed_at: string | null;
}

export default function AdminStudentsPage() {
  const { t } = useLanguage();
  const isEn = t.nav.signIn === "Sign In";

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | "free" | "pro">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load students
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("users")
        .select("*")
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      if (data) {
        // Get enrollment counts
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("user_id");

        const countMap: Record<string, number> = {};
        (enrollments ?? []).forEach((e: { user_id: string }) => {
          countMap[e.user_id] = (countMap[e.user_id] || 0) + 1;
        });

        setStudents(
          data.map((s) => ({
            ...s,
            enrollment_count: countMap[s.id] || 0,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  // Filter + search + sort
  const filtered = useMemo(() => {
    let result = students;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }

    // Filter by plan
    if (filterPlan !== "all") {
      result = result.filter((s) => s.subscription_tier === filterPlan);
    }

    // Sort
    if (sortBy === "newest") {
      result = [...result].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === "oldest") {
      result = [...result].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else if (sortBy === "name") {
      result = [...result].sort((a, b) =>
        (a.name || a.email).localeCompare(b.name || b.email)
      );
    }

    return result;
  }, [students, search, filterPlan, sortBy]);

  // Stats
  const totalStudents = students.length;
  const proStudents = students.filter((s) => s.subscription_tier === "pro").length;
  const activeToday = students.filter(
    (s) =>
      s.last_active_at &&
      new Date(s.last_active_at).toDateString() === new Date().toDateString()
  ).length;
  const newThisWeek = students.filter((s) => {
    const d = new Date(s.created_at);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  // Open student detail
  const openDetail = async (student: Student) => {
    setSelectedStudent(student);
    setLoadingDetail(true);

    const { data } = await supabase
      .from("enrollments")
      .select("id, enrolled_at, completed_at, course:courses(id, title, category:categories(name))")
      .eq("user_id", student.id)
      .order("enrolled_at", { ascending: false });

    setStudentEnrollments((data as unknown as Enrollment[]) ?? []);
    setLoadingDetail(false);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(isEn ? "en-US" : "fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {isEn ? "Students" : "Étudiants"}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {isEn
            ? "Manage your students and view their progress"
            : "Gérez vos étudiants et consultez leur progression"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {totalStudents}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isEn ? "Total Students" : "Total étudiants"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {proStudents}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isEn ? "Pro Members" : "Membres Pro"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {activeToday}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isEn ? "Active Today" : "Actifs aujourd'hui"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {newThisWeek}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isEn ? "New This Week" : "Nouveaux cette semaine"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder={isEn ? "Search students..." : "Rechercher un étudiant..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 dark:bg-neutral-900 dark:border-neutral-700"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "free", "pro"] as const).map((plan) => (
            <Button
              key={plan}
              variant={filterPlan === plan ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPlan(plan)}
              className="text-xs"
            >
              {plan === "all"
                ? isEn ? "All" : "Tous"
                : plan === "free"
                ? "Free"
                : "Pro"}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() =>
            setSortBy((prev) =>
              prev === "newest" ? "oldest" : prev === "oldest" ? "name" : "newest"
            )
          }
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortBy === "newest"
            ? isEn ? "Newest" : "Récents"
            : sortBy === "oldest"
            ? isEn ? "Oldest" : "Anciens"
            : isEn ? "Name" : "Nom"}
        </Button>
      </div>

      {/* Student List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Users className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">
            {search
              ? isEn ? "No students match your search" : "Aucun étudiant trouvé"
              : isEn ? "No students yet" : "Aucun étudiant pour le moment"}
          </p>
        </div>
      ) : (
        <Card className="dark:bg-neutral-900 dark:border-neutral-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-neutral-800">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {isEn ? "Student" : "Étudiant"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {isEn ? "Plan" : "Plan"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 hidden sm:table-cell">
                    {isEn ? "Courses" : "Cours"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 hidden md:table-cell">
                    {isEn ? "Joined" : "Inscription"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 hidden lg:table-cell">
                    {isEn ? "Last Active" : "Dernière activité"}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {isEn ? "Action" : "Action"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-800">
                {filtered.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-xs font-medium dark:text-neutral-300">
                            {getInitials(student.name, student.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            {student.name || student.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {student.subscription_tier === "pro" ? (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Crown className="mr-1 h-3 w-3" />
                          Pro
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-neutral-500 dark:text-neutral-400 dark:border-neutral-700">
                          Free
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {student.enrollment_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {formatDate(student.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {student.last_active_at
                          ? formatDate(student.last_active_at)
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => openDetail(student)}
                      >
                        {isEn ? "View" : "Voir"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t dark:border-neutral-800 px-4 py-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {filtered.length} {isEn ? "students" : "étudiants"}
              {search && ` (${isEn ? "filtered" : "filtrés"})`}
            </p>
          </div>
        </Card>
      )}

      {/* Student Detail Modal */}
      <Dialog
        open={!!selectedStudent}
        onOpenChange={(open) => !open && setSelectedStudent(null)}
      >
        <DialogContent className="sm:max-w-lg dark:bg-neutral-900 dark:border-neutral-800">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-sm font-medium dark:text-neutral-300">
                      {getInitials(selectedStudent.name, selectedStudent.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {selectedStudent.name || selectedStudent.email.split("@")[0]}
                    </p>
                    <p className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
                      {selectedStudent.email}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Info Grid */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg border dark:border-neutral-800 p-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <Shield className="h-3 w-3" />
                    {isEn ? "Plan" : "Plan"}
                  </div>
                  <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">
                    {selectedStudent.subscription_tier === "pro" ? (
                      <span className="flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-amber-500" /> Pro
                      </span>
                    ) : (
                      "Free"
                    )}
                  </p>
                  {selectedStudent.pro_expires_at && (
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {isEn ? "Expires" : "Expire"}{" "}
                      {formatDate(selectedStudent.pro_expires_at)}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border dark:border-neutral-800 p-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <Calendar className="h-3 w-3" />
                    {isEn ? "Joined" : "Inscription"}
                  </div>
                  <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">
                    {formatDate(selectedStudent.created_at)}
                  </p>
                </div>

                <div className="rounded-lg border dark:border-neutral-800 p-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <BookOpen className="h-3 w-3" />
                    {isEn ? "Enrolled Courses" : "Cours inscrits"}
                  </div>
                  <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">
                    {selectedStudent.enrollment_count || 0}
                  </p>
                </div>

                <div className="rounded-lg border dark:border-neutral-800 p-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <Clock className="h-3 w-3" />
                    {isEn ? "Last Active" : "Dernière activité"}
                  </div>
                  <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">
                    {selectedStudent.last_active_at
                      ? formatDate(selectedStudent.last_active_at)
                      : isEn ? "Never" : "Jamais"}
                  </p>
                </div>
              </div>

              {/* Enrolled Courses */}
              <Separator className="my-4 dark:bg-neutral-800" />
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
                  {isEn ? "Enrolled Courses" : "Cours inscrits"}
                </h3>

                {loadingDetail ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                  </div>
                ) : studentEnrollments.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
                    {isEn
                      ? "No courses enrolled yet"
                      : "Aucun cours inscrit"}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {studentEnrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex items-center gap-3 rounded-lg border dark:border-neutral-800 p-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800">
                          {enrollment.completed_at ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-neutral-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            {enrollment.course?.title || "Unknown Course"}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {enrollment.course?.category?.name || ""} ·{" "}
                            {isEn ? "Enrolled" : "Inscrit"}{" "}
                            {formatDate(enrollment.enrolled_at)}
                          </p>
                        </div>
                        {enrollment.completed_at && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                            {isEn ? "Completed" : "Terminé"}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <Separator className="my-4 dark:bg-neutral-800" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs dark:border-neutral-700 dark:text-neutral-300"
                  onClick={() => {
                    window.location.href = `mailto:${selectedStudent.email}`;
                  }}
                >
                  <Mail className="h-3 w-3" />
                  {isEn ? "Send Email" : "Envoyer un email"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
