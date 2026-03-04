import { Link } from "wouter";
import { BookOpen, Globe, Brain, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const tracks = [
  {
    title: "Monolingual",
    description: "Explore reception, register, and discourse patterns in a single corpus.",
    example: "Keyword dispersion, collocations, concordance across corpora.",
    icon: BookOpen,
    href: "/monolingual",
    accentClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/30",
    borderClass: "border-indigo-200 dark:border-indigo-800",
    dotClass: "bg-indigo-500",
    letter: "M",
  },
  {
    title: "Bilingual",
    description: "Align parallel corpora, trace translation shifts, export TMX for CAT tools.",
    example: "Domestication strategies, translation universals, aligned pairs.",
    icon: Globe,
    href: "/bilingual",
    accentClass: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-50 dark:bg-teal-950/30",
    borderClass: "border-teal-200 dark:border-teal-800",
    dotClass: "bg-teal-500",
    letter: "B",
  },
  {
    title: "AI Insights",
    description: "Run 31 specialized analyses: industry, criticism, visibility, gender, and more.",
    example: "Domain classification, term clusters, comparative metrics.",
    icon: Brain,
    href: "/ai-insights",
    accentClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-950/30",
    borderClass: "border-purple-200 dark:border-purple-800",
    dotClass: "bg-purple-500",
    letter: "A",
  },
];

export default function Home() {
  return (
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2" data-testid="badge-version">
            <Sparkles className="w-3 h-3" />
            Powered by Gemini AI
          </div>
          <h1 className="text-4xl font-bold tracking-tight" data-testid="text-hero-title">
            TransCorpus AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-subtitle">
            AI-powered corpus linguistics lab for translation studies.
            Analyze, align, and discover patterns in your corpora.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-12">
          {tracks.map((track) => (
            <Link key={track.title} href={track.href}>
              <Card
                className={`group relative p-5 cursor-pointer transition-all duration-200 hover-elevate border ${track.borderClass} ${track.bgClass}`}
                data-testid={`card-track-${track.title.toLowerCase()}`}
              >
                <div className={`w-9 h-9 rounded-md flex items-center justify-center mb-3 ${track.dotClass}`}>
                  <span className="text-white text-sm font-semibold">{track.letter}</span>
                </div>
                <h3 className="font-semibold mb-1.5">{track.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{track.description}</p>
                <p className="text-xs text-muted-foreground/70 italic">{track.example}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={track.accentClass}>Get started</span>
                  <ArrowRight className={`w-3 h-3 ${track.accentClass}`} />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="p-5 bg-card" data-testid="card-quickstart">
          <h3 className="font-semibold text-sm mb-3">Quick Start</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Choose a track above to begin your analysis. No API key setup needed.</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Monolingual:</strong> Stats, keywords, collocations, concordance, n-grams, AI analysis</li>
              <li><strong>Bilingual:</strong> Sentence alignment, translation strategies, universals, TMX export</li>
              <li><strong>AI Insights:</strong> 31 specialized analysis types, domain classification, term clusters</li>
              <li><strong>Export:</strong> CSV, Excel, TMX, Research Report (Markdown)</li>
            </ul>
          </div>
        </Card>

        <div className="mt-8 text-center text-xs text-muted-foreground" data-testid="text-footer">
          TransCorpus AI - ATISA 2026 - Hussein Abu-Rayyash
        </div>
      </div>
    </div>
  );
}
