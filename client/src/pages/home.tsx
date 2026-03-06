import { Link } from "wouter";
import { BookOpen, Globe, Newspaper, Scale, Image, Sparkles, Zap, FileText, BarChart3, Brain, Search, ArrowRight, CheckCircle2, ChevronDown } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { TraduxaLogo as CorpuscapeLogo } from "@/components/traduxa-logo";

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
    lightBg: "from-indigo-50/80 via-white to-blue-50/60",
    darkBg: "dark:from-indigo-950/60 dark:via-slate-900/80 dark:to-blue-950/40",
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
    lightBg: "from-teal-50/80 via-white to-emerald-50/60",
    darkBg: "dark:from-teal-950/60 dark:via-slate-900/80 dark:to-emerald-950/40",
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
    lightBg: "from-amber-50/80 via-white to-orange-50/60",
    darkBg: "dark:from-amber-950/60 dark:via-slate-900/80 dark:to-orange-950/40",
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
    lightBg: "from-violet-50/80 via-white to-purple-50/60",
    darkBg: "dark:from-violet-950/60 dark:via-slate-900/80 dark:to-purple-950/40",
  },
  {
    title: "Figure Maker",
    description: "Create publication-ready charts & figures with academic formatting & multi-format export",
    features: ["8 chart types", "24 color palettes", "AI data parsing", "Academic formats", "PNG/PDF/Word"],
    icon: Image,
    href: "/figures",
    color: "#e11d48",
    colorEnd: "#fb7185",
    bgFrom: "from-rose-500",
    bgTo: "to-pink-500",
    glowColor: "rgba(225, 29, 72, 0.35)",
    lightBg: "from-rose-50/80 via-white to-pink-50/60",
    darkBg: "dark:from-rose-950/60 dark:via-slate-900/80 dark:to-pink-950/40",
  },
];

const capabilities = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "31 specialized AI analyses powered by Gemini, from domain classification to comparative metrics",
    color: "from-purple-500 to-indigo-600",
    glow: "rgba(124, 58, 237, 0.25)",
  },
  {
    icon: FileText,
    title: "Multi-Format Support",
    description: "Upload TXT, DOCX, PDF, Excel files — or scrape directly from the web",
    color: "from-teal-500 to-emerald-600",
    glow: "rgba(20, 184, 166, 0.25)",
  },
  {
    icon: BarChart3,
    title: "Publication-Ready Output",
    description: "Export charts, reports, and data in Word, PDF, PNG, CSV, and TMX formats",
    color: "from-amber-500 to-orange-600",
    glow: "rgba(245, 158, 11, 0.25)",
  },
  {
    icon: Search,
    title: "Deep Corpus Insights",
    description: "Keywords, collocations, n-grams, concordance, word clouds, and sub-corpus segmentation",
    color: "from-rose-500 to-pink-600",
    glow: "rgba(225, 29, 72, 0.25)",
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
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  return (
    <div className="min-h-full relative" ref={scrollRef}>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #14b8a6, transparent 70%)" }} />
          <div className="absolute top-[-10%] right-[-15%] w-[50%] h-[50%] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)" }} />
          <div className="absolute bottom-[-20%] left-[30%] w-[40%] h-[40%] rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #a855f7, transparent 70%)" }} />
          <motion.div
            className="absolute top-[15%] right-[20%] w-2 h-2 rounded-full bg-teal-400/40"
            animate={{ y: [0, -15, 0], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[35%] left-[15%] w-1.5 h-1.5 rounded-full bg-indigo-400/30"
            animate={{ y: [0, 12, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute bottom-[25%] right-[12%] w-1 h-1 rounded-full bg-purple-400/40"
            animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        <motion.div
          className="max-w-5xl mx-auto px-6 pt-16 md:pt-28 pb-12 md:pb-20 text-center relative z-10"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <motion.div
            className="flex justify-center mb-8"
            initial={{ scale: 0.6, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="relative"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 blur-3xl opacity-25 bg-gradient-to-br from-teal-400 via-indigo-400 to-purple-400 rounded-full scale-[2.5]" />
              <div className="relative z-10" data-testid="img-hero-logo">
                <CorpuscapeLogo width={420} animated className="hidden md:block" />
                <CorpuscapeLogo width={280} animated className="block md:hidden" />
              </div>
            </motion.div>
          </motion.div>

          <motion.p
            className="text-lg md:text-xl max-w-lg mx-auto leading-relaxed font-semibold tracking-tight mb-4"
            data-testid="text-hero-subtitle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
          >
            <span className="subtitle-gradient">Corpus Compilation & Analysis Lab</span>
            <br />
            <span className="subtitle-gradient">for Translation Studies Research</span>
          </motion.p>

          <motion.p
            className="text-sm md:text-base text-muted-foreground max-w-md mx-auto leading-relaxed mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
          >
            A comprehensive toolkit for researchers, linguists, and translators.
            Upload corpora, run AI analyses, and generate publication-ready outputs.
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-3 flex-wrap mb-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <Link href="/monolingual">
              <Button
                className="rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-lg px-6 h-11"
                style={{ boxShadow: "0 8px 24px -6px rgba(20, 184, 166, 0.4)" }}
                data-testid="button-get-started"
              >
                <Zap className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            </Link>
            <Button
              variant="outline"
              className="rounded-2xl backdrop-blur-sm px-6 h-11"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              data-testid="button-learn-more"
            >
              Learn More
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>

        </motion.div>
      </section>

      <section id="features" className="py-16 md:py-24 relative">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3 h-3" />Core Capabilities
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-capabilities-title">
              Everything You Need for <span className="text-gradient">Corpus Research</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              From raw text to publication-ready analysis — all in one place.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                variants={cardVariants}
                className="group relative overflow-hidden rounded-[1.5rem] bg-white/70 dark:bg-slate-900/50 border border-border/50 dark:border-white/[0.06] backdrop-blur-sm transition-all duration-500 hover:border-primary/20"
                style={{ boxShadow: `0 2px 12px -4px rgba(0,0,0,0.06)` }}
                data-testid={`card-capability-${i}`}
              >
                <div className="absolute top-0 left-[10%] right-[10%] h-[2px] opacity-0 group-hover:opacity-60 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${i === 0 ? "#7c3aed" : i === 1 ? "#14b8a6" : i === 2 ? "#f59e0b" : "#e11d48"}, transparent)` }} />
                <div className="p-7 flex gap-5 items-start">
                  <motion.div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cap.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
                    style={{ boxShadow: `0 6px 16px -4px ${cap.glow}` }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <cap.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight mb-1.5">{cap.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{cap.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-24 relative">
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold uppercase tracking-wider mb-4">
              <Zap className="w-3 h-3" />How It Works
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-how-it-works-title">
              From Upload to <span className="subtitle-gradient">Publication</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Four simple steps to transform raw text into scholarly insights.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-4 gap-6 relative"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="hidden md:block absolute top-[3.5rem] left-[12%] right-[12%] h-[2px]">
              <motion.div
                className="h-full bg-gradient-to-r from-teal-400/30 via-indigo-400/30 to-purple-400/30"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: "left" }}
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
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center relative"
                  style={{
                    background: `linear-gradient(135deg, ${
                      i === 0 ? "#0d9488, #14b8a6" : i === 1 ? "#6366f1, #818cf8" : i === 2 ? "#a855f7, #c084fc" : "#f59e0b, #fbbf24"
                    })`,
                    boxShadow: `0 8px 20px -4px ${
                      i === 0 ? "rgba(20,184,166,0.35)" : i === 1 ? "rgba(99,102,241,0.35)" : i === 2 ? "rgba(168,85,247,0.35)" : "rgba(245,158,11,0.35)"
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
                <h4 className="font-bold text-sm mb-1.5 tracking-tight">{step.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[180px] mx-auto">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold uppercase tracking-wider mb-4">
              <BarChart3 className="w-3 h-3" />Analysis Tracks
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-tracks-title">
              Five Specialized <span className="text-gradient">Research Tracks</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Each track is purpose-built for a specific workflow in translation studies and corpus linguistics.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {tracks.map((track, i) => (
              <motion.div
                key={track.title}
                variants={cardVariants}
                className={i === 4 ? "md:col-span-2 lg:col-span-1" : ""}
              >
                <Link href={track.href}>
                  <motion.div
                    className={`track-card group relative overflow-hidden cursor-pointer bg-gradient-to-br ${track.lightBg} ${track.darkBg} border border-white/60 dark:border-white/[0.06] h-full`}
                    data-testid={`card-track-${track.title.toLowerCase().replace(/\s/g, "-")}`}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{
                      borderRadius: "1.75rem",
                      boxShadow: `0 4px 24px -4px ${track.glowColor.replace("0.35", "0.12")}, 0 1px 3px rgba(0,0,0,0.06)`,
                    }}
                  >
                    <div
                      className="absolute top-0 left-[10%] right-[10%] h-[3px] opacity-70"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${track.color}, ${track.colorEnd}, transparent)`,
                        borderRadius: "0 0 100% 100%",
                      }}
                    />

                    <div className="absolute top-0 right-0 w-40 h-40 opacity-[0.06] dark:opacity-[0.04] pointer-events-none"
                      style={{ background: `radial-gradient(circle at 100% 0%, ${track.color}, transparent 70%)` }}
                    />

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
                          <h3
                            className="text-lg font-extrabold tracking-tight"
                            style={{ color: track.color, fontFamily: "'Playfair Display', serif" }}
                          >
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

                      <div className="flex items-center gap-1 text-xs font-semibold group-hover:gap-2 transition-all duration-300" style={{ color: track.color }} data-testid={`link-open-${track.title.toLowerCase().replace(/\s/g, "-")}`}>
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

      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            className="relative overflow-hidden rounded-[2rem] border border-border/60 backdrop-blur-xl"
            style={{
              background: "linear-gradient(135deg, hsl(var(--card) / 0.9) 0%, hsl(var(--card) / 0.8) 100%)",
              boxShadow: "0 8px 32px -8px rgba(0,0,0,0.12)",
            }}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="absolute top-0 left-[5%] right-[5%] h-[2px] opacity-50" style={{ background: "linear-gradient(90deg, transparent, #14b8a6, #6366f1, #a855f7, transparent)" }} />
            <div className="p-8 md:p-12 text-center">
              <motion.div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 via-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-5 shadow-lg"
                style={{ boxShadow: "0 10px 24px -6px rgba(99, 102, 241, 0.35)" }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                Ready to Explore Your Corpus?
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Start with any track — upload your data and let AI help you discover patterns, extract terminology, and generate insights.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link href="/monolingual">
                  <Button
                    className="rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg px-6 h-11"
                    style={{ boxShadow: "0 8px 24px -6px rgba(99, 102, 241, 0.4)" }}
                    data-testid="button-start-monolingual"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Monolingual Track
                  </Button>
                </Link>
                <Link href="/bilingual">
                  <Button
                    className="rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-lg px-6 h-11"
                    style={{ boxShadow: "0 8px 24px -6px rgba(20, 184, 166, 0.4)" }}
                    data-testid="button-start-bilingual"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Bilingual Track
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.div
        className="pb-10 text-center text-[11px] text-muted-foreground/60 font-medium tracking-wide"
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
