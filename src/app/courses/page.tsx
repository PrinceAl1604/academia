import { redirect } from "next/navigation";

// Redirect /courses to homepage — courses are on the main dashboard
export default function CoursesPage() {
  redirect("/");
}
