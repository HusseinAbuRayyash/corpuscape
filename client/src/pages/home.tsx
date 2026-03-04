import { Link } from "wouter";
import { BookOpen, Globe, Brain, ArrowRight, Sparkles, Newspaper, Zap, Shield, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { motion } from "framer-motion";

const tracks = [
  {
    title: "Monolingual",
    description: "Explore reception, register, and discourse patterns in a single corpus with full statistical analysis.",
    icon: BookOpen,
    href: "/monolingual",
    gradient: "from-indigo-500 to-blue-600",
    bgClass: "bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30",
    borderClass: "border-indigo-200/60 dark:border-indigo-800/40",
    iconBg: "bg-indigo-500",
    hoverGlow: "hover:shadow-indigo-200/40 dark:hover:shadow-indigo-900/30",
  },
  {
    title: "Bilingual",
    description: "Align parallel corpora, trace translation shifts, identify strategies, export TMX for CAT tools.",
    icon: Globe,
    href: "/bilingual",
    gradient: "from-teal-500 to-emerald-600",
    bgClass: "bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30",
    borderClass: "border-teal-200/60 dark:border-teal-800/40",
    iconBg: "bg-teal-500",
    hoverGlow: "hover:shadow-teal-200/40 dark:hover:shadow-teal-900/30",
  },
  {
    title: "AI Insights",
    description: "Run 31 specialized analyses: industry mapping, feminist translation, quality assessment, and more.",
    icon: Brain,
    href: "/ai-insights",
    gradient: "from-purple-500 to-violet-600",
    bgClass: "bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/30",
    borderClass: "border-purple-200/60 dark:border-purple-800/40",
    iconBg: "bg-purple-500",
    hoverGlow: "hover:shadow-purple-200/40 dark:hover:shadow-purple-900/30",
  },
  {
    title: "Web Scraper",
    description: "Scrape articles and data from the web, clean and organize text, then feed it directly into your analysis pipeline.",
    icon: Newspaper,
    href: "/scraper",
    gradient: "from-amber-500 to-orange-600",
    bgClass: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30",
    borderClass: "border-amber-200/60 dark:border-amber-800/40",
    iconBg: "bg-amber-500",
    hoverGlow: "hover:shadow-amber-200/40 dark:hover:shadow-amber-900/30",
  },
];

const features = [
  { icon: Zap, label: "AI-Powered", desc: "Gemini AI built-in" },
  { icon: Shield, label: "No API Keys", desc: "Ready out of the box" },
  { icon: Download, label: "Export Ready", desc: "CSV, TMX, Reports" },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function Home() {
  return (
    <div className="min-h-full">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.div
            className="flex justify-center mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="animate-pulse-glow rounded-2xl">
              <Logo size={72} />
            </div>
          </motion.div>

          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-semibold mb-5 backdrop-blur-sm"
            data-testid="badge-version"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Powered by Gemini AI
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4" data-testid="text-hero-title">
            <span className="text-gradient">TransCorpus</span>{" "}
            <span className="text-foreground">AI</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light" data-testid="text-hero-subtitle">
            The AI-powered corpus linguistics lab for translation studies.
            Analyze, align, scrape, and discover patterns in your corpora.
          </p>

          <motion.div
            className="flex items-center justify-center gap-6 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <f.icon className="w-3.5 h-3.5 text-primary" />
                <div className="text-left">
                  <span className="font-semibold text-foreground">{f.label}</span>
                  <span className="text-muted-foreground/70 ml-1 hidden sm:inline">· {f.desc}</span>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="grid gap-5 md:grid-cols-2 mb-16"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {tracks.map((track) => (
            <motion.div key={track.title} variants={itemVariants}>
              <Link href={track.href}>
                <Card
                  className={`group relative p-6 cursor-pointer transition-all duration-300 border ${track.borderClass} ${track.bgClass} hover:shadow-xl ${track.hoverGlow} hover:-translate-y-1`}
                  data-testid={`card-track-${track.title.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${track.iconBg} shadow-lg flex-shrink-0`}>
                      <track.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold mb-1.5 tracking-tight">{track.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{track.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
                    <span className="text-primary">Get started</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6 glass-card" data-testid="card-quickstart">
            <h3 className="font-bold text-base mb-4 tracking-tight">Quick Start Guide</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <p><strong className="text-foreground">Monolingual:</strong> Upload corpus, get stats, keywords, collocations, concordance, AI analysis</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <p><strong className="text-foreground">Bilingual:</strong> Sentence alignment, translation strategies, universals, TMX export</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <p><strong className="text-foreground">AI Insights:</strong> 31 analysis types, domain classification, term clusters</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                  <p><strong className="text-foreground">Web Scraper:</strong> Scrape articles, clean & edit, send to analysis</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          className="mt-10 text-center text-xs text-muted-foreground/60 font-medium"
          data-testid="text-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          TransCorpus AI · ATISA 2026 · Hussein Abu-Rayyash
        </motion.div>
      </div>
    </div>
  );
}
