import { Link } from "wouter";
import { BookOpen, Globe, Brain, ArrowRight, Newspaper } from "lucide-react";
import { motion } from "framer-motion";
import { TraduxaLogo } from "@/components/traduxa-logo";

const tracks = [
  {
    title: "Monolingual",
    description: "Corpus stats, keywords, collocations, concordance & AI analysis",
    icon: BookOpen,
    href: "/monolingual",
    color: "#6366f1",
    colorEnd: "#818cf8",
    bgFrom: "from-indigo-500",
    bgTo: "to-blue-500",
    glowColor: "rgba(99, 102, 241, 0.35)",
    lightBg: "from-indigo-50 via-white to-blue-50",
    darkBg: "dark:from-indigo-950/60 dark:via-slate-900/80 dark:to-blue-950/40",
  },
  {
    title: "Bilingual",
    description: "Parallel alignment, translation strategies, universals & TMX export",
    icon: Globe,
    href: "/bilingual",
    color: "#0d9488",
    colorEnd: "#14b8a6",
    bgFrom: "from-teal-500",
    bgTo: "to-emerald-500",
    glowColor: "rgba(20, 184, 166, 0.35)",
    lightBg: "from-teal-50 via-white to-emerald-50",
    darkBg: "dark:from-teal-950/60 dark:via-slate-900/80 dark:to-emerald-950/40",
  },
  {
    title: "AI Insights",
    description: "31 specialized analyses — industry, feminist, quality & more",
    icon: Brain,
    href: "/ai-insights",
    color: "#a855f7",
    colorEnd: "#c084fc",
    bgFrom: "from-purple-500",
    bgTo: "to-violet-500",
    glowColor: "rgba(168, 85, 247, 0.35)",
    lightBg: "from-purple-50 via-white to-violet-50",
    darkBg: "dark:from-purple-950/60 dark:via-slate-900/80 dark:to-violet-950/40",
  },
  {
    title: "Web Scraper",
    description: "Scrape, clean & edit web articles, then feed into analysis",
    icon: Newspaper,
    href: "/scraper",
    color: "#f59e0b",
    colorEnd: "#fbbf24",
    bgFrom: "from-amber-500",
    bgTo: "to-orange-500",
    glowColor: "rgba(245, 158, 11, 0.35)",
    lightBg: "from-amber-50 via-white to-orange-50",
    darkBg: "dark:from-amber-950/60 dark:via-slate-900/80 dark:to-orange-950/40",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Home() {
  return (
    <div className="min-h-full">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">

        <motion.div
          className="text-center mb-16 md:mb-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
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
              <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br from-teal-400 via-indigo-400 to-purple-400 rounded-full scale-[2]" />
              <div className="relative z-10" data-testid="img-hero-logo">
                <TraduxaLogo width={380} animated className="hidden md:block" />
                <TraduxaLogo width={260} animated className="block md:hidden" />
              </div>
            </motion.div>
          </motion.div>

          <motion.p
            className="text-lg md:text-xl max-w-lg mx-auto leading-relaxed font-semibold tracking-tight"
            data-testid="text-hero-subtitle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            <span className="subtitle-gradient">Corpus Compilation & Analysis Lab</span>
            <br />
            <span className="subtitle-gradient">for Translation Studies</span>
          </motion.p>

        </motion.div>

        <motion.div
          className="grid gap-5 md:grid-cols-2 mb-16"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {tracks.map((track, i) => (
            <motion.div key={track.title} variants={cardVariants}>
              <Link href={track.href}>
                <motion.div
                  className={`track-card group relative overflow-hidden rounded-2xl cursor-pointer bg-gradient-to-br ${track.lightBg} ${track.darkBg} border border-white/60 dark:border-white/[0.06]`}
                  data-testid={`card-track-${track.title.toLowerCase().replace(/\s/g, "-")}`}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{
                    boxShadow: `0 4px 24px -4px ${track.glowColor.replace("0.35", "0.12")}, 0 1px 3px rgba(0,0,0,0.06)`,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1 opacity-80"
                    style={{ background: `linear-gradient(90deg, ${track.color}, ${track.colorEnd})` }}
                  />

                  <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.07] dark:opacity-[0.04] pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 100% 0%, ${track.color}, transparent 70%)`,
                    }}
                  />

                  <div className="relative p-6 md:p-7">
                    <div className="flex items-center gap-4 mb-4">
                      <motion.div
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${track.bgFrom} ${track.bgTo} flex items-center justify-center flex-shrink-0 shadow-lg`}
                        style={{
                          boxShadow: `0 8px 20px -4px ${track.glowColor}`,
                        }}
                        whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <track.icon className="w-7 h-7 text-white drop-shadow-sm" />
                      </motion.div>
                      <h3 className="text-xl font-extrabold tracking-tight" style={{ color: track.color }}>
                        {track.title}
                      </h3>
                    </div>

                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                      {track.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs font-bold opacity-50 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" style={{ color: track.color }}>
                      <span>Explore</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>


        <motion.div
          className="mt-10 text-center text-[11px] text-muted-foreground/30 font-medium tracking-wide"
          data-testid="text-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Traduxa · Hussein Abu-Rayyash
        </motion.div>
      </div>
    </div>
  );
}
