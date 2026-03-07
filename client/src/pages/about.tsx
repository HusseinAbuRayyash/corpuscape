import { motion } from "framer-motion";
import { ExternalLink, Mail, MapPin, GraduationCap, BookOpen, Award, Code, Languages } from "lucide-react";
import { SiLinkedin, SiGooglescholar } from "react-icons/si";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const selectedPubs = [
  { year: "2025", title: "Through the Eyes of the Viewer: The Cognitive Load of LLM-Generated vs. Professional Arabic Subtitles", journal: "Journal of Eye Movement Research" },
  { year: "2025", title: "Compilation and Analysis of a Parallel English–Arabic Corpus of Stand-Up Comedy Shows Subtitles", journal: "Corpus-based Studies across Humanities" },
  { year: "2024", title: "Morphological complexity as a predictor of cognitive effort in neural machine translation post-editing", journal: "Translation, Cognition & Behavior" },
  { year: "2024", title: "Introducing Transvisio: A customizable AI-powered subtitling tool", journal: "Research Journal in Advanced Humanities" },
  { year: "2023", title: "AI meets comedy: Viewers' reactions to GPT-4 generated humor translation", journal: "Ampersand" },
  { year: "2023", title: "Strategies of translating swear words into Arabic: A case study of a parallel corpus of Netflix English–Arabic movie subtitles", journal: "Humanities and Social Sciences Communications" },
];

const tools = [
  { name: "Corpuscape", desc: "Corpus compilation & analysis lab for translation studies research" },
  { name: "TransVisio", desc: "LLM-powered subtitling tool with up to 40% accuracy gains" },
  { name: "TransCorpora", desc: "Research tool for collecting, organizing, and analyzing archival texts" },
  { name: "StatLation", desc: "Web-based tool for statistical analysis in empirical translation studies" },
];

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
      <motion.div initial="hidden" animate="show" variants={stagger}>
        <motion.div variants={fadeUp} className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 via-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-5 shadow-lg text-white text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            H
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-about-name">
            Hussein Abu-Rayyash
          </h1>
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-about-title">
            Ph.D. Candidate (ABD) in Translation & Interpreting · Kent State University
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a href="https://www.linkedin.com/in/hussein-abu-rayyash/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="rounded-xl gap-2" data-testid="link-linkedin">
                <SiLinkedin className="w-3.5 h-3.5" /> LinkedIn
              </Button>
            </a>
            <a href="mailto:husseinaburayyash@gmail.com">
              <Button variant="outline" size="sm" className="rounded-xl gap-2" data-testid="link-email">
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="polished-card p-6 md:p-8 mb-6">
          <p className="text-sm leading-relaxed text-foreground/90" data-testid="text-about-bio">
            I'm a PhD candidate in translation studies and a Graduate Teaching Assistant at Kent State University,
            and I also serve as a visiting instructor at Miami University. My work sits at the intersection of
            corpus linguistics, cognitive translation studies, and AI — I'm especially interested in how we can
            build better tools for translators and researchers.
          </p>
          <p className="text-sm leading-relaxed text-foreground/90 mt-3">
            Over the years, I've published 20+ peer-reviewed articles covering everything from subtitle translation
            and eye-tracking to machine translation post-editing and AI-generated humor. Outside of research,
            I spend a lot of my time building tools like Corpuscape to make corpus work more accessible for
            everyone in the field.
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="polished-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="font-semibold text-sm">Education</h3>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground/90">Ph.D. Translation & Interpreting (ABD)</p>
                <p>Kent State University · 2022–Present</p>
              </div>
              <div>
                <p className="font-medium text-foreground/90">MA Audiovisual & Mass Media Translation</p>
                <p>Applied Science Private University · 2020–2022</p>
              </div>
              <div>
                <p className="font-medium text-foreground/90">BS English Language & Literature</p>
                <p>Hashemite University · 2011–2014</p>
              </div>
            </div>
          </div>

          <div className="polished-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="font-semibold text-sm">Highlights</h3>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>20+ peer-reviewed publications</p>
              <p>Platinum & Gold Teaching Awards, Kent State</p>
              <p>Phi Sigma Iota Honor Society member</p>
              <p>Principal Investigator on multiple research grants</p>
              <p>Editorial team, Arabic Journal for Translation Studies</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="polished-card p-5 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
              <Code className="w-4 h-4 text-teal-500" />
            </div>
            <h3 className="font-semibold text-sm">Tools I've Built</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {tools.map((t) => (
              <div key={t.name} className="rounded-xl border border-border/50 p-3 bg-muted/20">
                <p className="font-semibold text-xs text-foreground/90">{t.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="polished-card p-5 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-purple-500" />
            </div>
            <h3 className="font-semibold text-sm">Selected Publications</h3>
          </div>
          <div className="space-y-3">
            {selectedPubs.map((p, i) => (
              <div key={i} className="flex gap-3 text-xs" data-testid={`pub-${i}`}>
                <span className="text-muted-foreground/60 font-mono text-[10px] mt-0.5 shrink-0">{p.year}</span>
                <div>
                  <p className="text-foreground/90 leading-relaxed">{p.title}</p>
                  <p className="text-muted-foreground italic mt-0.5">{p.journal}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="text-center text-xs text-muted-foreground/60 mt-8">
          <MapPin className="w-3 h-3 inline mr-1" /> Kent, Ohio
        </motion.div>
      </motion.div>
    </div>
  );
}
