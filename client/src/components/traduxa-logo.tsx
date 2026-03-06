import { motion } from "framer-motion";

interface CorpuscapeLogoProps {
  width?: number;
  className?: string;
  animated?: boolean;
  iconOnly?: boolean;
}

const letterVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const outerBubble = "M85 15C75 5 60 0 45 2C25 6 10 22 5 42C2 55 3 68 8 80C10 85 8 90 4 94C1 97 3 102 7 102C18 102 28 98 36 92C40 89 45 88 50 89C55 90 60 91 66 90C88 87 104 68 105 46C106 34 101 23 93 15Z";
const innerBubble = "M70 35C55 28 38 32 28 44C22 52 20 62 23 72C24 75 23 78 21 80C19 82 20 85 23 85C28 85 33 83 37 80C39 78 42 78 44 78C46 79 49 79 51 79C64 77 74 66 75 53C75 46 73 40 70 35Z";

export function TraduxaLogo({ width = 380, className = "", animated = false, iconOnly = false }: CorpuscapeLogoProps) {
  const darkBubble = "#1e2d3d";
  const tealAccent = "#06d6a0";

  if (iconOnly) {
    const iconSize = width;
    const gradId = "icon-grad-" + Math.random().toString(36).slice(2, 6);
    if (animated) {
      return (
        <motion.svg width={iconSize} height={iconSize} viewBox="0 0 120 120" fill="none" className={className} initial="hidden" animate="visible">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3ec6c0" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <motion.path d={outerBubble} fill={darkBubble} variants={iconVariants} />
          <motion.path d={innerBubble} fill={`url(#${gradId})`} variants={iconVariants} custom={1} />
        </motion.svg>
      );
    }
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 120 120" fill="none" className={className}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06d6a0" />
            <stop offset="100%" stopColor="#00b4d8" />
          </linearGradient>
        </defs>
        <path d={outerBubble} fill={darkBubble} />
        <path d={innerBubble} fill={`url(#${gradId})`} />
      </svg>
    );
  }

  const vbW = 500;
  const vbH = 220;
  const h = width * (vbH / vbW);

  const iconCenterX = vbW / 2;
  const iconTopY = 0;
  const iconSc = 1.3;

  const textY = 210;
  const fontSize = 46;
  const textLetters = "CORPUSCAPE";
  const gradIdText = "text-grad";
  const gradIdBubble = "bubble-grad";

  if (!animated) {
    return (
      <svg width={width} height={h} viewBox={`0 0 ${vbW} ${vbH}`} fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <linearGradient id={gradIdText} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06d6a0" />
            <stop offset="50%" stopColor="#00b4d8" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id={gradIdBubble} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06d6a0" />
            <stop offset="100%" stopColor="#00b4d8" />
          </linearGradient>
        </defs>
        <g transform={`translate(${iconCenterX - 55 * iconSc}, ${iconTopY}) scale(${iconSc})`}>
          <path d={outerBubble} fill={darkBubble} />
          <path d={innerBubble} fill={`url(#${gradIdBubble})`} />
        </g>
        <text
          x={vbW / 2}
          y={textY}
          textAnchor="middle"
          fill={`url(#${gradIdText})`}
          fontFamily="'Architects Daughter', cursive"
          fontSize={fontSize}
          fontWeight="700"
        >
          {textLetters}
        </text>
      </svg>
    );
  }

  return (
    <motion.svg
      width={width}
      height={h}
      viewBox={`0 0 ${vbW} ${vbH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial="hidden"
      animate="visible"
    >
      <defs>
        <linearGradient id={gradIdText} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06d6a0" />
          <stop offset="50%" stopColor="#00b4d8" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={gradIdBubble} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06d6a0" />
          <stop offset="100%" stopColor="#00b4d8" />
        </linearGradient>
      </defs>
      <g transform={`translate(${iconCenterX - 55 * iconSc}, ${iconTopY}) scale(${iconSc})`}>
        <motion.path d={outerBubble} fill={darkBubble} variants={iconVariants} />
        <motion.path d={innerBubble} fill={`url(#${gradIdBubble})`} variants={iconVariants} custom={1} />
      </g>
      {textLetters.split("").map((letter, i) => (
        <motion.text
          key={i}
          x={75 + i * 39}
          y={textY}
          fill={`url(#${gradIdText})`}
          fontFamily="'Architects Daughter', cursive"
          fontSize={fontSize}
          fontWeight="700"
          custom={i}
          variants={letterVariants}
        >
          {letter}
        </motion.text>
      ))}
    </motion.svg>
  );
}
