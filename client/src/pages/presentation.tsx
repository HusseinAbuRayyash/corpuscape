import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, ExternalLink, Presentation, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function PresentationPage() {
  const [viewerUrl, setViewerUrl] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fileUrl = `${window.location.origin}/Corpuscape_Presentation.pptx`;
    const encoded = encodeURIComponent(fileUrl);
    setViewerUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`);
  }, []);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = "/Corpuscape_Presentation.pptx";
    a.download = "Corpuscape_Presentation.pptx";
    a.click();
  };

  const handleFullscreen = () => {
    const iframe = document.getElementById("pptx-viewer") as HTMLIFrameElement;
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    }
    setIsFullscreen(true);
  };

  return (
    <div className="min-h-full relative">

      {/* ── HEADER ── */}
      <section className="relative overflow-hidden pb-6 pt-10 md:pt-14">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute rounded-full"
            style={{
              width: "50vw", height: "50vw",
              top: "-20%", left: "25%",
              background: "radial-gradient(circle, rgba(167,139,250,0.08), transparent 70%)",
              filter: "blur(80px)",
            }}
            animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              width: "35vw", height: "35vw",
              bottom: "-10%", right: "10%",
              background: "radial-gradient(circle, rgba(20,184,166,0.07), transparent 70%)",
              filter: "blur(80px)",
            }}
            animate={{ x: [0, -15, 0], y: [0, 10, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          />
        </div>

        <motion.div
          className="max-w-5xl mx-auto px-6 text-center relative z-10"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 backdrop-blur-sm mb-6"
          >
            <Presentation className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[2px] text-violet-500 dark:text-violet-300">
              Project Presentation
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3"
            style={{
              fontFamily: "'Playfair Display', serif",
              background: "linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #14b8a6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Corpuscape
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base md:text-lg text-muted-foreground mb-1 font-medium"
          >
            Corpus Compilation &amp; Analysis Lab for Translation Studies
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="text-xs text-muted-foreground/60 mb-7"
          >
            Hussein Abu-Rayyash · PhD Candidate, Kent State University
          </motion.p>

          {/* Action buttons */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              onClick={handleDownload}
              className="rounded-2xl gap-2 px-5 font-semibold"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", boxShadow: "0 6px 20px -4px rgba(124,58,237,0.4)" }}
              data-testid="button-download-pptx"
            >
              <Download className="w-4 h-4" />
              Download PPTX
            </Button>
            <Button
              onClick={handleFullscreen}
              variant="outline"
              className="rounded-2xl gap-2 px-5 font-semibold border-border/60"
              data-testid="button-fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
              Fullscreen
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── VIEWER ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-[24px] overflow-hidden border border-border/50 dark:border-white/[0.07]"
          style={{
            boxShadow: "0 24px 80px -12px rgba(124,58,237,0.12), 0 8px 32px -4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Top chrome bar */}
          <div className="flex items-center gap-2 px-5 py-3 bg-muted/60 dark:bg-[rgba(17,24,39,0.9)] border-b border-border/40 backdrop-blur-xl">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-amber-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>
            <div className="flex-1 mx-4">
              <div className="max-w-xs mx-auto px-3 py-1 rounded-md bg-background/60 border border-border/40 text-[11px] text-muted-foreground/70 text-center truncate font-mono">
                Corpuscape_Presentation.pptx
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDownload}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground/60 hover:text-foreground"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleFullscreen}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground/60 hover:text-foreground"
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Iframe */}
          <div className="relative bg-[#1e1e2e] dark:bg-[#13131f]" style={{ aspectRatio: "16/9", minHeight: 420, maxHeight: 680 }}>
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg">
                    <Presentation className="w-8 h-8 text-white" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-violet-400/50"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white/80 mb-1">Loading Presentation</p>
                  <p className="text-xs text-white/40">Powered by Microsoft Office Online</p>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-violet-400"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            )}

            {viewerUrl && (
              <iframe
                id="pptx-viewer"
                src={viewerUrl}
                className="w-full h-full"
                style={{ minHeight: 420, maxHeight: 680, border: "none" }}
                onLoad={() => setLoaded(true)}
                allowFullScreen
                title="Corpuscape Presentation"
                data-testid="iframe-presentation"
              />
            )}
          </div>

          {/* Bottom info bar */}
          <div className="px-5 py-3 bg-muted/40 dark:bg-[rgba(17,24,39,0.7)] border-t border-border/40 backdrop-blur-xl flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
              <div className="w-4 h-4 rounded bg-violet-500/20 flex items-center justify-center">
                <Presentation className="w-2.5 h-2.5 text-violet-400" />
              </div>
              <span>Use the navigation arrows inside the viewer to browse slides</span>
            </div>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-500 dark:text-violet-400 hover:underline transition-colors"
            >
              <Download className="w-3 h-3" />
              Save to device
            </button>
          </div>
        </motion.div>

        {/* Info card below */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-6 rounded-[18px] border border-border/40 bg-white/50 dark:bg-[rgba(17,24,39,0.4)] backdrop-blur-sm p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-5"
          style={{ boxShadow: "0 4px 20px -4px rgba(0,0,0,0.06)" }}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            H
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
              Hussein Abu-Rayyash
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              PhD Candidate in Translation Studies · Graduate Teaching Assistant, Kent State University ·
              Visiting Instructor, Miami University. This presentation introduces Corpuscape — an AI-powered
              corpus lab purpose-built for translation studies research.
            </p>
          </div>
          <a href="/about" className="shrink-0">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
              <ExternalLink className="w-3 h-3" />
              About the Author
            </Button>
          </a>
        </motion.div>
      </section>
    </div>
  );
}
