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

export function TraduxaLogo({ width = 380, className = "", animated = false, iconOnly = false }: CorpuscapeLogoProps) {
  const darkBlue = "#2d3a4e";
  const lightBlue = "#6cb4d0";

  if (iconOnly) {
    const iconSize = width;
    if (animated) {
      return (
        <motion.svg width={iconSize} height={iconSize} viewBox="0 0 120 140" fill="none" className={className} initial="hidden" animate="visible">
          <motion.path
            d="M85 15C75 5 60 0 45 2C25 6 10 22 5 42C2 55 3 68 8 80C10 85 8 90 4 94C1 97 3 102 7 102C18 102 28 98 36 92C40 89 45 88 50 89C55 90 60 91 66 90C88 87 104 68 105 46C106 34 101 23 93 15Z"
            fill={darkBlue}
            variants={iconVariants}
          />
          <motion.path
            d="M70 35C55 28 38 32 28 44C22 52 20 62 23 72C24 75 23 78 21 80C19 82 20 85 23 85C28 85 33 83 37 80C39 78 42 78 44 78C46 79 49 79 51 79C64 77 74 66 75 53C75 46 73 40 70 35Z"
            fill={lightBlue}
            variants={iconVariants}
            custom={1}
          />
        </motion.svg>
      );
    }
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 120 140" fill="none" className={className}>
        <path d="M85 15C75 5 60 0 45 2C25 6 10 22 5 42C2 55 3 68 8 80C10 85 8 90 4 94C1 97 3 102 7 102C18 102 28 98 36 92C40 89 45 88 50 89C55 90 60 91 66 90C88 87 104 68 105 46C106 34 101 23 93 15Z" fill={darkBlue} />
        <path d="M70 35C55 28 38 32 28 44C22 52 20 62 23 72C24 75 23 78 21 80C19 82 20 85 23 85C28 85 33 83 37 80C39 78 42 78 44 78C46 79 49 79 51 79C64 77 74 66 75 53C75 46 73 40 70 35Z" fill={lightBlue} />
      </svg>
    );
  }

  const h = width * 0.38;
  const textLetters = "CORPUSCAPE";
  const letterSpacing = width * 0.078;
  const textStartX = width * 0.08;
  const textY = h * 0.92;
  const fontSize = width * 0.13;
  const iconScale = width * 0.0028;
  const iconX = width * 0.35;
  const iconTopY = h * 0.02;

  if (!animated) {
    return (
      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <g transform={`translate(${iconX}, ${iconTopY}) scale(${iconScale})`}>
          <path d="M85 15C75 5 60 0 45 2C25 6 10 22 5 42C2 55 3 68 8 80C10 85 8 90 4 94C1 97 3 102 7 102C18 102 28 98 36 92C40 89 45 88 50 89C55 90 60 91 66 90C88 87 104 68 105 46C106 34 101 23 93 15Z" fill={darkBlue} />
          <path d="M70 35C55 28 38 32 28 44C22 52 20 62 23 72C24 75 23 78 21 80C19 82 20 85 23 85C28 85 33 83 37 80C39 78 42 78 44 78C46 79 49 79 51 79C64 77 74 66 75 53C75 46 73 40 70 35Z" fill={lightBlue} />
        </g>
        <text
          x={textStartX}
          y={textY}
          fill={lightBlue}
          fontFamily="'Architects Daughter', cursive"
          fontSize={fontSize}
          fontWeight="400"
          letterSpacing={letterSpacing * 0.15}
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
      viewBox={`0 0 ${width} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial="hidden"
      animate="visible"
    >
      <g transform={`translate(${iconX}, ${iconTopY}) scale(${iconScale})`}>
        <motion.path
          d="M85 15C75 5 60 0 45 2C25 6 10 22 5 42C2 55 3 68 8 80C10 85 8 90 4 94C1 97 3 102 7 102C18 102 28 98 36 92C40 89 45 88 50 89C55 90 60 91 66 90C88 87 104 68 105 46C106 34 101 23 93 15Z"
          fill={darkBlue}
          variants={iconVariants}
        />
        <motion.path
          d="M70 35C55 28 38 32 28 44C22 52 20 62 23 72C24 75 23 78 21 80C19 82 20 85 23 85C28 85 33 83 37 80C39 78 42 78 44 78C46 79 49 79 51 79C64 77 74 66 75 53C75 46 73 40 70 35Z"
          fill={lightBlue}
          variants={iconVariants}
          custom={1}
        />
      </g>
      {textLetters.split("").map((letter, i) => (
        <motion.text
          key={i}
          x={textStartX + i * letterSpacing}
          y={textY}
          fill={lightBlue}
          fontFamily="'Architects Daughter', cursive"
          fontSize={fontSize}
          fontWeight="400"
          custom={i}
          variants={letterVariants}
        >
          {letter}
        </motion.text>
      ))}
    </motion.svg>
  );
}
