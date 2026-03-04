import { Link } from "wouter";
import { BookOpen, Globe, Brain, ArrowRight, Newspaper } from "lucide-react";
import { Logo } from "@/components/logo";
import { motion } from "framer-motion";

const tracks = [
  {
    title: "Monolingual",
    description: "Explore reception, register, and discourse patterns in a single corpus with full statistical analysis.",
    icon: BookOpen,
    href: "/monolingual",
    gradient: "from-indigo-500 to-blue-600",
    bgClass: "bg-gradient-to-br from-indigo-50/80 to-blue-50/60 dark:from-indigo-950/40 dark:to-blue-950/30",
    borderClass: "border-indigo-200/50 dark:border-indigo-800/30",
    iconBg: "bg-gradient-to-br from-indigo-500 to-blue-600",
    hoverGlow: "hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/30",
  },
  {
    title: "Bilingual",
    description: "Align parallel corpora, trace translation shifts, identify strategies, and export TMX for CAT tools.",
    icon: Globe,
    href: "/bilingual",
    gradient: "from-teal-500 to-emerald-600",
    bgClass: "bg-gradient-to-br from-teal-50/80 to-emerald-50/60 dark:from-teal-950/40 dark:to-emerald-950/30",
    borderClass: "border-teal-200/50 dark:border-teal-800/30",
    iconBg: "bg-gradient-to-br from-teal-500 to-emerald-600",
    hoverGlow: "hover:shadow-teal-200/50 dark:hover:shadow-teal-900/30",
  },
  {
    title: "AI Insights",
    description: "Run 31 specialized analyses covering industry mapping, feminist translation, quality assessment, and more.",
    icon: Brain,
    href: "/ai-insights",
    gradient: "from-purple-500 to-violet-600",
    bgClass: "bg-gradient-to-br from-purple-50/80 to-violet-50/60 dark:from-purple-950/40 dark:to-violet-950/30",
    borderClass: "border-purple-200/50 dark:border-purple-800/30",
    iconBg: "bg-gradient-to-br from-purple-500 to-violet-600",
    hoverGlow: "hover:shadow-purple-200/50 dark:hover:shadow-purple-900/30",
  },
  {
    title: "Web Scraper",
    description: "Scrape articles from the web, clean and organize content, then feed it directly into your analysis pipeline.",
    icon: Newspaper,
    href: "/scraper",
    gradient: "from-amber-500 to-orange-600",
    bgClass: "bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30",
    borderClass: "border-amber-200/50 dark:border-amber-800/30",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
    hoverGlow: "hover:shadow-amber-200/50 dark:hover:shadow-amber-900/30",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Home() {
  return (
    <div className="min-h-full">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.div
            className="flex justify-center mb-8"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          >
            <div className="animate-pulse-glow rounded-2xl p-1">
              <Logo size={80} />
            </div>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-5 leading-[0.95]" data-testid="text-hero-title">
            <span className="text-gradient">Traduxa</span>
          </h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed font-light"
            data-testid="text-hero-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            The corpus linguistics lab for translation studies.
            Analyze, align, scrape, and discover patterns.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid gap-5 md:grid-cols-2 mb-20"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {tracks.map((track) => (
            <motion.div key={track.title} variants={itemVariants}>
              <Link href={track.href}>
                <div
                  className={`group relative p-6 cursor-pointer rounded-xl transition-all duration-300 border ${track.borderClass} ${track.bgClass} hover:shadow-xl ${track.hoverGlow} hover:-translate-y-1.5`}
                  data-testid={`card-track-${track.title.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`page-header-icon ${track.iconBg} flex-shrink-0`}>
                      <track.icon className="w-5 h-5 text-white relative z-10" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold mb-1.5 tracking-tight">{track.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{track.description}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
                    <span className="text-primary">Get started</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="polished-card p-7" data-testid="card-quickstart">
            <div className="section-header">
              <h3>Quick Start</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-5 text-sm text-muted-foreground">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">1</span>
                  <p><strong className="text-foreground">Monolingual</strong> — Upload a corpus to get stats, keywords, collocations, concordance, and AI analysis</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">2</span>
                  <p><strong className="text-foreground">Bilingual</strong> — Sentence alignment, translation strategies, universals, TMX export</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">3</span>
                  <p><strong className="text-foreground">AI Insights</strong> — 31 analysis types, domain classification, term clusters</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">4</span>
                  <p><strong className="text-foreground">Web Scraper</strong> — Scrape articles, clean and edit content, send to analysis</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mt-12 text-center text-xs text-muted-foreground/40 font-medium"
          data-testid="text-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Traduxa · ATISA 2026 · Hussein Abu-Rayyash
        </motion.div>
      </div>
    </div>
  );
}
