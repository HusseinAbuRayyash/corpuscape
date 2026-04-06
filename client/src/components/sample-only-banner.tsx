import { AlertTriangle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface SampleOnlyBannerProps {
  sampleCount: number;
  externalUrl?: string;
  corpusName?: string;
}

export function SampleOnlyBanner({ sampleCount, externalUrl, corpusName }: SampleOnlyBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex items-start gap-3 rounded-xl border border-amber-300/60 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm"
      data-testid="banner-sample-only"
    >
      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="space-y-0.5">
        <p className="font-semibold text-amber-800 dark:text-amber-300">
          Sample data only — analysis covers {sampleCount} sentence{sampleCount !== 1 ? "s" : ""}
        </p>
        <p className="text-amber-700/80 dark:text-amber-400/80 text-xs leading-relaxed">
          This is a publicly referenced corpus. Only a small preview is stored here.
          For full-scale analysis, download the complete dataset from the source and upload it directly.
          {externalUrl && (
            <>
              {" "}
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
                data-testid="link-download-corpus"
              >
                Download full corpus
                <ExternalLink className="w-3 h-3" />
              </a>
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
}
