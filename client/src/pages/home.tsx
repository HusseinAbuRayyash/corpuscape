import { Link } from "wouter";
import { BookOpen, Globe, Newspaper, Scale } from "lucide-react";
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
    lightBg: "from-indigo-50/80 via-white to-blue-50/60",
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
    lightBg: "from-teal-50/80 via-white to-emerald-50/60",
    darkBg: "dark:from-teal-950/60 dark:via-slate-900/80 dark:to-emerald-950/40",
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
    lightBg: "from-amber-50/80 via-white to-orange-50/60",
    darkBg: "dark:from-amber-950/60 dark:via-slate-900/80 dark:to-orange-950/40",
  },
  {
    title: "Compare",
    description: "Side-by-side comparison of two corpora with stats, keywords & AI analysis",
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
          {tracks.map((track) => (
            <motion.div key={track.title} variants={cardVariants}>
              <Link href={track.href}>
                <motion.div
                  className={`track-card group relative overflow-hidden cursor-pointer bg-gradient-to-br ${track.lightBg} ${track.darkBg} border border-white/60 dark:border-white/[0.06]`}
                  data-testid={`card-track-${track.title.toLowerCase().replace(/\s/g, "-")}`}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{
                    borderRadius: "2rem",
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
                    style={{
                      background: `radial-gradient(circle at 100% 0%, ${track.color}, transparent 70%)`,
                    }}
                  />

                  <div className="absolute bottom-0 left-0 w-32 h-32 opacity-[0.04] dark:opacity-[0.03] pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 0% 100%, ${track.colorEnd}, transparent 70%)`,
                    }}
                  />

                  <div className="relative p-7 md:p-8 flex flex-col items-center text-center min-h-[200px] justify-center">
                    <motion.div
                      className={`w-16 h-16 rounded-[1.25rem] bg-gradient-to-br ${track.bgFrom} ${track.bgTo} flex items-center justify-center mb-4 shadow-lg`}
                      style={{
                        boxShadow: `0 10px 24px -6px ${track.glowColor}`,
                      }}
                      whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <track.icon className="w-8 h-8 text-white drop-shadow-sm" />
                    </motion.div>

                    <h3
                      className="text-xl font-extrabold tracking-tight mb-2"
                      style={{ color: track.color, fontFamily: "'Playfair Display', serif" }}
                    >
                      {track.title}
                    </h3>

                    <p className="text-[13px] text-muted-foreground/80 leading-relaxed max-w-[240px]">
                      {track.description}
                    </p>
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
