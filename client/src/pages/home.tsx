import { Link } from "wouter";
import { BookOpen, Globe, Newspaper, Scale, Image, Sparkles, Zap, FileText, BarChart3, Brain, Search, ArrowRight, CheckCircle2, ChevronDown, Library } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

const tracks = [
  {
    title: "Monolingual",
    description: "Corpus stats, keywords, collocations, concordance & AI analysis",
    features: ["Word frequency", "N-grams", "KWIC concordance", "Stop list manager", "Word cloud"],
    icon: BookOpen,
    href: "/monolingual",
    color: "#6366f1",
    colorEnd: "#818cf8",
    bgFrom: "from-indigo-500",
    bgTo: "to-blue-500",
    glowColor: "rgba(99, 102, 241, 0.35)",
  },
  {
    title: "Bilingual",
    description: "Parallel alignment, translation strategies, universals & TMX export",
    features: ["Sentence alignment", "Back-translation", "Strategy labeling", "Glossary builder", "TMX export"],
    icon: Globe,
    href: "/bilingual",
    color: "#0d9488",
    colorEnd: "#14b8a6",
    bgFrom: "from-teal-500",
    bgTo: "to-emerald-500",
    glowColor: "rgba(20, 184, 166, 0.35)",
  },
  {
    title: "Web Scraper",
    description: "Scrape, clean & edit web articles, then feed into analysis",
    features: ["Multi-URL scraping", "Content editing", "Auto-analysis", "Word cloud", "Full reports"],
    icon: Newspaper,
    href: "/scraper",
    color: "#f59e0b",
    colorEnd: "#fbbf24",
    bgFrom: "from-amber-500",
    bgTo: "to-orange-500",
    glowColor: "rgba(245, 158, 11, 0.35)",
  },
  {
    title: "Compare",
    description: "Side-by-side comparison of two corpora with stats, keywords & AI analysis",
    features: ["Dual upload", "Stats comparison", "Keyword overlap", "Word clouds", "AI comparison"],
    icon: Scale,
    href: "/compare",
    color: "#7c3aed",
    colorEnd: "#a78bfa",
    bgFrom: "from-violet-500",
    bgTo: "to-purple-500",
    glowColor: "rgba(124, 58, 237, 0.35)",
  },
  {
    title: "Figure Maker",
    description: "Create publication-ready charts & figures with academic formatting & multi-format export",
    features: ["12 chart types", "42 color palettes", "AI data parsing", "Academic formats", "PNG/PDF/Word"],
    icon: Image,
    href: "/figures",
    color: "#e11d48",
    colorEnd: "#fb7185",
    bgFrom: "from-rose-500",
    bgTo: "to-pink-500",
    glowColor: "rgba(225, 29, 72, 0.35)",
  },
  {
    title: "Corpus Library",
    description: "Browse, save & reload corpora — built-in datasets, external collections & your own saved work",
    features: ["30+ datasets", "Save & reload", "Full preview", "One-click analysis", "Bilingual & mono"],
    icon: Library,
    href: "/library",
    color: "#0891b2",
    colorEnd: "#22d3ee",
    bgFrom: "from-cyan-600",
    bgTo: "to-sky-400",
    glowColor: "rgba(8, 145, 178, 0.35)",
  },
];

const capabilities = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "31 specialized AI analyses powered by Gemini, from domain classification to comparative metrics",
    iconBg: "bg-[rgba(92,255,200,0.1)] dark:bg-[rgba(92,255,200,0.08)]",
    iconColor: "text-teal-400 dark:text-emerald-300",
  },
  {
    icon: FileText,
    title: "Multi-Format Support",
    description: "Upload TXT, DOCX, PDF, Excel files — or scrape directly from the web",
    iconBg: "bg-[rgba(91,141,239,0.1)] dark:bg-[rgba(91,141,239,0.08)]",
    iconColor: "text-indigo-500 dark:text-indigo-300",
  },
  {
    icon: BarChart3,
    title: "Publication-Ready Output",
    description: "Export charts, reports, and data in Word, PDF, PNG, CSV, and TMX formats",
    iconBg: "bg-[rgba(252,211,77,0.1)] dark:bg-[rgba(252,211,77,0.07)]",
    iconColor: "text-amber-500 dark:text-amber-300",
  },
  {
    icon: Search,
    title: "Deep Corpus Insights",
    description: "Keywords, collocations, n-grams, concordance, word clouds, and sub-corpus segmentation",
    iconBg: "bg-[rgba(56,189,248,0.1)] dark:bg-[rgba(56,189,248,0.08)]",
    iconColor: "text-sky-500 dark:text-sky-300",
  },
];

const steps = [
  { number: "01", title: "Upload Your Corpus", description: "Drag and drop files in any format — TXT, DOCX, PDF, or Excel", icon: FileText },
  { number: "02", title: "Analyze & Explore", description: "Run statistical analysis, extract keywords, build concordances", icon: Search },
  { number: "03", title: "AI Insights", description: "Get 31 types of AI-powered analysis and interactive corpus chat", icon: Brain },
  { number: "04", title: "Export & Publish", description: "Download professional reports, charts, and data in multiple formats", icon: BarChart3 },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  return (
    <div className="min-h-full relative" ref={scrollRef}>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pb-20 md:pb-28">

        {/* Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute rounded-full"
            style={{
              width: "55vw", height: "55vw",
              top: "-15%", left: "20%",
              background: "radial-gradient(circle, rgba(92,255,200,0.10), transparent 70%)",
              filter: "blur(80px)",
            }}
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              width: "45vw", height: "45vw",
              bottom: "-10%", right: "5%",
              background: "radial-gradient(circle, rgba(91,141,239,0.08), transparent 70%)",
              filter: "blur(80px)",
            }}
            animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", direction: "reverse" }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              width: "35vw", height: "35vw",
              top: "35%", left: "5%",
              background: "radial-gradient(circle, rgba(167,139,250,0.07), transparent 70%)",
              filter: "blur(80px)",
            }}
            animate={{ x: [0, 15, 0], y: [0, -10, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          />
          {/* Floating particles */}
          <motion.div className="absolute top-[18%] right-[22%] w-1.5 h-1.5 rounded-full bg-teal-400/50"
            animate={{ y: [0, -16, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute top-[40%] left-[12%] w-1 h-1 rounded-full bg-indigo-400/40"
            animate={{ y: [0, 12, 0], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
          <motion.div className="absolute bottom-[30%] right-[15%] w-1 h-1 rounded-full bg-violet-400/40"
            animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
        </div>

        <motion.div
          className="max-w-5xl mx-auto px-6 pt-16 md:pt-24 text-center relative z-10"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          {/* Pulse badge */}
          <motion.div
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-teal-500/20 bg-teal-500/5 backdrop-blur-sm mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
          >
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-teal-400" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[2px] text-teal-500 dark:text-teal-300">
              Corpus Compilation &amp; Analysis Lab
            </span>
          </motion.div>

          {/* Giant headline */}
          <motion.div
            className="mb-5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            data-testid="img-hero-logo"
          >
            <h1
              className="hero-headline"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(52px, 11vw, 112px)",
                fontWeight: 900,
                letterSpacing: "clamp(4px, 1.5vw, 18px)",
                textTransform: "uppercase",
                lineHeight: 1.0,
                background: "linear-gradient(135deg, #14b8a6 0%, #5cffc8 20%, #5b8def 45%, #a78bfa 70%, #fb7185 100%)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "gradientShift 8s ease infinite",
                filter: "drop-shadow(0 0 48px rgba(92,255,200,0.12)) drop-shadow(0 0 96px rgba(91,141,239,0.06))",
              }}
            >
              Corpuscape
            </h1>
          </motion.div>

          {/* Decorative line */}
          <motion.div
            className="mx-auto mb-7"
            style={{
              width: 120, height: 2,
              background: "linear-gradient(90deg, transparent, #14b8a6, #5b8def, #a78bfa, transparent)",
              borderRadius: 2, opacity: 0.6,
            }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 0.6, scaleX: 1 }}
            transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Subtitle */}
          <motion.p
            className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed mb-3 font-medium"
            data-testid="text-hero-subtitle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
          >
            for Translation Studies Research
          </motion.p>

          <motion.p
            className="text-sm text-muted-foreground/75 max-w-md mx-auto leading-relaxed mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68, duration: 0.6 }}
          >
            Upload corpora, run AI analyses, and generate publication-ready outputs — all in one place.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="flex items-center justify-center gap-4 flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.82, duration: 0.6 }}
          >
            <Link href="/monolingual">
              <button
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-[15px] transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "#14b8a6",
                  color: "#fff",
                  boxShadow: "0 8px 32px -4px rgba(20,184,166,0.45), 0 0 64px rgba(92,255,200,0.08)",
                }}
                data-testid="button-get-started"
              >
                <Zap className="w-4 h-4" />
                Get Started
              </button>
            </Link>
            <button
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl font-semibold text-[15px] border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-white/5 dark:hover:bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              data-testid="button-learn-more"
            >
              Learn More
              <ChevronDown className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section id="features" className="py-24 md:py-32 relative">
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="inline-flex items-center gap-3 mb-5 text-teal-500 dark:text-teal-300">
              <div className="w-6 h-px bg-gradient-to-r from-transparent to-current opacity-60" />
              <span className="text-[11px] font-bold uppercase tracking-[2.5px]">Core Capabilities</span>
              <div className="w-6 h-px bg-gradient-to-l from-transparent to-current opacity-60" />
            </div>
            <h2
              className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-foreground"
              style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px" }}
              data-testid="text-capabilities-title"
            >
              Everything You Need for <br className="hidden md:block" />
              <span className="text-gradient">Corpus Research</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              From raw text to publication-ready analysis — all in one place.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-5"
            variants={containerVariants}
            initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                variants={cardVariants}
                className="group relative overflow-hidden rounded-[20px] border border-border/50 dark:border-white/[0.06] bg-white/60 dark:bg-[rgba(17,24,39,0.5)] backdrop-blur-sm p-8 flex gap-6 items-start transition-all duration-400 hover:-translate-y-1 hover:border-border dark:hover:border-white/[0.12]"
                style={{ boxShadow: "0 2px 16px -4px rgba(0,0,0,0.07)" }}
                data-testid={`card-capability-${i}`}
              >
                <div className="absolute top-0 left-[10%] right-[10%] h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(90deg, transparent, ${["#14b8a6","#6366f1","#f59e0b","#38bdf8"][i]}, transparent)` }} />
                <div className={`w-13 h-13 rounded-[14px] flex items-center justify-center flex-shrink-0 ${cap.iconBg}`}
                  style={{ width: 52, height: 52 }}>
                  <cap.icon className={`w-6 h-6 ${cap.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] tracking-tight mb-2 text-foreground"
                    style={{ fontFamily: "'Playfair Display', serif" }}>{cap.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{cap.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 md:py-32 bg-muted/20 dark:bg-[rgba(10,14,23,0.6)] border-y border-border/40">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="inline-flex items-center gap-3 mb-5 text-amber-500 dark:text-amber-300">
              <div className="w-6 h-px bg-gradient-to-r from-transparent to-current opacity-60" />
              <span className="text-[11px] font-bold uppercase tracking-[2.5px]">How It Works</span>
              <div className="w-6 h-px bg-gradient-to-l from-transparent to-current opacity-60" />
            </div>
            <h2
              className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-foreground"
              style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px" }}
              data-testid="text-how-it-works-title"
            >
              From Upload to <span className="subtitle-gradient">Publication</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Four simple steps to transform raw text into scholarly insights.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-4 gap-6 relative"
            variants={containerVariants}
            initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="hidden md:block absolute top-[3rem] left-[12%] right-[12%] h-[1px]">
              <motion.div
                className="h-full"
                style={{ background: "linear-gradient(90deg, rgba(20,184,166,0.3), rgba(99,102,241,0.3), rgba(168,85,247,0.3))", transformOrigin: "left" }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                variants={cardVariants}
                className="text-center relative"
                data-testid={`step-${step.number}`}
              >
                <motion.div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center relative"
                  style={{
                    background: `linear-gradient(135deg, ${
                      i === 0 ? "#0d9488,#14b8a6" : i === 1 ? "#6366f1,#818cf8" : i === 2 ? "#a855f7,#c084fc" : "#f59e0b,#fbbf24"
                    })`,
                    boxShadow: `0 8px 24px -4px ${
                      i === 0 ? "rgba(20,184,166,0.4)" : i === 1 ? "rgba(99,102,241,0.4)" : i === 2 ? "rgba(168,85,247,0.4)" : "rgba(245,158,11,0.4)"
                    }`,
                  }}
                  whileHover={{ y: -4, scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <step.icon className="w-7 h-7 text-white" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-border text-[10px] font-bold flex items-center justify-center text-muted-foreground">
                    {step.number}
                  </span>
                </motion.div>
                <h4 className="font-bold text-sm mb-2 tracking-tight text-foreground">{step.title}</h4>
                <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[180px] mx-auto">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── TRACKS ── */}
      <section className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="inline-flex items-center gap-3 mb-5 text-indigo-500 dark:text-indigo-300">
              <div className="w-6 h-px bg-gradient-to-r from-transparent to-current opacity-60" />
              <span className="text-[11px] font-bold uppercase tracking-[2.5px]">Analysis Tracks</span>
              <div className="w-6 h-px bg-gradient-to-l from-transparent to-current opacity-60" />
            </div>
            <h2
              className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-foreground"
              style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px" }}
              data-testid="text-tracks-title"
            >
              Six Specialized <span className="text-gradient">Research Tracks</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Each track is purpose-built for a specific workflow in translation studies and corpus linguistics.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {tracks.map((track, i) => (
              <motion.div
                key={track.title}
                variants={cardVariants}
                className=""
              >
                <Link href={track.href}>
                  <motion.div
                    className="group relative overflow-hidden cursor-pointer rounded-[24px] border border-border/50 dark:border-white/[0.06] bg-white/60 dark:bg-[rgba(17,24,39,0.5)] backdrop-blur-sm h-full"
                    data-testid={`card-track-${track.title.toLowerCase().replace(/\s/g, "-")}`}
                    whileHover={{ y: -6, scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{
                      boxShadow: `0 4px 24px -4px ${track.glowColor.replace("0.35", "0.10")}, 0 1px 3px rgba(0,0,0,0.06)`,
                    }}
                  >
                    {/* Top accent bar */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px] opacity-70"
                      style={{ background: `linear-gradient(90deg, transparent 0%, ${track.color} 40%, ${track.colorEnd} 60%, transparent 100%)` }}
                    />
                    {/* Corner glow */}
                    <div className="absolute top-0 right-0 w-40 h-40 opacity-[0.06] pointer-events-none"
                      style={{ background: `radial-gradient(circle at 100% 0%, ${track.color}, transparent 70%)` }} />

                    <div className="relative p-6 md:p-7">
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <motion.div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${track.bgFrom} ${track.bgTo} flex items-center justify-center shadow-lg`}
                          style={{ boxShadow: `0 8px 20px -4px ${track.glowColor}` }}
                          whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <track.icon className="w-6 h-6 text-white drop-shadow-sm" />
                        </motion.div>
                        <div>
                          <h3 className="text-lg font-extrabold tracking-tight"
                            style={{ color: track.color, fontFamily: "'Playfair Display', serif" }}>
                            {track.title}
                          </h3>
                          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                            {track.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {track.features.map((f) => (
                          <span
                            key={f}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                            style={{
                              borderColor: `${track.color}25`,
                              color: track.color,
                              background: `${track.color}08`,
                            }}
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {f}
                          </span>
                        ))}
                      </div>

                      <div
                        className="flex items-center gap-1 text-xs font-semibold group-hover:gap-2 transition-all duration-300"
                        style={{ color: track.color }}
                        data-testid={`link-open-${track.title.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        Open Track <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            className="relative overflow-hidden rounded-[28px] border border-border/60 dark:border-white/[0.07] bg-white/70 dark:bg-[rgba(17,24,39,0.7)] backdrop-blur-xl text-center p-10 md:p-14"
            style={{ boxShadow: "0 12px 48px -8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)" }}
            initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="absolute top-0 left-[5%] right-[5%] h-[1px] opacity-60"
              style={{ background: "linear-gradient(90deg, transparent, #14b8a6, #6366f1, #a855f7, transparent)" }} />
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
              <div className="absolute top-[-30%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.06]"
                style={{ background: "radial-gradient(circle, #14b8a6, transparent 70%)", filter: "blur(60px)" }} />
              <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-[0.05]"
                style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)", filter: "blur(60px)" }} />
            </div>

            <motion.div
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 via-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-lg"
              style={{ boxShadow: "0 10px 32px -6px rgba(20,184,166,0.4)" }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>

            <h2
              className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-foreground"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Ready to Explore Your Corpus?
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
              Start with any track — upload your data and let AI help you discover patterns, extract terminology, and generate scholarly insights.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/monolingual">
                <button
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-[14px] transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #818cf8)",
                    color: "#fff",
                    boxShadow: "0 6px 24px -4px rgba(99,102,241,0.4)",
                  }}
                  data-testid="button-start-monolingual"
                >
                  <BookOpen className="w-4 h-4" />
                  Monolingual Track
                </button>
              </Link>
              <Link href="/bilingual">
                <button
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-[14px] transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                    color: "#fff",
                    boxShadow: "0 6px 24px -4px rgba(20,184,166,0.4)",
                  }}
                  data-testid="button-start-bilingual"
                >
                  <Globe className="w-4 h-4" />
                  Bilingual Track
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.div
        className="pb-10 text-center text-[11px] text-muted-foreground/50 font-medium tracking-wide"
        data-testid="text-footer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        © 2026 Corpuscape · Hussein Abu-Rayyash. All rights reserved.
      </motion.div>
    </div>
  );
}
