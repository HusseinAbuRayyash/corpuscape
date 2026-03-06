import { motion } from "framer-motion";
import logoSrc from "@assets/image_1772766681448.png";

interface CorpuscapeLogoProps {
  width?: number;
  className?: string;
  animated?: boolean;
}

export function TraduxaLogo({ width = 380, className = "", animated = false }: CorpuscapeLogoProps) {
  const commonClass = `corpuscape-logo ${className}`;

  if (!animated) {
    return (
      <img
        src={logoSrc}
        alt="Corpuscape"
        width={width}
        className={commonClass}
        draggable={false}
      />
    );
  }

  return (
    <motion.img
      src={logoSrc}
      alt="Corpuscape"
      width={width}
      className={commonClass}
      draggable={false}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
