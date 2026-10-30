import type { Lang } from "@/lib/i18n";

export interface HomeCopy {
  skip: string;
  nav: { features: string; classroom: string; app: string; customers: string; pricing: string; faq: string; blog: string; signIn: string; demo: string; menu: string; closeMenu: string };
  ngo: { eyebrow: string; heading: string; body: string; cta: string; note: string };
  hero: { words: string[]; accent: number[]; sub: string; demo: string; watch: string; trust: string[]; form: { label: string; placeholder: string; note: string; invalid: string }; room: { alt: string; caption: string } };
  proof: { label: string; items: string[] };
  audience: { eyebrow: string; heading: string; sub: string; items: { key: string; title: string; body: string }[] };
  autopilot: { heading: string; items: string[] };
  live: { eyebrow: string; heading: string; sub: string; points: { title: string; body: string }[]; alt: string; callouts: { waiting: string; stars: string }; caption: string };
  app: { eyebrow: string; heading: string; sub: string; points: { title: string; body: string }[]; badge: string; alts: string[]; labels: string[]; caption: string };
  showcase: { eyebrow: string; heading: string; sub: string; caption: string; tabs: { key: string; title: string; body: string; alt: string }[] };
  video: { eyebrow: string; heading: string; sub: string };
  metrics: { to: number; suffix?: string; label: string }[];
  security: { eyebrow: string; heading: string; sub: string; items: { title: string; body: string }[]; note: string; terms: string; privacy: string };
  pricing: { eyebrow: string; heading: string; sub: string; from: string; perMonth: string; cta: string; points: string[] };
  faq: { eyebrow: string; heading: string; items: { q: string; a: string }[] };
  cta: { heading: string; sub: string; demo: string; ask: string; signIn: string };
  footer: { tagline: string; careers: string; customers: string; company: string; legal: string; contact: string; whatsapp: string; terms: string; privacy: string; clientFinder: string; portals: string; blog: string; pricing: string; signIn: string; demo: string; rights: (year: number) => string };
}

export const COPY: Record<Lang, HomeCopy> = {
  en: {
    skip: "Skip to main content",
    nav: { features: "Platform", classroom: "Live classroom", app: "Mobile app", customers: "Customers", pricing: "Pricing", faq: "FAQ", blog: "Blog", signIn: "Sign in", demo: "Book free walkthrough", menu: "Open menu", closeMenu: "Close menu" },
    hero: {
      words: ["Run", "your", "coaching", "centre", "from", "one", "place."],
      accent: [5, 6],
      sub: "Replace scattered video calls, spreadsheets and fee follow-ups with one platform for live classes, admissions, payments and parent updates.",
      demo: "Book free walkthrough",
      watch: "Watch the walkthrough",
      trust: ["One login, 8 role-based portals", "Parent mobile app included", "Live classroom, fees and admissions"],
      form: { label: "Your email or mobile number", placeholder: "Your email or mobile number", note: "Free 30-minute platform walkthrough. No payment details.", invalid: "Enter a valid email address or mobile number." },
      room: {
        alt: "A Meet to Manage live class: a teacher and three children on screen waving and giving a thumbs up, a Great job reward, a student joining, and the parent app on a phone showing the next class and a Join class button",
        caption: "A live class on Meet to Manage. Illustration with sample names.",
      },
    },
    proof: { label: "Built on trusted infrastructure", items: ["Razorpay payments", "Cashfree payments", "WhatsApp reminders", "Email notifications", "SMS alerts"] },
    ngo: {
      eyebrow: "Offer for non-profits",
      heading: "Free for NGOs.",
      body: "Run a non-profit coaching or learning programme? Claim the offer and we will set up your centre on Meet to Manage, subject to a quick eligibility check.",
      cta: "Claim offer",
      note: "Registered NGOs and non-profit education programmes.",
    },
    audience: {
      eyebrow: "Made for online coaching",
      heading: "Whatever you teach online, it runs on autopilot.",
      sub: "Batches, timetables, practice material and parent updates, set up once for the way your centre teaches.",
      items: [
        { key: "abacus", title: "Abacus and Vedic maths", body: "Level-wise batches, practice drills and a progress report for every child." },
        { key: "phonics", title: "Phonics and early reading", body: "Interactive phonics games in class, and parents who see the progress." },
        { key: "english", title: "Spoken English and languages", body: "Small live batches, class recordings and homework in one place." },
        { key: "tuition", title: "Online tuition", body: "Grade-wise timetables, monthly fee tracking and quick parent updates." },
        { key: "coding", title: "Coding, art and skills", body: "Scratch, Python, drawing and music with ready-made activities." },
        { key: "trainer", title: "Teacher training", body: "Run trainer batches and share resources with every trainee." },
      ],
    },
    autopilot: { heading: "What runs on autopilot", items: ["Fee invoices and reminders", "Class reminders to parents", "Attendance, marked live", "Monthly progress reports", "Teacher payouts"] },
    live: {
      eyebrow: "Live classroom",
      heading: "A classroom built for children, not just a meeting.",
      sub: "Video, whiteboard, games and recordings sit in one room, so you never switch tools mid-class.",
      points: [
        { title: "One-click join", body: "Teachers and parents enter the class straight from their portal or the app." },
        { title: "Whiteboard and games", body: "Draw, drag and match on a shared board, and launch games from a 145-title library." },
        { title: "Stars and leaderboard", body: "Live rewards keep young learners excited to answer." },
        { title: "You control who joins", body: "A waiting room lets you admit parents and guests with one tap." },
        { title: "Recordings for parents", body: "Every class can be recorded and replayed from the parent app." },
      ],
      alt: "A Meet to Manage live class: a teacher and three children on screen waving and giving a thumbs up, a Great job reward, a student joining, a waiting-room request and a control bar, with the parent app on a phone",
      callouts: { waiting: "Admit parents from the waiting room", stars: "Stars and leaderboard" },
      caption: "The live classroom, with sample participants.",
    },
    app: {
      eyebrow: "Parent mobile app",
      heading: "Parents join, pay and follow progress from their phone.",
      sub: "No more WhatsApp reminders. Everything a family needs is one tap away.",
      points: [
        { title: "Join live class", body: "An Up next card shows the next class and opens the room in one tap." },
        { title: "Fees and receipts", body: "See what is due, pay securely and keep every receipt." },
        { title: "Progress and recordings", body: "Monthly reports, class recordings and worksheets for each child." },
        { title: "Mito, the AI study buddy", body: "A friendly helper that quizzes children between classes." },
        { title: "Your name and colours", body: "The app carries your academy's branding, with a biometric lock for privacy." },
      ],
      badge: "iOS and Android",
      alts: ["Parent app home screen with an Up next card for today's abacus class and a Join class button", "Parent app classes screen listing upcoming classes by day", "Parent app fees screen with an outstanding balance, a Pay securely button and an invoice list"],
      labels: ["Home", "Classes", "Fees"],
      caption: "The parent app, with sample data.",
    },
    showcase: {
      eyebrow: "The platform",
      heading: "Everything behind the classroom, in one workspace.",
      sub: "The same live system your admins and teachers already use.",
      caption: "Illustrations of the Meet to Manage admin portal, with sample data.",
      tabs: [
        { key: "games", title: "Learning games and activities", body: "145 ready-to-launch games and teaching resources across 10 skill areas, opened right inside the live class.", alt: "Learning games library with phonics, alphabet and teacher training resources" },
        { key: "calendar", title: "Academic calendar", body: "Every class, demo, holiday and teacher leave in one colour-coded calendar, so clashes are caught before they happen.", alt: "Academic calendar showing scheduled sessions, demos and rescheduled classes across October" },
        { key: "ai", title: "AI Command Center", body: "Ask about collections, students and classes and get live answers, with a prioritised list of owner actions.", alt: "AI Command Center with a business copilot, student follow-ups and a financial forecast" },
      ],
    },
    video: { eyebrow: "See it in action", heading: "A 13-minute tour of the platform.", sub: "Scheduling, portals and reporting, recorded from the real product." },
    metrics: [
      { to: 8, label: "role-based portals" },
      { to: 145, label: "learning games and resources" },
      { to: 24, suffix: "/7", label: "automated fee reminders" },
      { to: 1, label: "login for everyone" },
    ],
    security: {
      eyebrow: "Security and trust",
      heading: "Built to look after children's data.",
      sub: "Access, payments and privacy are designed in from the start, not added later.",
      items: [
        { title: "Role-based access", body: "Teachers, parents, students and staff each see only what their role allows." },
        { title: "Payments through gateways", body: "Fees are collected through Razorpay or Cashfree, so card details are entered with the gateway." },
        { title: "Privacy for families", body: "Clear rules on recordings, retention and children's information, with a parent-first approach." },
      ],
      note: "We don't yet publish formal compliance certifications. Ask us and we'll walk through our security setup on a call.",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
    },
    pricing: {
      eyebrow: "Pricing",
      heading: "One simple price per centre.",
      sub: "Not per student. Pay monthly or yearly, and change plan whenever you grow.",
      from: "Plans from",
      perMonth: "per month",
      cta: "See all plans",
      points: ["Live classes, admissions and fee collection included", "Parent mobile app included", "Your own branding"],
    },
    faq: {
      eyebrow: "FAQ",
      heading: "Questions coaching centres ask before switching.",
      items: [
        { q: "Is this just another video-call tool?", a: "No. The live classroom is one part of it. Scheduling, admissions, billing and reporting live in the same system, so a class connects straight to attendance, invoices and reports." },
        { q: "Will it work for abacus or phonics classes?", a: "Yes. It was built for small-batch and one-to-one online classes, with a library of 145 games and resources that includes phonics and abacus activities." },
        { q: "How long can families watch a class recording?", a: "Recordings stay available for the retention period of your plan, from the same app families already use to check schedules and pay fees." },
        { q: "What happens when a fee is late?", a: "Invoices are created automatically and reminders go out. Access can pause when a payment is overdue and returns the moment the family pays, with no manual follow-up." },
        { q: "Is the walkthrough really free?", a: "Yes. There is no payment or commitment. Our team shows you the live classroom, admissions, fees and parent app, then answers questions about your centre's workflow." },
        { q: "How is pricing structured?", a: "One price per centre based on the plan, not per student. See the pricing page for the current plans and limits." },
      ],
    },
    cta: { heading: "See how your centre could run from one place.", sub: "Book a free 30-minute platform walkthrough. No payment details, no commitment.", demo: "Book free walkthrough", ask: "Ask our AI", signIn: "Already a customer? Sign in" },
    footer: {
      tagline: "Live teaching, admissions, billing and reporting in one platform for online coaching centres, academies and tutors.",
      careers: "Careers", customers: "Customers",
      company: "Get started", legal: "Legal", contact: "Contact", whatsapp: "WhatsApp us",
      terms: "Terms of Service", privacy: "Privacy Policy", clientFinder: "Client Finder policy", portals: "Explore portals", blog: "Blog", pricing: "Pricing", signIn: "Sign in", demo: "Book free walkthrough",
      rights: (year) => `© ${year} Meet to Manage. All rights reserved.`,
    },
  },
  ar: {
    skip: "انتقل إلى المحتوى الرئيسي",
    nav: { features: "المنصة", classroom: "الفصل المباشر", app: "تطبيق الجوال", customers: "العملاء", pricing: "الأسعار", faq: "الأسئلة", blog: "المدونة", signIn: "تسجيل الدخول", demo: "احجز عرضًا", menu: "فتح القائمة", closeMenu: "إغلاق القائمة" },
    hero: {
      words: ["أتمت", "عملك.", "ادخل", "العصر", "الجديد", "للتدريب", "عبر", "الإنترنت."],
      accent: [3, 4],
      sub: "فصلك الافتراضي الخاص، مع تحصيل الرسوم والقبول وتطبيق لأولياء الأمور، كلها تعمل تلقائيًا لتقضي يومك في التدريس.",
      demo: "احجز عرضًا",
      watch: "شاهد الجولة",
      trust: ["تسجيل دخول واحد، 8 بوابات حسب الدور", "تطبيق جوال لأولياء الأمور مشمول", "فصل مباشر ورسوم وقبول"],
      form: { label: "بريدك الإلكتروني أو رقم جوالك", placeholder: "بريدك الإلكتروني أو رقم جوالك", note: "حصة تجريبية مجانية دون بيانات دفع.", invalid: "أدخل بريدًا إلكترونيًا صالحًا أو رقم جوال." },
      room: {
        alt: "حصة مباشرة على Meet to Manage: معلم وثلاثة أطفال على الشاشة يلوّحون ويرفعون الإبهام، ومكافأة أحسنت، وطالب ينضم، وتطبيق أولياء الأمور على الهاتف يعرض الحصة القادمة وزر الانضمام",
        caption: "حصة مباشرة على Meet to Manage. رسم توضيحي بأسماء توضيحية.",
      },
    },
    proof: { label: "مبني على بنية تحتية موثوقة", items: ["مدفوعات Razorpay", "مدفوعات Cashfree", "تذكيرات واتساب", "إشعارات البريد", "تنبيهات SMS"] },
    ngo: {
      eyebrow: "عرض للمنظمات غير الربحية",
      heading: "مجاني للمنظمات غير الحكومية.",
      body: "تدير برنامجًا تدريبيًا أو تعليميًا غير ربحي؟ احصل على العرض وسنجهّز مركزك على Meet to Manage، بعد تحقق سريع من الأهلية.",
      cta: "احصل على العرض",
      note: "المنظمات غير الحكومية المسجلة والبرامج التعليمية غير الربحية.",
    },
    audience: {
      eyebrow: "مصمم للتدريب عبر الإنترنت",
      heading: "مهما كان ما تدرّسه، يعمل تلقائيًا.",
      sub: "الدفعات والجداول والمواد التدريبية وتحديثات أولياء الأمور، تُضبط مرة واحدة بما يناسب طريقة مركزك.",
      items: [
        { key: "abacus", title: "العداد والرياضيات الفيدية", body: "دفعات حسب المستوى وتمارين وتقرير تقدّم لكل طفل." },
        { key: "phonics", title: "الفونيكس والقراءة المبكرة", body: "ألعاب فونيكس تفاعلية في الحصة، وأولياء أمور يرون التقدّم." },
        { key: "english", title: "الإنجليزية المحكية واللغات", body: "دفعات مباشرة صغيرة وتسجيلات وواجبات في مكان واحد." },
        { key: "tuition", title: "الدروس الخصوصية", body: "جداول حسب الصف وتتبع الرسوم الشهرية وتحديثات سريعة لأولياء الأمور." },
        { key: "coding", title: "البرمجة والفنون والمهارات", body: "Scratch وPython والرسم والموسيقى مع أنشطة جاهزة." },
        { key: "trainer", title: "تدريب المعلمين", body: "أدِر دفعات المدربين وشارك الموارد مع كل متدرب." },
      ],
    },
    autopilot: { heading: "ما يعمل تلقائيًا", items: ["فواتير الرسوم والتذكيرات", "تذكيرات الحصص لأولياء الأمور", "الحضور يُسجَّل مباشرة", "تقارير التقدّم الشهرية", "مستحقات المعلمين"] },
    live: {
      eyebrow: "الفصل المباشر",
      heading: "فصل مصمم للأطفال، وليس مجرد اجتماع.",
      sub: "الفيديو والسبورة والألعاب والتسجيلات في غرفة واحدة، فلا تنتقل بين الأدوات أثناء الحصة.",
      points: [
        { title: "انضمام بنقرة واحدة", body: "يدخل المعلمون وأولياء الأمور الحصة مباشرة من البوابة أو التطبيق." },
        { title: "السبورة والألعاب", body: "ارسم واسحب وطابق على سبورة مشتركة، وشغّل الألعاب من مكتبة تضم 145 عنصرًا." },
        { title: "النجوم ولوحة الصدارة", body: "مكافآت حية تُبقي المتعلمين الصغار متحمسين للإجابة." },
        { title: "أنت تتحكم فيمن ينضم", body: "غرفة انتظار تتيح لك قبول أولياء الأمور والضيوف بنقرة." },
        { title: "تسجيلات لأولياء الأمور", body: "يمكن تسجيل كل حصة وإعادة مشاهدتها من تطبيق أولياء الأمور." },
      ],
      alt: "حصة مباشرة على Meet to Manage: معلم وثلاثة أطفال على الشاشة يلوّحون ويرفعون الإبهام، ومكافأة أحسنت، وطالب ينضم، وطلب انضمام في غرفة الانتظار وشريط تحكم، مع تطبيق أولياء الأمور على الهاتف",
      callouts: { waiting: "اقبل أولياء الأمور من غرفة الانتظار", stars: "النجوم ولوحة الصدارة" },
      caption: "الفصل المباشر، بمشاركين توضيحيين.",
    },
    app: {
      eyebrow: "تطبيق أولياء الأمور",
      heading: "ينضم الأهل ويدفعون ويتابعون التقدّم من هواتفهم.",
      sub: "لا مزيد من تذكيرات واتساب. كل ما تحتاجه الأسرة على بعد نقرة.",
      points: [
        { title: "انضم إلى الحصة المباشرة", body: "بطاقة «التالي» تعرض الحصة القادمة وتفتح الغرفة بنقرة." },
        { title: "الرسوم والإيصالات", body: "اعرف المستحق وادفع بأمان واحتفظ بكل إيصال." },
        { title: "التقدّم والتسجيلات", body: "تقارير شهرية وتسجيلات حصص وأوراق عمل لكل طفل." },
        { title: "ميتو، رفيق الدراسة الذكي", body: "مساعد ودود يختبر الأطفال بين الحصص." },
        { title: "اسمك وألوانك", body: "يحمل التطبيق هوية أكاديميتك، مع قفل بالبصمة للخصوصية." },
      ],
      badge: "iOS وAndroid",
      alts: ["الشاشة الرئيسية لتطبيق أولياء الأمور مع بطاقة الحصة القادمة وزر الانضمام", "شاشة الحصص تعرض الحصص القادمة حسب اليوم", "شاشة الرسوم مع الرصيد المستحق وزر الدفع بأمان وقائمة الفواتير"],
      labels: ["الرئيسية", "الحصص", "الرسوم"],
      caption: "تطبيق أولياء الأمور، ببيانات توضيحية.",
    },
    showcase: {
      eyebrow: "المنصة",
      heading: "كل ما وراء الفصل، في مساحة عمل واحدة.",
      sub: "النظام الحي نفسه الذي يستخدمه المشرفون والمعلمون.",
      caption: "رسوم توضيحية للوحة إدارة Meet to Manage، ببيانات توضيحية.",
      tabs: [
        { key: "games", title: "الألعاب والأنشطة التعليمية", body: "145 لعبة ومورد تعليمي جاهز للتشغيل في 10 مجالات مهارية، تُفتح داخل الحصة المباشرة.", alt: "مكتبة الألعاب التعليمية مع موارد الفونيكس والحروف وتدريب المعلمين" },
        { key: "calendar", title: "التقويم الأكاديمي", body: "كل حصة وعرض وإجازة وغياب معلم في تقويم واحد بالألوان، فتُكتشف التعارضات قبل وقوعها.", alt: "التقويم الأكاديمي يعرض الحصص المجدولة والعروض والحصص المعاد جدولتها خلال أكتوبر" },
        { key: "ai", title: "مركز القيادة بالذكاء الاصطناعي", body: "اسأل عن التحصيل والطلاب والحصص واحصل على إجابات حية مع قائمة مرتبة بإجراءات المالك.", alt: "مركز القيادة بالذكاء الاصطناعي مع مساعد أعمال ومتابعات الطلاب وتوقعات مالية" },
      ],
    },
    video: { eyebrow: "شاهده يعمل", heading: "جولة من 13 دقيقة في المنصة.", sub: "الجدولة والبوابات والتقارير، مسجّلة من المنتج الفعلي." },
    metrics: [
      { to: 8, label: "بوابات حسب الدور" },
      { to: 145, label: "لعبة ومورد تعليمي" },
      { to: 24, suffix: "/7", label: "تذكيرات رسوم آلية" },
      { to: 1, label: "تسجيل دخول للجميع" },
    ],
    security: {
      eyebrow: "الأمان والثقة",
      heading: "مصمّم لحماية بيانات الأطفال.",
      sub: "الوصول والمدفوعات والخصوصية مصمّمة من البداية، لا تُضاف لاحقًا.",
      items: [
        { title: "وصول حسب الدور", body: "يرى المعلمون وأولياء الأمور والطلاب والموظفون ما يسمح به دورهم فقط." },
        { title: "مدفوعات عبر بوابات الدفع", body: "تُحصَّل الرسوم عبر Razorpay أو Cashfree، وتُدخَل بيانات البطاقة لدى البوابة." },
        { title: "خصوصية للعائلات", body: "قواعد واضحة للتسجيلات والاحتفاظ ومعلومات الأطفال، بنهج يضع ولي الأمر أولًا." },
      ],
      note: "لا ننشر حتى الآن شهادات امتثال رسمية. اسألنا وسنشرح إعداد الأمان لدينا في مكالمة.",
      terms: "شروط الخدمة",
      privacy: "سياسة الخصوصية",
    },
    pricing: {
      eyebrow: "الأسعار",
      heading: "سعر واحد بسيط لكل مركز.",
      sub: "وليس لكل طالب. ادفع شهريًا أو سنويًا، وغيّر خطتك متى نمت.",
      from: "الخطط من",
      perMonth: "شهريًا",
      cta: "شاهد كل الخطط",
      points: ["الحصص المباشرة والقبول وتحصيل الرسوم مشمولة", "تطبيق أولياء الأمور مشمول", "هويتك التجارية الخاصة"],
    },
    faq: {
      eyebrow: "الأسئلة الشائعة",
      heading: "أسئلة تطرحها مراكز التدريب قبل التحويل.",
      items: [
        { q: "هل هذه مجرد أداة اتصال مرئي أخرى؟", a: "لا. الفصل المباشر جزء واحد منها. الجدولة والقبول والفوترة والتقارير في النظام نفسه، فترتبط الحصة مباشرة بالحضور والفواتير والتقارير." },
        { q: "هل تناسب حصص العداد أو الفونيكس؟", a: "نعم. صُممت للحصص الصغيرة والفردية عبر الإنترنت، مع مكتبة من 145 لعبة ومورد تشمل أنشطة الفونيكس والعداد." },
        { q: "كم من الوقت يمكن للعائلات مشاهدة تسجيل الحصة؟", a: "تبقى التسجيلات متاحة طوال مدة الاحتفاظ في خطتك، من التطبيق نفسه الذي تستخدمه العائلات للجدول والرسوم." },
        { q: "ماذا يحدث عند تأخر الرسوم؟", a: "تُنشأ الفواتير تلقائيًا وتُرسل التذكيرات. قد يتوقف الوصول عند تأخر الدفع ويعود فور دفع العائلة دون متابعة يدوية." },
        { q: "هل العرض التجريبي مجاني فعلًا؟", a: "نعم. احجز حصة تجريبية مجانية دون بيانات دفع. سنطابقك مع معلم ونرسل رابط الانضمام بالبريد." },
        { q: "كيف تُسعَّر الخدمة؟", a: "سعر واحد لكل مركز حسب الخطة، وليس لكل طالب. راجع صفحة الأسعار للخطط والحدود الحالية." },
      ],
    },
    cta: { heading: "أتمت عملك. ادخل العصر الجديد.", sub: "احجز عرضًا مجانيًا. دون بيانات دفع ودون التزام.", demo: "احجز عرضًا مجانيًا", ask: "اسأل مساعدنا الذكي", signIn: "عميل حالي؟ سجّل الدخول" },
    footer: {
      tagline: "تدريس مباشر وقبول وفوترة وتقارير في منصة واحدة لمراكز التدريب عبر الإنترنت والأكاديميات والمدرّسين.",
      careers: "الوظائف", customers: "العملاء",
      company: "ابدأ", legal: "قانوني", contact: "تواصل", whatsapp: "راسلنا على واتساب",
      terms: "شروط الخدمة", privacy: "سياسة الخصوصية", clientFinder: "سياسة Client Finder", portals: "استكشف البوابات", blog: "المدونة", pricing: "الأسعار", signIn: "تسجيل الدخول", demo: "احجز عرضًا مجانيًا",
      rights: (year) => `© ${year} Meet to Manage. جميع الحقوق محفوظة.`,
    },
  },
};
