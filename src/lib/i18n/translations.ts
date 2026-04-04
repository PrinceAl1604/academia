export type Language = "en" | "fr";

export const translations = {
  en: {
    // Navbar
    nav: {
      courses: "Courses",
      pricing: "Pricing",
      about: "About",
      activateKey: "Activate Key",
      getStarted: "Get Started",
      signIn: "Sign In",
      searchCourses: "Search courses...",
    },

    // Hero
    hero: {
      badge: "New courses added weekly",
      title: "Learn from the best.",
      titleHighlight: "Build real-world skills.",
      subtitle:
        "Access premium courses taught by industry experts from Google, Apple, Stripe, and more. One subscription, unlimited learning.",
      cta: "Start Learning Free",
      browseCourses: "Browse Courses",
      socialProof: "learners worldwide",
      join: "Join",
    },

    // Stats
    stats: {
      activeStudents: "Active Students",
      expertCourses: "Expert Courses",
      averageRating: "Average Rating",
      certificatesIssued: "Certificates Issued",
    },

    // Featured courses
    featured: {
      title: "Featured Courses",
      subtitle:
        "Start with our most popular courses, chosen by thousands of learners.",
      viewAll: "View All Courses",
    },

    // Features
    features: {
      title: "Everything you need to level up",
      subtitle:
        "Our platform is designed to help you learn effectively and achieve your career goals.",
      expertLed: "Expert-Led Courses",
      expertLedDesc:
        "Learn from industry professionals at top companies like Google, Apple, and Stripe.",
      learnPace: "Learn at Your Pace",
      learnPaceDesc:
        "Access courses anytime, anywhere. Watch on your schedule with lifetime access.",
      certificates: "Earn Certificates",
      certificatesDesc:
        "Get recognized certificates upon completion to showcase your new skills.",
      community: "Community Support",
      communityDesc:
        "Join a community of learners. Get help, share projects, and network.",
      biteSized: "Bite-Sized Lessons",
      biteSizedDesc:
        "Short, focused lessons designed to fit into your busy schedule.",
      quality: "Quality Guaranteed",
      qualityDesc:
        "All courses are reviewed for quality. 30-day money-back guarantee.",
    },

    // Testimonials
    testimonials: {
      title: "Loved by learners worldwide",
      subtitle:
        "See what our students have to say about their learning experience.",
    },

    // CTA
    cta: {
      title: "Ready to start your learning journey?",
      subtitle:
        "Join 50,000+ professionals who are advancing their careers with Academia. Start with a free account today.",
      getStarted: "Get Started for Free",
      viewPricing: "View Pricing",
    },

    // Footer
    footer: {
      tagline: "Learn from industry experts. Build real-world skills. Advance your career.",
      platform: "Platform",
      allCourses: "All Courses",
      pricing: "Pricing",
      forTeams: "For Teams",
      certificatesLink: "Certificates",
      resources: "Resources",
      blog: "Blog",
      communityLink: "Community",
      helpCenter: "Help Center",
      careers: "Careers",
      legal: "Legal",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      cookies: "Cookie Policy",
      rights: "All rights reserved.",
    },

    // Auth - Sign In
    auth: {
      signIn: "Sign in",
      signUp: "Create account",
      email: "Email",
      emailPlaceholder: "Enter your email address...",
      password: "Password",
      passwordPlaceholder: "Enter password...",
      continueEmail: "Continue with email",
      resetPassword: "Reset password",
      noAccount: "No account?",
      signUpButton: "Sign up",
      alreadyAccount: "Already have an account?",
      signInButton: "Sign in",
      privacy: "Privacy",
      terms: "Terms",
      fullName: "Full name",
      fullNamePlaceholder: "Enter your full name...",
      createPassword: "Create a password...",
      minChars: "Minimum 6 characters",
      createAccount: "Create account",
      checkEmail: "Check your email",
      confirmationSent: "We sent a confirmation link to",
      backToSignIn: "Back to sign in",
      resetTitle: "Reset password",
      resetDesc: "Enter your email and we'll send you a link to reset your password.",
      sendResetLink: "Send reset link",
      checkEmailReset: "Check your email for a password reset link.",
      passwordMinError: "Password must be at least 6 characters",
    },

    // Pricing
    pricingPage: {
      badge: "Simple Pricing",
      title: "One plan. All courses. No limits.",
      subtitle:
        "Get your licence key and unlock everything. No username or password needed — just your key.",
      guarantee:
        "All plans include a 30-day money-back guarantee. No questions asked.",
      monthlyDesc: "Great for trying out the platform",
      annualDesc: "Best value — save 43%",
      lifetimeDesc: "Pay once, learn forever",
      getStarted: "Get Started",
      getAnnual: "Get Annual Plan",
      getLifetime: "Get Lifetime Access",
    },

    // Course catalog
    catalog: {
      title: "All Courses",
      explore: "Explore",
      coursesAcross: "courses across",
      categories: "categories",
      searchPlaceholder: "Search courses...",
      allCategories: "All Categories",
      allLevels: "All Levels",
      all: "All",
      showing: "Showing",
      course: "course",
      courses: "courses",
      noCourses: "No courses found",
      noCoursesHint: "Try adjusting your search or filters",
      clearFilters: "Clear all filters",
      clear: "Clear",
    },

    // Course detail
    courseDetail: {
      includedInSub: "Included in your subscription",
      startLearning: "Start Learning",
      previewCourse: "Preview Course",
      ofContent: "of content",
      lessons: "lessons",
      certificateCompletion: "Certificate of completion",
      lifetimeAccess: "Lifetime access",
      curriculum: "Course Curriculum",
      modules: "chapters",
      module: "Chapter",
      skillsYoullLearn: "Skills you'll learn",
      reviews: "reviews",
      students: "students",
      free: "Free",
    },

    // Course player
    player: {
      courseContent: "Course Content",
      lessonsCompleted: "lessons completed",
      markComplete: "Mark as Complete",
      discussion: "Discussion",
      duration: "Duration",
      curriculum: "Curriculum",
    },

    // Dashboard
    dashboard: {
      browse: "Browse",
      welcomeBack: "Welcome back",
      continueSubtitle: "Continue where you left off, or explore new courses.",
      enrolledCourses: "Enrolled Courses",
      lessonsCompleted: "Lessons Completed",
      dayStreak: "Day Streak",
      certificatesLabel: "Certificates",
      continueLearning: "Continue Learning",
      viewAll: "View all",
      complete: "complete",
      continue: "Continue",
      signOut: "Sign Out",
      signUp: "Sign Up",
    },

    // My Courses
    myCourses: {
      title: "My Courses",
      enrolledIn: "You're enrolled in",
      coursesLabel: "courses",
      all: "All",
      inProgress: "In Progress",
      completed: "Completed",
      notStarted: "Not Started",
      noInProgress: "No courses in progress",
      noCompleted: "No completed courses yet",
      allStarted: "All courses started!",
      start: "Start",
    },

    // Profile
    profile: {
      title: "Profile",
      subtitle: "Manage your personal information",
      personalInfo: "Personal Information",
      bio: "Bio",
      bioPlaceholder: "Tell us a bit about yourself...",
      saveChanges: "Save Changes",
      memberSince: "Member since",
    },

    // Settings
    settings: {
      title: "Settings",
      subtitle: "Manage your account preferences",
      notifications: "Notifications",
      notificationsDesc: "Choose what notifications you receive",
      courseUpdates: "Course updates",
      courseUpdatesDesc: "Get notified when courses you're enrolled in are updated",
      newCourses: "New courses",
      newCoursesDesc: "Get notified when new courses are published",
      weeklyDigest: "Weekly digest",
      weeklyDigestDesc: "Receive a weekly summary of your learning progress",
      marketingEmails: "Marketing emails",
      marketingEmailsDesc: "Receive promotional offers and announcements",
      preferences: "Preferences",
      language: "Language",
      languageDesc: "Select your preferred language",
      videoQuality: "Video quality",
      videoQualityDesc: "Default video playback quality",
      autoplay: "Autoplay",
      autoplayDesc: "Automatically play the next lesson",
      dangerZone: "Danger Zone",
      dangerDesc: "Irreversible and destructive actions",
      deleteAccount: "Delete account",
      deleteAccountDesc: "Permanently delete your account and all data",
    },

    // Subscription
    subscription: {
      title: "Subscription",
      subtitle: "Manage your licence and subscription",
      proPlan: "Pro Plan",
      active: "Active",
      fullAccess: "Full access to all courses and features",
      licenceKey: "Licence Key",
      status: "Status",
      activatedOn: "Activated on",
      expires: "Expires",
      whatsIncluded: "What's Included",
      needNewLicence: "Need a new licence?",
      needNewLicenceDesc: "Contact us for licence renewal or team licences.",
      contactSupport: "Contact Support",
    },

    // Certificates
    certificatesPage: {
      title: "Certificates",
      subtitle: "Your earned certificates and achievements",
      earned: "Earned",
      completedOn: "Completed on",
      download: "Download",
      share: "Share",
      inProgressTitle: "In Progress",
      completeToEarn: "Complete the course to earn this certificate",
    },

    // Help
    help: {
      title: "Help Center",
      subtitle: "Find answers or get in touch with our team",
      searchPlaceholder: "Search for help...",
      documentation: "Documentation",
      browseGuides: "Browse our guides",
      liveChat: "Live Chat",
      chatSupport: "Chat with support",
      emailUs: "Email Us",
      cantFind: "Can't find what you're looking for?",
    },

    // Common
    common: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    },

    // Admin
    admin: {
      dashboard: "Admin Dashboard",
      manageCourses: "Manage Courses",
      licences: "Licences",
      analytics: "Analytics",
      adminBadge: "Admin",
      overview: "Overview",
      totalStudents: "Total Students",
      activeStudents: "Active Students",
      totalCourses: "Total Courses",
      activeLicences: "Active Licences",
      revenue: "Revenue",
      recentActivity: "Recent Activity",
      quickActions: "Quick Actions",
      addCourse: "Add Course",
      generateKey: "Generate Key",
      viewAnalytics: "View Analytics",
      courses: "Courses",
      searchCourses: "Search courses...",
      title: "Title",
      category: "Category",
      students: "Students",
      rating: "Rating",
      status: "Status",
      actions: "Actions",
      edit: "Edit",
      delete: "Delete",
      published: "Published",
      draft: "Draft",
      createCourse: "Create Course",
      courseTitle: "Course Title",
      courseDescription: "Course Description",
      shortDescription: "Short Description",
      selectCategory: "Select category",
      selectLevel: "Select level",
      tags: "Tags",
      tagsPlaceholder: "Add tags separated by commas",
      saveCourse: "Save Course",
      allLicences: "All Licence Keys",
      licenceKey: "Licence Key",
      type: "Type",
      assignedTo: "Assigned To",
      createdAt: "Created",
      expiresAt: "Expires",
      active: "Active",
      inactive: "Inactive",
      expired: "Expired",
      student: "Student",
      admin: "Admin",
      unassigned: "Unassigned",
      copyKey: "Copy",
      generateNewKey: "Generate New Key",
      analyticsTitle: "Analytics",
      enrollmentOverTime: "Enrollment Over Time",
      popularCourses: "Popular Courses",
      studentProgress: "Student Progress",
      completionRate: "Completion Rate",
      avgTime: "Avg. Time Per Course",
      enrollments: "Enrollments",
      completions: "Completions",
      noResults: "No results found",
      proSubscribers: "Pro Subscribers",
      newSignups30d: "New Signups (30d)",
      publishedSlashTotal: "published / total",
      createNewCourse: "Create a new course",
      editOrDeleteCourses: "Edit or delete courses",
      detailedAnalytics: "Detailed analytics",
    },
  },

  fr: {
    // Navbar
    nav: {
      courses: "Cours",
      pricing: "Tarifs",
      about: "À propos",
      activateKey: "Activer la clé",
      getStarted: "Commencer",
      signIn: "Se connecter",
      searchCourses: "Rechercher des cours...",
    },

    // Hero
    hero: {
      badge: "Nouveaux cours ajoutés chaque semaine",
      title: "Apprenez des meilleurs.",
      titleHighlight: "Développez des compétences concrètes.",
      subtitle:
        "Accédez à des cours premium enseignés par des experts de Google, Apple, Stripe et plus. Un abonnement, un apprentissage illimité.",
      cta: "Commencer gratuitement",
      browseCourses: "Parcourir les cours",
      socialProof: "apprenants dans le monde",
      join: "Rejoignez",
    },

    // Stats
    stats: {
      activeStudents: "Étudiants actifs",
      expertCourses: "Cours d'experts",
      averageRating: "Note moyenne",
      certificatesIssued: "Certificats délivrés",
    },

    // Featured courses
    featured: {
      title: "Cours en vedette",
      subtitle:
        "Commencez par nos cours les plus populaires, choisis par des milliers d'apprenants.",
      viewAll: "Voir tous les cours",
    },

    // Features
    features: {
      title: "Tout ce dont vous avez besoin pour progresser",
      subtitle:
        "Notre plateforme est conçue pour vous aider à apprendre efficacement et atteindre vos objectifs de carrière.",
      expertLed: "Cours dirigés par des experts",
      expertLedDesc:
        "Apprenez avec des professionnels de grandes entreprises comme Google, Apple et Stripe.",
      learnPace: "Apprenez à votre rythme",
      learnPaceDesc:
        "Accédez aux cours partout, à tout moment. Regardez selon votre emploi du temps avec un accès à vie.",
      certificates: "Obtenez des certificats",
      certificatesDesc:
        "Recevez des certificats reconnus à la fin de chaque cours pour valoriser vos compétences.",
      community: "Soutien communautaire",
      communityDesc:
        "Rejoignez une communauté d'apprenants. Obtenez de l'aide, partagez des projets et réseautez.",
      biteSized: "Leçons courtes",
      biteSizedDesc:
        "Des leçons courtes et ciblées, conçues pour s'adapter à votre emploi du temps chargé.",
      quality: "Qualité garantie",
      qualityDesc:
        "Tous les cours sont vérifiés pour leur qualité. Garantie de remboursement de 30 jours.",
    },

    // Testimonials
    testimonials: {
      title: "Apprécié par les apprenants du monde entier",
      subtitle:
        "Découvrez ce que nos étudiants disent de leur expérience d'apprentissage.",
    },

    // CTA
    cta: {
      title: "Prêt à commencer votre parcours d'apprentissage ?",
      subtitle:
        "Rejoignez plus de 50 000 professionnels qui font avancer leur carrière avec Academia. Commencez avec un compte gratuit dès aujourd'hui.",
      getStarted: "Commencer gratuitement",
      viewPricing: "Voir les tarifs",
    },

    // Footer
    footer: {
      tagline:
        "Apprenez avec des experts. Développez des compétences concrètes. Faites avancer votre carrière.",
      platform: "Plateforme",
      allCourses: "Tous les cours",
      pricing: "Tarifs",
      forTeams: "Pour les équipes",
      certificatesLink: "Certificats",
      resources: "Ressources",
      blog: "Blog",
      communityLink: "Communauté",
      helpCenter: "Centre d'aide",
      careers: "Carrières",
      legal: "Juridique",
      privacy: "Politique de confidentialité",
      terms: "Conditions d'utilisation",
      cookies: "Politique de cookies",
      rights: "Tous droits réservés.",
    },

    // Auth
    auth: {
      signIn: "Se connecter",
      signUp: "Créer un compte",
      email: "E-mail",
      emailPlaceholder: "Entrez votre adresse e-mail...",
      password: "Mot de passe",
      passwordPlaceholder: "Entrez le mot de passe...",
      continueEmail: "Continuer avec l'e-mail",
      resetPassword: "Réinitialiser le mot de passe",
      noAccount: "Pas de compte ?",
      signUpButton: "S'inscrire",
      alreadyAccount: "Vous avez déjà un compte ?",
      signInButton: "Se connecter",
      privacy: "Confidentialité",
      terms: "Conditions",
      fullName: "Nom complet",
      fullNamePlaceholder: "Entrez votre nom complet...",
      createPassword: "Créer un mot de passe...",
      minChars: "Minimum 6 caractères",
      createAccount: "Créer un compte",
      checkEmail: "Vérifiez votre e-mail",
      confirmationSent: "Nous avons envoyé un lien de confirmation à",
      backToSignIn: "Retour à la connexion",
      resetTitle: "Réinitialiser le mot de passe",
      resetDesc: "Entrez votre e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.",
      sendResetLink: "Envoyer le lien",
      checkEmailReset: "Vérifiez votre e-mail pour un lien de réinitialisation.",
      passwordMinError: "Le mot de passe doit contenir au moins 6 caractères",
    },

    // Pricing
    pricingPage: {
      badge: "Tarification simple",
      title: "Un plan. Tous les cours. Sans limites.",
      subtitle:
        "Obtenez votre clé de licence et débloquez tout. Pas de nom d'utilisateur ni de mot de passe — juste votre clé.",
      guarantee:
        "Tous les plans incluent une garantie de remboursement de 30 jours. Sans condition.",
      monthlyDesc: "Idéal pour découvrir la plateforme",
      annualDesc: "Meilleur rapport qualité-prix — économisez 43%",
      lifetimeDesc: "Payez une fois, apprenez pour toujours",
      getStarted: "Commencer",
      getAnnual: "Choisir le plan annuel",
      getLifetime: "Accès à vie",
    },

    // Course catalog
    catalog: {
      title: "Tous les cours",
      explore: "Explorez",
      coursesAcross: "cours dans",
      categories: "catégories",
      searchPlaceholder: "Rechercher des cours...",
      allCategories: "Toutes les catégories",
      allLevels: "Tous les niveaux",
      all: "Tous",
      showing: "Affichage de",
      course: "cours",
      courses: "cours",
      noCourses: "Aucun cours trouvé",
      noCoursesHint: "Essayez de modifier votre recherche ou vos filtres",
      clearFilters: "Effacer tous les filtres",
      clear: "Effacer",
    },

    // Course detail
    courseDetail: {
      includedInSub: "Inclus dans votre abonnement",
      startLearning: "Commencer à apprendre",
      previewCourse: "Aperçu du cours",
      ofContent: "de contenu",
      lessons: "leçons",
      certificateCompletion: "Certificat de fin de cours",
      lifetimeAccess: "Accès à vie",
      curriculum: "Programme du cours",
      modules: "chapitres",
      module: "Chapitre",
      skillsYoullLearn: "Compétences que vous apprendrez",
      reviews: "avis",
      students: "étudiants",
      free: "Gratuit",
    },

    // Course player
    player: {
      courseContent: "Contenu du cours",
      lessonsCompleted: "leçons terminées",
      markComplete: "Marquer comme terminé",
      discussion: "Discussion",
      duration: "Durée",
      curriculum: "Programme",
    },

    // Dashboard
    dashboard: {
      browse: "Explorer",
      welcomeBack: "Bon retour",
      continueSubtitle:
        "Continuez là où vous vous êtes arrêté, ou explorez de nouveaux cours.",
      enrolledCourses: "Cours inscrits",
      lessonsCompleted: "Leçons terminées",
      dayStreak: "Jours consécutifs",
      certificatesLabel: "Certificats",
      continueLearning: "Continuer à apprendre",
      viewAll: "Voir tout",
      complete: "terminé",
      continue: "Continuer",
      signOut: "Déconnexion",
      signUp: "S'inscrire",
    },

    // My Courses
    myCourses: {
      title: "Mes cours",
      enrolledIn: "Vous êtes inscrit à",
      coursesLabel: "cours",
      all: "Tous",
      inProgress: "En cours",
      completed: "Terminés",
      notStarted: "Non commencés",
      noInProgress: "Aucun cours en cours",
      noCompleted: "Aucun cours terminé pour l'instant",
      allStarted: "Tous les cours ont été commencés !",
      start: "Commencer",
    },

    // Profile
    profile: {
      title: "Profil",
      subtitle: "Gérez vos informations personnelles",
      personalInfo: "Informations personnelles",
      bio: "Bio",
      bioPlaceholder: "Dites-nous un peu sur vous...",
      saveChanges: "Enregistrer les modifications",
      memberSince: "Membre depuis",
    },

    // Settings
    settings: {
      title: "Paramètres",
      subtitle: "Gérez les préférences de votre compte",
      notifications: "Notifications",
      notificationsDesc: "Choisissez les notifications que vous recevez",
      courseUpdates: "Mises à jour de cours",
      courseUpdatesDesc:
        "Soyez notifié lorsque les cours auxquels vous êtes inscrit sont mis à jour",
      newCourses: "Nouveaux cours",
      newCoursesDesc: "Soyez notifié lorsque de nouveaux cours sont publiés",
      weeklyDigest: "Résumé hebdomadaire",
      weeklyDigestDesc:
        "Recevez un résumé hebdomadaire de votre progression d'apprentissage",
      marketingEmails: "E-mails marketing",
      marketingEmailsDesc: "Recevez des offres promotionnelles et des annonces",
      preferences: "Préférences",
      language: "Langue",
      languageDesc: "Sélectionnez votre langue préférée",
      videoQuality: "Qualité vidéo",
      videoQualityDesc: "Qualité de lecture vidéo par défaut",
      autoplay: "Lecture automatique",
      autoplayDesc: "Lire automatiquement la prochaine leçon",
      dangerZone: "Zone de danger",
      dangerDesc: "Actions irréversibles et destructrices",
      deleteAccount: "Supprimer le compte",
      deleteAccountDesc:
        "Supprimer définitivement votre compte et toutes vos données",
    },

    // Subscription
    subscription: {
      title: "Abonnement",
      subtitle: "Gérez votre licence et votre abonnement",
      proPlan: "Plan Pro",
      active: "Actif",
      fullAccess: "Accès complet à tous les cours et fonctionnalités",
      licenceKey: "Clé de licence",
      status: "Statut",
      activatedOn: "Activé le",
      expires: "Expire le",
      whatsIncluded: "Ce qui est inclus",
      needNewLicence: "Besoin d'une nouvelle licence ?",
      needNewLicenceDesc:
        "Contactez-nous pour le renouvellement de licence ou les licences d'équipe.",
      contactSupport: "Contacter le support",
    },

    // Certificates
    certificatesPage: {
      title: "Certificats",
      subtitle: "Vos certificats obtenus et réalisations",
      earned: "Obtenu",
      completedOn: "Terminé le",
      download: "Télécharger",
      share: "Partager",
      inProgressTitle: "En cours",
      completeToEarn: "Terminez le cours pour obtenir ce certificat",
    },

    // Help
    help: {
      title: "Centre d'aide",
      subtitle: "Trouvez des réponses ou contactez notre équipe",
      searchPlaceholder: "Rechercher de l'aide...",
      documentation: "Documentation",
      browseGuides: "Parcourir nos guides",
      liveChat: "Chat en direct",
      chatSupport: "Discuter avec le support",
      emailUs: "Nous contacter",
      cantFind: "Vous ne trouvez pas ce que vous cherchez ?",
    },

    // Common
    common: {
      beginner: "Débutant",
      intermediate: "Intermédiaire",
      advanced: "Avancé",
    },

    // Admin
    admin: {
      dashboard: "Tableau de bord admin",
      manageCourses: "Gérer les cours",
      licences: "Licences",
      analytics: "Analytique",
      adminBadge: "Admin",
      overview: "Vue d'ensemble",
      totalStudents: "Total étudiants",
      activeStudents: "Étudiants actifs",
      totalCourses: "Total des cours",
      activeLicences: "Licences actives",
      revenue: "Revenus",
      recentActivity: "Activité récente",
      quickActions: "Actions rapides",
      addCourse: "Ajouter un cours",
      generateKey: "Générer une clé",
      viewAnalytics: "Voir les analytiques",
      courses: "Cours",
      searchCourses: "Rechercher des cours...",
      title: "Titre",
      category: "Catégorie",
      students: "Étudiants",
      rating: "Note",
      status: "Statut",
      actions: "Actions",
      edit: "Modifier",
      delete: "Supprimer",
      published: "Publié",
      draft: "Brouillon",
      createCourse: "Créer un cours",
      courseTitle: "Titre du cours",
      courseDescription: "Description du cours",
      shortDescription: "Description courte",
      selectCategory: "Sélectionner une catégorie",
      selectLevel: "Sélectionner un niveau",
      tags: "Tags",
      tagsPlaceholder: "Ajouter des tags séparés par des virgules",
      saveCourse: "Enregistrer le cours",
      allLicences: "Toutes les clés de licence",
      licenceKey: "Clé de licence",
      type: "Type",
      assignedTo: "Assigné à",
      createdAt: "Créé le",
      expiresAt: "Expire le",
      active: "Actif",
      inactive: "Inactif",
      expired: "Expiré",
      student: "Étudiant",
      admin: "Admin",
      unassigned: "Non assigné",
      copyKey: "Copier",
      generateNewKey: "Générer une nouvelle clé",
      analyticsTitle: "Analytique",
      enrollmentOverTime: "Inscriptions au fil du temps",
      popularCourses: "Cours populaires",
      studentProgress: "Progrès des étudiants",
      completionRate: "Taux de complétion",
      avgTime: "Temps moyen par cours",
      enrollments: "Inscriptions",
      completions: "Complétions",
      noResults: "Aucun résultat trouvé",
      proSubscribers: "Abonnés Pro",
      newSignups30d: "Nouvelles inscriptions (30j)",
      publishedSlashTotal: "publiés / total",
      createNewCourse: "Créer un nouveau cours",
      editOrDeleteCourses: "Modifier ou supprimer des cours",
      detailedAnalytics: "Analytiques détaillées",
    },
  },
} as const;

// Deep map all leaf values to string
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string;
};

export type TranslationKeys = DeepStringify<typeof translations.en>;
