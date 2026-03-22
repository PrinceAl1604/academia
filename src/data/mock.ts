import { Course, Testimonial, User } from "@/types";

export const categories = [
  "UI/UX Design",
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Product Management",
  "Digital Marketing",
];

export const courses: Course[] = [
  {
    id: "1",
    title: "Complete UI/UX Design Masterclass",
    slug: "ui-ux-design-masterclass",
    description:
      "Learn the complete UI/UX design process from research to high-fidelity prototyping. This comprehensive course covers user research, wireframing, visual design, interaction design, and usability testing with real-world projects.",
    shortDescription:
      "Master the full UI/UX design process from research to prototyping.",
    instructor: {
      id: "i1",
      name: "Sarah Chen",
      avatar: "/avatars/instructor-1.jpg",
      title: "Senior Product Designer at Google",
      bio: "10+ years of experience in product design. Previously at Airbnb and Spotify.",
    },
    thumbnail: "/courses/ui-ux.jpg",
    category: "UI/UX Design",
    level: "Beginner",
    duration: "42 hours",
    lessonsCount: 86,
    studentsCount: 12450,
    rating: 4.9,
    reviewsCount: 2341,
    price: 0,
    isFeatured: true,
    isFree: true,
    tags: ["Figma", "Design Systems", "Prototyping", "User Research"],
    curriculum: [
      {
        id: "m1",
        title: "Introduction to UI/UX Design",
        lessons: [
          { id: "l1", title: "What is UI/UX Design?", duration: "12:30", type: "video", isFree: true },
          { id: "l2", title: "Design Thinking Process", duration: "18:45", type: "video", isFree: true },
          { id: "l3", title: "Setting Up Your Design Environment", duration: "15:00", type: "video" },
          { id: "l4", title: "Module Quiz", duration: "10:00", type: "quiz" },
        ],
      },
      {
        id: "m2",
        title: "User Research Fundamentals",
        lessons: [
          { id: "l5", title: "Understanding Your Users", duration: "20:15", type: "video" },
          { id: "l6", title: "Conducting User Interviews", duration: "25:00", type: "video" },
          { id: "l7", title: "Creating User Personas", duration: "18:30", type: "video" },
          { id: "l8", title: "User Journey Mapping", duration: "22:00", type: "video" },
        ],
      },
      {
        id: "m3",
        title: "Wireframing & Prototyping",
        lessons: [
          { id: "l9", title: "Low-Fidelity Wireframes", duration: "16:00", type: "video" },
          { id: "l10", title: "High-Fidelity Mockups in Figma", duration: "35:00", type: "video" },
          { id: "l11", title: "Interactive Prototyping", duration: "28:00", type: "video" },
          { id: "l12", title: "Design Handoff Best Practices", duration: "20:00", type: "article" },
        ],
      },
    ],
    updatedAt: "2026-03-15",
  },
  {
    id: "2",
    title: "Advanced React & Next.js Development",
    slug: "advanced-react-nextjs",
    description:
      "Take your React skills to the next level with advanced patterns, Next.js App Router, server components, and production-ready architecture.",
    shortDescription:
      "Advanced React patterns and Next.js for production apps.",
    instructor: {
      id: "i2",
      name: "Marcus Johnson",
      avatar: "/avatars/instructor-2.jpg",
      title: "Staff Engineer at Vercel",
      bio: "Core contributor to Next.js. 8 years building React applications at scale.",
    },
    thumbnail: "/courses/react-next.jpg",
    category: "Web Development",
    level: "Advanced",
    duration: "38 hours",
    lessonsCount: 72,
    studentsCount: 8930,
    rating: 4.8,
    reviewsCount: 1876,
    price: 0,
    isFeatured: true,
    tags: ["React", "Next.js", "TypeScript", "Server Components"],
    curriculum: [
      {
        id: "m4",
        title: "Advanced React Patterns",
        lessons: [
          { id: "l13", title: "Compound Components", duration: "22:00", type: "video", isFree: true },
          { id: "l14", title: "Render Props & HOCs", duration: "18:00", type: "video" },
          { id: "l15", title: "Custom Hooks Architecture", duration: "25:00", type: "video" },
        ],
      },
      {
        id: "m5",
        title: "Next.js App Router Deep Dive",
        lessons: [
          { id: "l16", title: "Server vs Client Components", duration: "30:00", type: "video" },
          { id: "l17", title: "Data Fetching Strategies", duration: "28:00", type: "video" },
          { id: "l18", title: "Streaming & Suspense", duration: "24:00", type: "video" },
        ],
      },
    ],
    updatedAt: "2026-03-10",
  },
  {
    id: "3",
    title: "iOS App Development with SwiftUI",
    slug: "ios-swiftui-development",
    description:
      "Build beautiful iOS applications using SwiftUI. From basics to App Store submission.",
    shortDescription: "Create stunning iOS apps with SwiftUI from scratch.",
    instructor: {
      id: "i3",
      name: "Emily Park",
      avatar: "/avatars/instructor-3.jpg",
      title: "iOS Lead at Apple",
      bio: "Former WWDC speaker. Built apps with 10M+ downloads.",
    },
    thumbnail: "/courses/ios-swift.jpg",
    category: "Mobile Development",
    level: "Intermediate",
    duration: "35 hours",
    lessonsCount: 64,
    studentsCount: 6720,
    rating: 4.7,
    reviewsCount: 1243,
    price: 0,
    isFeatured: false,
    tags: ["SwiftUI", "iOS", "Xcode", "App Store"],
    curriculum: [
      {
        id: "m6",
        title: "SwiftUI Fundamentals",
        lessons: [
          { id: "l19", title: "SwiftUI Views & Modifiers", duration: "20:00", type: "video", isFree: true },
          { id: "l20", title: "State Management", duration: "25:00", type: "video" },
          { id: "l21", title: "Navigation & Routing", duration: "22:00", type: "video" },
        ],
      },
    ],
    updatedAt: "2026-02-28",
  },
  {
    id: "4",
    title: "Data Science with Python & Machine Learning",
    slug: "data-science-python-ml",
    description:
      "Comprehensive data science program covering Python, pandas, scikit-learn, and deep learning fundamentals.",
    shortDescription:
      "From Python basics to machine learning models.",
    instructor: {
      id: "i4",
      name: "Dr. James Williams",
      avatar: "/avatars/instructor-4.jpg",
      title: "ML Research Scientist",
      bio: "PhD in Computer Science. Published 20+ papers in top ML conferences.",
    },
    thumbnail: "/courses/data-science.jpg",
    category: "Data Science",
    level: "Beginner",
    duration: "52 hours",
    lessonsCount: 96,
    studentsCount: 15200,
    rating: 4.8,
    reviewsCount: 3102,
    price: 0,
    isFeatured: true,
    tags: ["Python", "Machine Learning", "Pandas", "TensorFlow"],
    curriculum: [
      {
        id: "m7",
        title: "Python for Data Science",
        lessons: [
          { id: "l22", title: "Python Essentials", duration: "30:00", type: "video", isFree: true },
          { id: "l23", title: "NumPy & Pandas", duration: "35:00", type: "video" },
          { id: "l24", title: "Data Visualization", duration: "28:00", type: "video" },
        ],
      },
    ],
    updatedAt: "2026-03-18",
  },
  {
    id: "5",
    title: "Product Management Essentials",
    slug: "product-management-essentials",
    description:
      "Learn the core skills of product management — from discovery to delivery.",
    shortDescription: "Master product management from discovery to delivery.",
    instructor: {
      id: "i5",
      name: "Lisa Thompson",
      avatar: "/avatars/instructor-5.jpg",
      title: "VP of Product at Stripe",
      bio: "15 years in product management. Launched products used by millions.",
    },
    thumbnail: "/courses/product-mgmt.jpg",
    category: "Product Management",
    level: "Beginner",
    duration: "28 hours",
    lessonsCount: 52,
    studentsCount: 9100,
    rating: 4.6,
    reviewsCount: 1567,
    price: 0,
    isFeatured: false,
    isFree: true,
    tags: ["Strategy", "Roadmapping", "Analytics", "Agile"],
    curriculum: [
      {
        id: "m8",
        title: "Product Discovery",
        lessons: [
          { id: "l25", title: "Understanding Product-Market Fit", duration: "22:00", type: "video", isFree: true },
          { id: "l26", title: "User Research for PMs", duration: "20:00", type: "video" },
          { id: "l27", title: "Prioritization Frameworks", duration: "18:00", type: "video" },
        ],
      },
    ],
    updatedAt: "2026-03-01",
  },
  {
    id: "6",
    title: "Digital Marketing & Growth Hacking",
    slug: "digital-marketing-growth",
    description:
      "Master digital marketing channels, analytics, and growth strategies for startups and businesses.",
    shortDescription: "Growth strategies and digital marketing mastery.",
    instructor: {
      id: "i6",
      name: "Alex Rivera",
      avatar: "/avatars/instructor-6.jpg",
      title: "Head of Growth at HubSpot",
      bio: "Grew multiple startups from 0 to 100K users. Marketing advisor.",
    },
    thumbnail: "/courses/marketing.jpg",
    category: "Digital Marketing",
    level: "Intermediate",
    duration: "32 hours",
    lessonsCount: 58,
    studentsCount: 7840,
    rating: 4.7,
    reviewsCount: 1890,
    price: 0,
    isFeatured: false,
    tags: ["SEO", "Content Marketing", "Analytics", "Social Media"],
    curriculum: [
      {
        id: "m9",
        title: "Growth Fundamentals",
        lessons: [
          { id: "l28", title: "The Growth Framework", duration: "20:00", type: "video", isFree: true },
          { id: "l29", title: "Acquisition Channels", duration: "25:00", type: "video" },
          { id: "l30", title: "Conversion Optimization", duration: "22:00", type: "video" },
        ],
      },
    ],
    updatedAt: "2026-02-20",
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Jessica Liu",
    role: "Product Designer at Meta",
    avatar: "/avatars/testimonial-1.jpg",
    content:
      "Academia completely transformed my design career. The courses are incredibly well-structured and the instructors are world-class.",
    rating: 5,
  },
  {
    id: "t2",
    name: "David Kim",
    role: "Frontend Developer",
    avatar: "/avatars/testimonial-2.jpg",
    content:
      "The React & Next.js course helped me land my dream job. The practical projects made all the difference.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Aisha Patel",
    role: "Data Analyst at Amazon",
    avatar: "/avatars/testimonial-3.jpg",
    content:
      "Best investment in my career. The data science track is comprehensive and extremely practical.",
    rating: 5,
  },
];

export const currentUser: User = {
  id: "u1",
  name: "Alex Landrin",
  email: "alex@example.com",
  avatar: "/avatars/user.jpg",
  subscription: "pro",
  enrolledCourses: ["1", "2", "4"],
  completedLessons: ["l1", "l2", "l3", "l13", "l22"],
  joinedAt: "2025-12-01",
};
