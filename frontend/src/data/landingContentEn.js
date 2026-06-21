/**
 * landingContentEn.js — English translation of the public landing page content.
 *
 * This is the EN sibling of landingContent.js (the Arabic source of truth).
 * It keeps the EXACT same structure, keys, nesting, slugs, icon keys, colors,
 * numbers, phone numbers, and URLs — only the human-readable display text is
 * translated to English. Used by the upcoming AR/EN bilingual toggle.
 *
 * NOTE: To keep the EN page fully English, every display field whose value is
 * Arabic in the source has been replaced with its English equivalent here.
 * Field NAMES are never changed (e.g. nameAr / nameArFull still exist, but
 * carry English text in this file). Already-English fields in the source
 * (nameEn, nameEnFull, taglineEn, audienceEn, specialty, tags, etc.) and all
 * non-text values (ids, iconKey, color/gradient/ring, score objects, numbers,
 * whatsappNumber, phones, hex/urls, booleans, isText) are kept identical.
 * ─────────────────────────────────────────────────────────────────────────
 */

const landingContentEn = {
  /* ── Brand ── */
  brand: {
    nameAr: 'Alawael Centers',
    nameArFull: 'Alawael Centers for Care and Rehabilitation',
    nameEn: 'Alawael',
    nameEnFull: 'Alawael Centers For Rehabilitation',
    tagline: 'Special Care for Special Abilities',
    taglineEn: 'Special Care for Special Abilities',
    logoSrc: '/alawael-logo.svg', // public/alawael-logo.svg
    foundedHijri: 1419,
    foundedGregorian: 1998,
  },

  /* ── Navigation links ── */
  nav: [
    { id: 'hero', label: 'Home' },
    { id: 'about', label: 'About Us' },
    { id: 'services', label: 'Our Services' },
    { id: 'programs', label: 'Our Programs' },
    { id: 'branches', label: 'Our Branches' },
    { id: 'why-us', label: 'Why Alawael' },
    { id: 'stats', label: 'Our Achievements' },
    { id: 'testimonials', label: 'Parent Reviews' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contact Us' },
  ],

  /* ── Hero ── */
  hero: {
    badge: 'Licensed by the Ministry of Human Resources and Social Development',
    titleBefore: 'We care for our children with',
    titleRotating: ['intellectual disability', 'autism spectrum disorder', 'learning difficulties', 'special needs'],
    titleAfter: 'with dedication and expertise since 1419 AH',
    subtitle:
      'A leading center for the rehabilitation of children and young people with intellectual disability and autism spectrum disorder in Riyadh — a safe environment, a specialized team, and evidence-based programs for over 25 years.',
    primaryCta: { label: 'Register a Beneficiary', to: '/register' },
    secondaryCta: { label: 'Explore Our Programs', anchor: '#programs' },
    keyPoints: [
      'Two daily sessions — morning and evening',
      'Transport service to every district in Riyadh',
      'Specialized early-intervention programs',
    ],
  },

  /* ── About ── */
  about: {
    title: 'About Us',
    eyebrow: 'Alawael Center for Care and Rehabilitation',
    lead: 'Alawael Center was founded in 1419 AH as one of the first centers specialized in the rehabilitation of intellectual disability cases in Riyadh. Since then, we have worked with dedication to provide comprehensive care that blends scientific rigor with a deeply human touch.',
    paragraphs: [
      'We deliver our services through four branches across Riyadh — for boys and girls — with a team of more than 400 specialists across a wide range of medical, rehabilitative, and educational fields.',
      'Over 25 years of work, we have served more than 8,000 beneficiaries, committed to the highest international standards of care and to individualized rehabilitation plans.',
    ],
    vision: {
      title: 'Our Vision',
      text: 'To be the first and best choice in providing care and rehabilitation services for people with special needs across the Kingdom of Saudi Arabia.',
    },
    mission: {
      title: 'Our Mission',
      text: 'To deliver rehabilitation services to world-class standards, built on carefully studied individual plans that improve our beneficiaries’ quality of life and support their inclusion in society.',
    },
    values: [
      { icon: '🤝', iconKey: 'heart', title: 'Compassion', desc: 'Care that comes from the heart, first and foremost' },
      {
        icon: '🎯',
        iconKey: 'academic-cap',
        title: 'Specialization',
        desc: 'A scientifically qualified team in every field',
      },
      { icon: '🌟', iconKey: 'star', title: 'Excellence', desc: 'World-class standards across all our services' },
      {
        icon: '🛡️',
        iconKey: 'shield-check',
        title: 'Safety',
        desc: 'A safe environment monitored around the clock',
      },
    ],
  },

  /* ── Services (system/center capabilities) ── */
  services: [
    {
      id: 'early-intervention',
      iconKey: 'rehab',
      title: 'Early Intervention',
      desc: 'Specialized programs for children from age two to build core skills before entering the educational setting, using a rigorous, evidence-based methodology.',
      color: 'from-primary-600 to-primary-800',
      ring: 'ring-primary-500/20',
    },
    {
      id: 'autism-rehab',
      iconKey: 'education',
      title: 'Autism Spectrum Rehabilitation',
      desc: 'ABA, TEACCH, PECS, and sensory integration programs — supervised by certified specialists, with an individual plan (IEP) for every case.',
      color: 'from-accent-500 to-accent-700',
      ring: 'ring-accent-500/20',
    },
    {
      id: 'psychological',
      iconKey: 'hr',
      title: 'Psychological & Behavioral Therapy',
      desc: 'Cognitive behavioral therapy sessions and individual and group behavior modification, with precise tracking of progress and outcome indicators.',
      color: 'from-green-600 to-green-800',
      ring: 'ring-green-500/20',
    },
    {
      id: 'speech-lang',
      iconKey: 'reports',
      title: 'Speech & Language Therapy',
      desc: 'Assessment and treatment of speech disorders, expressive and receptive language, and alternative communication (AAC) when needed.',
      color: 'from-primary-600 to-primary-800',
      ring: 'ring-primary-500/20',
    },
    {
      id: 'occupational',
      iconKey: 'admin',
      title: 'Occupational & Sensory Therapy',
      desc: 'Developing fine motor skills, independence in daily living activities, and sensory integration.',
      color: 'from-accent-500 to-accent-700',
      ring: 'ring-accent-500/20',
    },
    {
      id: 'recreational',
      iconKey: 'finance',
      title: 'Recreational & Social Activities',
      desc: 'Thoughtfully designed recreational programs, educational trips, and regular events that strengthen social interaction and a child’s self-confidence.',
      color: 'from-green-600 to-green-800',
      ring: 'ring-green-500/20',
    },
  ],

  /* ── Platform / ERP features (digital system showcase) ── */
  platformFeatures: {
    title: 'Our Integrated Digital System',
    subtitle:
      'An advanced technology platform that connects the rehabilitation team, parents, and management in one seamless experience',
    items: [
      {
        title: 'Smart Individualized Education Plans (IEP)',
        desc: 'Build and track a rehabilitation plan for each beneficiary, with measurable goals and automatic progress updates.',
        icon: '📋',
        iconKey: 'clipboard-document',
        badge: 'For the rehabilitation team',
      },
      {
        title: 'Parent Portal',
        desc: 'A mobile app where parents follow their child’s progress, attendance, weekly reports, and communicate with specialists.',
        icon: '📱',
        iconKey: 'device-phone',
        badge: 'For parents',
      },
      {
        title: 'Digital Sessions',
        desc: 'Record the results of every session with notes, ABC ratings, and achievement levels using tools that make it easy for the specialist.',
        icon: '🎯',
        iconKey: 'target',
        badge: 'For the rehabilitation team',
      },
      {
        title: 'Telehealth',
        desc: 'Secure video sessions for families who live far away, with session recording and follow-up documentation.',
        icon: '📹',
        iconKey: 'video-camera',
        badge: 'Innovative',
      },
      {
        title: 'Goal Bank',
        desc: '200+ internationally recognized rehabilitation goals across 13 domains — builds an IEP in minutes instead of days.',
        icon: '🎯',
        iconKey: 'light-bulb',
        badge: 'Artificial intelligence',
      },
      {
        title: 'Automatic Quarterly Reports',
        desc: 'Polished progress reports generated automatically from session data, ready to print and share.',
        icon: '📊',
        iconKey: 'chart-bar',
        badge: 'Automation',
      },
      {
        title: 'Early Warning System',
        desc: 'Smart alerts on plateau, regression, or declining attendance — enabling immediate action before the opportunity is lost.',
        icon: '⚡',
        iconKey: 'bolt',
        badge: 'Smart alerts',
      },
      {
        title: 'Multi-Branch Management',
        desc: 'A unified view of all branches, permission management, and secure data sharing between headquarters and the branches.',
        icon: '🏢',
        iconKey: 'building-office',
        badge: 'For management',
      },
    ],
  },

  /* ── Team (specialist profiles) ── */
  team: {
    title: 'Our Specialist Team',
    subtitle: 'A select group of specialists holding international certifications in rehabilitation and special education',
    items: [
      {
        name: 'Dr. Sarah Al-Ahmadi',
        role: 'Speech & Language Rehabilitation Consultant',
        specialty: 'Speech-Language Pathology',
        badge: 'ASHA Certified',
        color: 'from-primary-600 to-primary-800',
        icon: '👩‍⚕️',
        iconKey: 'user-circle',
      },
      {
        name: 'Mr. Mohammed Al-Ghamdi',
        role: 'Applied Behavior Analysis Specialist',
        specialty: 'Applied Behavior Analysis',
        badge: 'BCBA',
        color: 'from-accent-500 to-accent-700',
        icon: '👨‍⚕️',
        iconKey: 'user-circle',
      },
      {
        name: 'Dr. Noura Al-Qahtani',
        role: 'Occupational Therapy Consultant',
        specialty: 'Occupational Therapy',
        badge: '15+ years of experience',
        color: 'from-green-600 to-green-800',
        icon: '👩‍⚕️',
        iconKey: 'user-circle',
      },
      {
        name: 'Mr. Abdullah Al-Harbi',
        role: 'Special Education Specialist',
        specialty: 'Special Education (Autism)',
        badge: "Master's Degree",
        color: 'from-primary-600 to-primary-800',
        icon: '👨‍🏫',
        iconKey: 'user-circle',
      },
      {
        name: 'Dr. Reem Al-Suhali',
        role: 'Clinical Psychology Consultant',
        specialty: 'Clinical Psychology',
        badge: 'PhD · SCFHS',
        color: 'from-accent-500 to-accent-700',
        icon: '👩‍⚕️',
        iconKey: 'user-circle',
      },
      {
        name: 'Mr. Fahd Al-Dosari',
        role: 'Pediatric Physical Therapy Specialist',
        specialty: 'Pediatric Physical Therapy',
        badge: 'APTA Member',
        color: 'from-green-600 to-green-800',
        icon: '👨‍⚕️',
        iconKey: 'user-circle',
      },
    ],
  },

  /* ── Appointment booking ── */
  appointment: {
    title: 'Book a Free Assessment Visit',
    subtitle: 'One step begins the journey of change for your son or daughter — we respond within 24 hours',
    whatsappNumber: '966535242200', // E.164 without +
    whatsappTemplate: 'Hello — I would like to book an assessment visit at Alawael Centers. Details: ',
    formFields: {
      parentName: 'Parent’s Name',
      parentPhone: 'Mobile Number',
      childName: 'Child’s Name',
      childAge: 'Child’s Age (years)',
      conditionType: 'Type of Condition',
      branchPreference: 'Preferred Branch',
      preferredTime: 'Preferred Session',
      notes: 'Additional Notes (optional)',
    },
    conditions: [
      'Intellectual disability',
      'Autism spectrum disorder',
      'Down syndrome',
      'Learning difficulties',
      'Developmental delay',
      'ADHD',
      'Speech and language delay',
      'Not sure — I need an assessment',
    ],
    timeSlots: ['Morning (7:30 AM - 12:30 PM)', 'Evening (3:00 PM - 8:00 PM)', 'Any time that works'],
  },

  /* ── Self-assessment quiz ── */
  quiz: {
    title: 'Which Program Is Right for Your Child?',
    subtitle:
      'Answer 6 quick questions and we’ll suggest the most suitable rehabilitation program for you — free and in under two minutes',
    ctaStart: 'Start the Assessment',
    ctaRetake: 'Retake the Assessment',
    ctaBook: 'Book an Assessment Visit',
    ctaContinue: 'Next',
    ctaBack: 'Back',
    questions: [
      {
        id: 'age',
        label: 'How old is your child now?',
        options: [
          { value: '0-2', label: 'Under two years', score: { 'early-intervention': 5 } },
          {
            value: '2-6',
            label: '2 - 6 years',
            score: { 'early-intervention': 5, 'autism-rehab': 3, 'speech-lang': 3 },
          },
          {
            value: '6-12',
            label: '6 - 12 years',
            score: { 'autism-rehab': 4, 'speech-lang': 3, occupational: 3, psychological: 3 },
          },
          { value: '12+', label: 'Older than 12 years', score: { psychological: 4, occupational: 3 } },
        ],
      },
      {
        id: 'primaryConcern',
        label: 'What concerns you most about your child’s development?',
        options: [
          { value: 'speech', label: 'Delay in speech and language', score: { 'speech-lang': 6 } },
          {
            value: 'social',
            label: 'Weak social communication',
            score: { 'autism-rehab': 5, psychological: 2 },
          },
          {
            value: 'behavior',
            label: 'Challenging or repetitive behaviors',
            score: { 'autism-rehab': 3, psychological: 5 },
          },
          {
            value: 'motor',
            label: 'Delay in motor skills',
            score: { occupational: 6, 'early-intervention': 2 },
          },
          {
            value: 'learning',
            label: 'Difficulties with learning and comprehension',
            score: { 'autism-rehab': 2, 'early-intervention': 3, occupational: 2 },
          },
          {
            value: 'multiple',
            label: 'More than one area — I need a comprehensive assessment',
            score: { 'early-intervention': 3, 'autism-rehab': 3, psychological: 2 },
          },
        ],
      },
      {
        id: 'diagnosis',
        label: 'Has your child received a formal diagnosis?',
        options: [
          { value: 'autism', label: 'Yes — autism spectrum disorder', score: { 'autism-rehab': 6 } },
          {
            value: 'intellectual',
            label: 'Yes — intellectual disability',
            score: { 'early-intervention': 4, psychological: 3 },
          },
          {
            value: 'down',
            label: 'Yes — Down syndrome',
            score: { 'early-intervention': 4, 'speech-lang': 3, occupational: 3 },
          },
          {
            value: 'adhd',
            label: 'Yes — ADHD (attention deficit hyperactivity)',
            score: { psychological: 5, occupational: 2 },
          },
          {
            value: 'none',
            label: 'No — not yet diagnosed',
            score: { 'early-intervention': 3, psychological: 2 },
          },
        ],
      },
      {
        id: 'communication',
        label: 'How does your child communicate with those around them?',
        options: [
          {
            value: 'none',
            label: 'Does not speak or uses very few words',
            score: { 'speech-lang': 5, 'autism-rehab': 3, 'early-intervention': 3 },
          },
          {
            value: 'limited',
            label: 'Single words — does not form sentences',
            score: { 'speech-lang': 5, 'autism-rehab': 2 },
          },
          {
            value: 'sentences',
            label: 'Short sentences — but sometimes hard to understand',
            score: { 'speech-lang': 3, psychological: 2 },
          },
          {
            value: 'full',
            label: 'Speaks well — the issue is not with language',
            score: { psychological: 3, occupational: 3 },
          },
        ],
      },
      {
        id: 'selfCare',
        label: 'How independent is your child in daily activities?',
        options: [
          {
            value: 'needs-help',
            label: 'Needs help with everything (eating/dressing/bathroom)',
            score: { occupational: 5, 'early-intervention': 3 },
          },
          { value: 'some', label: 'Manages some things on their own', score: { occupational: 3 } },
          { value: 'most', label: 'Independent in most daily skills', score: { psychological: 2 } },
        ],
      },
      {
        id: 'preferredAudience',
        label: 'Your child’s gender?',
        options: [
          { value: 'female', label: 'Girl' },
          { value: 'male', label: 'Boy' },
        ],
      },
    ],
    // Human-readable recommendation per service id (from content.services).
    recommendations: {
      'early-intervention': {
        title: 'Early Intervention Program',
        why: 'We recommend this program because your child’s age and circumstances make early intervention the most impactful way to accelerate development before starting school.',
        color: 'from-primary-600 to-primary-800',
        icon: '🌱',
        iconKey: 'sparkles',
      },
      'autism-rehab': {
        title: 'Autism Spectrum Rehabilitation Program',
        why: 'The pattern of your answers aligns with the ABA / PECS / TEACCH programs we offer through a team of certified specialists.',
        color: 'from-accent-500 to-accent-700',
        icon: '🧩',
        iconKey: 'puzzle-piece',
      },
      psychological: {
        title: 'Psychological & Behavioral Therapy Program',
        why: 'The greatest need appears to be in the behavioral and emotional area — behavior modification sessions and cognitive therapy would be the best starting point.',
        color: 'from-green-600 to-green-800',
        icon: '💙',
        iconKey: 'heart',
      },
      'speech-lang': {
        title: 'Speech & Language Therapy Program',
        why: 'Your answers indicate that the focus of intervention should be language and communication — we provide ASHA-certified speech therapists.',
        color: 'from-primary-600 to-primary-800',
        icon: '🗣️',
        iconKey: 'chat-bubble',
      },
      occupational: {
        title: 'Occupational & Sensory Therapy Program',
        why: 'The motor area and independence in daily activities are the focus of the recommended rehabilitation plan.',
        color: 'from-accent-500 to-accent-700',
        icon: '🖐️',
        iconKey: 'hand-raised',
      },
      recreational: {
        title: 'Recreational & Social Programs',
        why: 'Your child can benefit from thoughtfully designed social and recreational programs that build confidence and strengthen interaction.',
        color: 'from-green-600 to-green-800',
        icon: '🎨',
        iconKey: 'star',
      },
    },
    // Fallback recommendation shown when no service score dominates.
    fallback: {
      title: 'Comprehensive Multidisciplinary Assessment',
      why: 'Based on your answers, we recommend an initial assessment visit with a multidisciplinary team to build a precise individual plan.',
      color: 'from-slate-600 to-slate-800',
      icon: '🔎',
      iconKey: 'magnifying-glass',
    },
  },

  /* ── Photo gallery ── */
  gallery: {
    title: 'A Tour Inside the Center',
    subtitle: 'Environments designed specifically for our beneficiaries’ comfort and an effective rehabilitation experience',
    categories: [
      { id: 'all', label: 'All' },
      { id: 'therapy', label: 'Therapy Rooms' },
      { id: 'sensory', label: 'Sensory Integration' },
      { id: 'play', label: 'Play Areas' },
      { id: 'outdoor', label: 'Outdoor Activities' },
    ],
    // Each item uses a generated SVG placeholder so the gallery renders
    // before real photos arrive. When real photos land, swap `src` to
    // point at /images/gallery/<filename>.webp — no component changes needed.
    items: [
      {
        id: 1,
        category: 'therapy',
        caption: 'Individual Sessions Room',
        src: 'https://images.unsplash.com/photo-1591391258564-be184031cb21?w=1200&q=70&auto=format&fit=crop',
        gradient: 'from-primary-400 to-primary-600',
        icon: '🪑',
      },
      {
        id: 2,
        category: 'sensory',
        caption: 'Sensory Integration Room',
        gradient: 'from-accent-400 to-accent-600',
        icon: '🌟',
      },
      {
        id: 3,
        category: 'therapy',
        caption: 'Speech & Language Hall',
        gradient: 'from-green-400 to-green-600',
        icon: '🗣️',
      },
      {
        id: 4,
        category: 'play',
        caption: 'Indoor Play Area',
        src: 'https://images.unsplash.com/photo-1763310225537-f7161d5c93e9?w=1200&q=70&auto=format&fit=crop',
        gradient: 'from-primary-400 to-primary-600',
        icon: '🎈',
      },
      {
        id: 5,
        category: 'therapy',
        caption: 'Occupational Therapy Hall',
        gradient: 'from-accent-400 to-accent-600',
        icon: '🖐️',
      },
      {
        id: 6,
        category: 'sensory',
        caption: 'Multi-Sensory Room',
        gradient: 'from-green-400 to-green-600',
        icon: '✨',
      },
      {
        id: 7,
        category: 'outdoor',
        caption: 'Safe Outdoor Courtyard',
        src: 'https://images.unsplash.com/photo-1596997000103-e597b3ca50df?w=1200&q=70&auto=format&fit=crop',
        gradient: 'from-primary-400 to-primary-600',
        icon: '🌳',
      },
      {
        id: 8,
        category: 'play',
        caption: 'Interactive Children’s Library',
        src: 'https://images.unsplash.com/photo-1716324339623-384495f47373?w=1200&q=70&auto=format&fit=crop',
        gradient: 'from-accent-400 to-accent-600',
        icon: '📚',
      },
      {
        id: 9,
        category: 'outdoor',
        caption: 'Motor-Skills Playground',
        src: 'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=1200&q=70&auto=format&fit=crop',
        gradient: 'from-green-400 to-green-600',
        icon: '⚽',
      },
    ],
  },

  /* ── Success stories ── */
  stories: {
    title: 'Real Success Stories',
    subtitle:
      'Stories of children whose lives were transformed through individual rehabilitation plans and a specialized team — names changed at their families’ request',
    items: [
      {
        name: 'Mashael',
        age: 4,
        condition: 'Autism spectrum disorder',
        before: 'She spoke no words, avoided eye contact, and withdrew from other children.',
        after: 'She speaks 50+ words, asks for what she needs, and joins in group play.',
        duration: '8 months',
        program: 'ABA + speech therapy',
        metric: { label: 'New vocabulary', value: 52 },
        color: 'from-primary-600 to-primary-800',
      },
      {
        name: 'Abdulrahman',
        age: 7,
        condition: 'Motor delay + poor focus',
        before: 'Could not tie his shoes or hold a pen, with severe distraction at school.',
        after: 'He writes letters, ties his shoes, and stays on task for 25 minutes.',
        duration: '12 months',
        program: 'Occupational therapy + behavior modification',
        metric: { label: 'Focus duration', value: '25 min', isText: true },
        color: 'from-accent-500 to-accent-700',
      },
      {
        name: 'Layla',
        age: 3,
        condition: 'Down syndrome',
        before: 'She could not walk steadily, needed help eating, and did not make eye contact.',
        after: 'She walks and runs, eats independently, and says two-word sentences.',
        duration: '10 months',
        program: 'Comprehensive early intervention',
        metric: { label: 'New skills', value: 18 },
        color: 'from-green-600 to-green-800',
      },
    ],
  },

  /* ── Awards / certifications ── */
  awards: {
    title: 'Accreditations & Partnerships',
    subtitle: 'We take pride in our commitment to the highest local and international quality standards',
    items: [
      {
        name: 'Ministry of Human Resources',
        detail: 'Licensed rehabilitation center',
        icon: '🏛️',
        iconKey: 'building-library',
      },
      { name: 'Authority for the Care of Persons with Disabilities', detail: 'Registered member', icon: '💙', iconKey: 'heart' },
      {
        name: 'Saudi Commission for Health Specialties (SCFHS)',
        detail: 'Licensed specialists',
        icon: '⚕️',
        iconKey: 'badge-check',
      },
      { name: 'ASHA', detail: 'Internationally certified speech therapists', icon: '🎓', iconKey: 'academic-cap' },
      { name: 'BACB', detail: 'Applied behavior analysts (BCBA)', icon: '📜', iconKey: 'document-text' },
      { name: 'CARF', detail: 'Quality-standards compliant', icon: '🌍', iconKey: 'globe' },
    ],
  },

  /* ── Newsletter ── */
  newsletter: {
    title: 'Stay Informed',
    subtitle:
      'Subscribe for the latest news, awareness events, and tips from our experts — once a month, no spam.',
    placeholderEmail: 'Enter your email address',
    placeholderName: 'Name (optional)',
    ctaSubmit: 'Subscribe',
    ctaSubmitting: 'Subscribing...',
    successMessage: 'You have subscribed successfully — the latest updates will reach you soon.',
    errorMessage: 'We couldn’t complete your subscription — please check your email address.',
    perks: [
      'Tips from specialists in special-needs rehabilitation',
      'Invitations to parent workshops',
      'Latest center news and events',
    ],
  },

  /* ── Comparison ── */
  comparison: {
    title: 'Why Alawael Above the Rest?',
    subtitle: 'A quick comparison between Alawael Centers and other options in the market',
    weLabel: 'Alawael Centers',
    otherLabel: 'Other Centers',
    rows: [
      { feature: '25+ years of experience in the field', us: true, other: 'Often less than 10 years' },
      { feature: 'A team of 400+ certified specialists', us: true, other: 'Smaller, more general teams' },
      { feature: 'Two daily sessions (morning + evening)', us: true, other: 'Usually a single session' },
      { feature: 'Transport service to every district in Riyadh', us: true, other: 'Limited or at extra cost' },
      { feature: 'Digital parent portal and progress tracking', us: true, other: 'Monthly paper reports' },
      { feature: 'International goal bank (200+ goals)', us: true, other: 'General, uncalibrated goals' },
      { feature: '4 specialized branches (for boys and girls)', us: true, other: 'Often one mixed branch' },
      { feature: 'ASHA / BCBA / SCFHS standards', us: true, other: 'Local certifications only' },
      { feature: 'Early warning system to detect regression', us: true, other: 'General periodic follow-up' },
      { feature: 'Remote sessions for families who live far away', us: true, other: 'Not available' },
    ],
  },

  /* ── SEO ── */
  seo: {
    description:
      'Alawael Centers for Care and Rehabilitation — the first choice in Riyadh for the rehabilitation of intellectual disability and autism spectrum disorder. 4 branches, 400+ specialists, 25 years of experience.',
    keywords: [
      'Alawael Centers',
      'Alawael',
      'disability rehabilitation',
      'autism rehabilitation',
      'intellectual disability rehabilitation',
      'Riyadh',
      'early intervention',
      'ABA',
      'IEP',
      'Down syndrome',
    ],
    organizationType: 'MedicalOrganization',
  },

  /* ── Programs (clinical depth details) ── */
  programs: {
    title: 'Our Specialized Programs',
    subtitle: 'Individual rehabilitation plans designed for each beneficiary in line with international standards',
    items: [
      {
        title: 'Intellectual Disability',
        desc: 'Multidisciplinary assessment, an individual rehabilitation plan, and regular progress tracking.',
        icon: '🧠',
        iconKey: 'academic-cap',
        tags: ['IQ Assessment', 'Vineland-III', 'IEP'],
      },
      {
        title: 'Autism Spectrum Disorder',
        desc: 'ABA, PECS, and TEACCH programs — supervised by internationally certified specialists.',
        icon: '🧩',
        iconKey: 'puzzle-piece',
        tags: ['ABA', 'PECS', 'TEACCH', 'DIR'],
      },
      {
        title: 'Down Syndrome',
        desc: 'Developing language, motor skills, and functional independence.',
        icon: '💛',
        iconKey: 'heart',
        tags: ['Speech Therapy', 'Motor Skills', 'Life Skills'],
      },
      {
        title: 'Learning Difficulties',
        desc: 'Individual academic support in reading, writing, and mathematics.',
        icon: '📚',
        iconKey: 'book-open',
        tags: ['Reading', 'Writing', 'Math'],
      },
      {
        title: 'ADHD (Attention Deficit Hyperactivity Disorder)',
        desc: 'Behavior regulation, improved focus, and self-management strategies.',
        icon: '⚡',
        iconKey: 'bolt',
        tags: ['Behavior', 'Focus', 'Self-Reg'],
      },
      {
        title: 'Developmental Delay',
        desc: 'Comprehensive early intervention across motor, cognitive, and language domains.',
        icon: '🌱',
        iconKey: 'sparkles',
        tags: ['Early Intervention', 'Developmental Milestones'],
      },
    ],
  },

  /* ── Statistics ── */
  stats: [
    {
      value: 25,
      suffix: '+',
      label: 'years of experience',
      icon: '📅',
      iconKey: 'calendar',
      gradient: 'from-primary-400/20 to-primary-400/5',
    },
    {
      value: 4,
      suffix: '',
      label: 'branches in Riyadh',
      icon: '🏢',
      iconKey: 'building-office',
      gradient: 'from-accent-400/20 to-accent-400/5',
    },
    {
      value: 400,
      suffix: '+',
      label: 'specialists and professionals',
      icon: '👨‍⚕️',
      iconKey: 'users',
      gradient: 'from-green-400/20 to-green-400/5',
    },
    {
      value: 8000,
      suffix: '+',
      label: 'beneficiaries served',
      icon: '👥',
      iconKey: 'user-group',
      gradient: 'from-primary-400/20 to-primary-400/5',
    },
  ],

  /* ── Branches ── */
  branches: {
    title: 'Our Branches in Riyadh',
    subtitle: 'Four specialized branches — for boys and girls — across various districts of Riyadh',
    items: [
      {
        name: 'Al-Mughrizat Branch',
        audience: 'Girls',
        audienceEn: 'Girls',
        city: 'Riyadh',
        district: 'Al-Mughrizat District',
        address: 'Al-Mughrizat District, Riyadh',
        phone: '0112633172',
        phoneDisplay: '011-263-3172',
        accentColor: 'from-primary-600 to-primary-800',
        icon: '👧',
        iconKey: 'map-pin',
      },
      {
        name: 'Granada Branch',
        audience: 'Boys',
        audienceEn: 'Boys',
        city: 'Riyadh',
        district: 'Granada District',
        address: 'Granada District, Riyadh',
        phone: '0114295515',
        phoneDisplay: '011-429-5515',
        accentColor: 'from-accent-500 to-accent-700',
        icon: '👦',
        iconKey: 'map-pin',
      },
      {
        name: 'Al-Shifa Branch',
        audience: 'Boys',
        audienceEn: 'Boys',
        city: 'Riyadh',
        district: 'Al-Shifa District',
        address: 'Al-Shifa District, Riyadh',
        phone: '0114220038',
        phoneDisplay: '011-422-0038',
        accentColor: 'from-green-600 to-green-800',
        icon: '👦',
        iconKey: 'map-pin',
      },
      {
        name: 'Al-Andalus Branch',
        audience: 'Boys',
        audienceEn: 'Boys',
        city: 'Riyadh',
        district: 'Al-Andalus District',
        address: 'Al-Andalus District, Riyadh',
        phone: '0114414415',
        phoneSecondary: '0114414412',
        phoneDisplay: '011-441-4415',
        accentColor: 'from-primary-600 to-primary-800',
        icon: '👦',
        iconKey: 'map-pin',
      },
    ],
  },

  /* ── Testimonials ── */
  testimonials: [
    {
      name: 'Umm Abdullah',
      role: 'Parent — Al-Mughrizat Branch',
      text: 'After just one year in the early-intervention program, I saw tangible progress in my daughter’s communication and language skills. The team treats the children with genuine love.',
      avatar: '👩',
      rating: 5,
    },
    {
      name: 'Abu Mohammed',
      role: 'Parent — Al-Andalus Branch',
      text: 'Alawael Center has served us for more than 10 years. The continuity, professionalism, and human care are priceless — I recommend it to every family in a similar situation.',
      avatar: '👨',
      rating: 5,
    },
    {
      name: 'Dr. Sarah Al-Mohammadi',
      role: 'Pediatrics Consultant',
      text: 'I refer cases of intellectual disability and autism spectrum disorder to them with confidence. Their early-intervention results are notable and backed by clear, regular reports.',
      avatar: '👩‍⚕️',
      rating: 5,
    },
    {
      name: 'Umm Faisal',
      role: 'Parent — Al-Shifa Branch',
      text: 'The transport service freed us from the daily worry of commuting. And the morning and evening sessions suit every family’s circumstances — thank you to everyone at the center.',
      avatar: '👩',
      rating: 5,
    },
    {
      name: 'Abu Rayan',
      role: 'Parent — Granada Branch',
      text: 'Today my son reads, writes, and relies on himself in many things — thanks to God and then to the efforts of the rehabilitation team at the center.',
      avatar: '👨',
      rating: 5,
    },
  ],

  /* ── Why us ── */
  whyUs: [
    {
      icon: '🏆',
      iconKey: 'trophy',
      title: '25 years of proven experience',
      desc: 'One of the first centers specialized in the rehabilitation of intellectual disability in Riyadh',
    },
    {
      icon: '👨‍⚕️',
      iconKey: 'users',
      title: 'A multidisciplinary team',
      desc: 'More than 400 specialists across a range of medical and rehabilitation fields',
    },
    {
      icon: '📋',
      iconKey: 'clipboard-document',
      title: 'Individual plans (IEP)',
      desc: 'A rehabilitation plan designed specifically for each beneficiary based on a multidisciplinary assessment',
    },
    {
      icon: '⏰',
      iconKey: 'clock',
      title: 'Two daily sessions',
      desc: 'The flexibility to choose between the morning and evening sessions according to the family’s circumstances',
    },
    {
      icon: '🚐',
      iconKey: 'truck',
      title: 'Comprehensive transport service',
      desc: 'Pickup and drop-off to and from every district in Riyadh with equipped, safe buses',
    },
    {
      icon: '📊',
      iconKey: 'chart-bar',
      title: 'Digital follow-up for parents',
      desc: 'An online platform to follow the beneficiary’s progress with transparent regular reports',
    },
  ],

  /* ── How it works ── */
  howItWorks: {
    title: 'The Beneficiary’s Journey With Us',
    subtitle: 'From the first visit to achieving rehabilitation goals — clear, considered steps',
    steps: [
      {
        step: 1,
        title: 'Initial Assessment',
        desc: 'A comprehensive assessment session by a multidisciplinary team to identify needs',
        icon: '🔎',
        iconKey: 'magnifying-glass',
        color: 'from-primary-600 to-primary-800',
      },
      {
        step: 2,
        title: 'The Individual Plan',
        desc: 'Preparing a customized rehabilitation plan (IEP) with measurable goals',
        icon: '📝',
        iconKey: 'pencil-square',
        color: 'from-accent-500 to-accent-700',
      },
      {
        step: 3,
        title: 'Delivery & Follow-Up',
        desc: 'Daily and weekly sessions with regular progress reports for the parent',
        icon: '🎯',
        iconKey: 'target',
        color: 'from-green-600 to-green-800',
      },
      {
        step: 4,
        title: 'Periodic Review',
        desc: 'A review every 3 months and adjustment of the plan based on the progress achieved',
        icon: '📈',
        iconKey: 'arrow-trending-up',
        color: 'from-primary-600 to-primary-800',
      },
    ],
  },

  /* ── FAQ ── */
  faq: [
    {
      q: 'What is the admission age at the centers?',
      a: 'We accept cases from age two and above. Early-intervention programs are available for ages 2–6, and rehabilitation programs are available for all ages after that, depending on the type of disability.',
    },
    {
      q: 'Is transport service available?',
      a: 'Yes — transport service is available to every district in Riyadh with dedicated, equipped buses, with a trained chaperone on board each bus.',
    },
    {
      q: 'What is the difference between the morning and evening sessions?',
      a: 'The programs in both sessions are identical in rehabilitation content and supervising staff. The choice depends on the family’s circumstances and what suits the beneficiary.',
    },
    {
      q: 'How is a new case admitted?',
      a: 'The journey begins with an initial assessment visit (by prior appointment) — followed by a meeting with the specialist team to set an individual rehabilitation plan, then joining the appropriate program.',
    },
    {
      q: 'Is there follow-up for the parent?',
      a: 'Yes — we provide regular reports (weekly and monthly) on the beneficiary’s progress, and quarterly meetings with the rehabilitation team to review the goals and plan.',
    },
    {
      q: 'What types of disabilities does the center accept?',
      a: 'Intellectual disability at its various levels, autism spectrum disorder, Down syndrome, learning difficulties, ADHD, and developmental delay.',
    },
  ],

  /* ── Trusted by / partners ── */
  trustedBy: [
    'Ministry of Human Resources and Social Development',
    'Education and Training Evaluation Commission',
    'Ministry of Health',
    'Authority for the Care of Persons with Disabilities',
    'Health Care Authority',
    'General Organization for Social Insurance',
  ],

  /* ── Contact ── */
  contact: {
    title: 'Contact Us',
    subtitle: 'Our team is ready to answer your questions and schedule an assessment visit',
    mainAddress: 'Intersection of Othman bin Affan Road and King Abdullah Road, Riyadh',
    mainPhone: '+966535242200',
    mainPhoneDisplay: '0535242200',
    email: 'info@awael.sa',
    workingHours: 'Sunday – Thursday | Morning: 7:30 AM – 12:30 PM | Evening: 3:00 PM – 8:00 PM',
    social: [
      { platform: 'twitter', label: 'Twitter', url: 'https://twitter.com/' },
      { platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/' },
      { platform: 'facebook', label: 'Facebook', url: 'https://facebook.com/' },
    ],
    website: 'https://awael.sa',
  },

  /* ── CTA section ── */
  cta: {
    title: 'Start the Rehabilitation Journey With Us Today',
    subtitle:
      'Book an initial assessment visit — one step that changes the life of someone you love. Our team will contact you within 24 hours.',
    primary: { label: 'Book an Assessment Visit', to: '/register' },
    secondary: { label: 'Call Us Now', tel: '+966535242200' },
  },

  /* ── Footer ── */
  footer: {
    description:
      'Alawael Centers for Care and Rehabilitation — one of the first centers specialized in the rehabilitation of intellectual disability and autism spectrum disorder in the Kingdom of Saudi Arabia.',
    columns: [
      {
        title: 'The Center',
        links: [
          { label: 'About Us', anchor: '#about' },
          { label: 'Our Programs', anchor: '#programs' },
          { label: 'Our Branches', anchor: '#branches' },
          { label: 'Careers', href: '/careers' },
        ],
      },
      {
        title: 'Useful Links',
        links: [
          { label: 'FAQ', anchor: '#faq' },
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms & Conditions', href: '/terms' },
          { label: 'Contact Us', anchor: '#contact' },
        ],
      },
    ],
    copyright:
      '© {year} Alawael Centers for Care and Rehabilitation — All rights reserved — Commercial registration licensed by the Ministry of Human Resources and Social Development',
  },
};

export default landingContentEn;
