import { motion } from "framer-motion";
import { ExternalLink, Mail } from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
      <motion.div initial="hidden" animate="show" variants={stagger}>
        <motion.div variants={fadeUp} className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 via-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-5 shadow-lg text-white text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            H
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }} data-testid="text-about-name">
            Hussein Abu-Rayyash
          </h1>
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

        <motion.div variants={fadeUp} className="polished-card p-6 md:p-8">
          <p className="text-sm leading-relaxed text-foreground/90" data-testid="text-about-bio">
            I'm a PhD candidate in translation studies and a Graduate Teaching Assistant at Kent State University,
            and I also serve as a visiting instructor at Miami University. My work sits at the intersection of
            corpus linguistics, cognitive translation studies, and AI — I'm especially interested in how we can
            build better tools for translators and researchers.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
