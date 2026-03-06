import { motion } from "framer-motion";

interface CorpuscapeLogoProps {
  width?: number;
  className?: string;
  animated?: boolean;
}

const letterVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const C1 = "M55 10c30 0 48 18 48 30h-28c-2-6-9-10-20-10-16 0-25 12-25 32v1c0 20 9 32 25 32 12 0 18-5 21-12h28c-3 15-20 32-49 32C22 115 0 92 0 63v-1C0 32 22 10 55 10z";
const O = "M155 10c35 0 57 23 57 53v1c0 30-22 51-57 51s-57-21-57-51v-1c0-30 22-53 57-53zm0 26c-15 0-25 11-25 27v1c0 16 10 27 25 27s25-11 25-27v-1c0-16-10-27-25-27z";
const R = [
  "M220 12h55c22 0 36 14 36 35v2c0 15-8 26-20 31l24 55h-30l-21-50h-14v50h-30V12z",
  "M250 38v24h18c8 0 13-4 13-12v-1c0-7-5-11-13-11h-18z",
].join(" ");
const P = [
  "M320 12h55c24 0 38 14 38 37v1c0 24-14 38-38 38h-25v47h-30V12z",
  "M350 38v26h18c9 0 15-5 15-13v-1c0-8-6-12-15-12h-18z",
].join(" ");
const U = "M420 12h30v70c0 10 5 16 15 16s15-6 15-16V12h30v73c0 30-18 45-45 45s-45-15-45-45V12z";
const S = "M560 40c0-2-2-6-5-9-4-3-9-5-16-5-10 0-16 4-16 10 0 7 7 10 20 14 22 6 38 14 38 36 0 22-18 34-46 34-26 0-46-12-49-36h28c1 5 4 9 8 11 4 3 9 4 14 4 11 0 17-4 17-11 0-8-8-11-22-16-21-7-36-14-36-34 0-22 18-33 44-33 26 0 43 12 47 35h-26z";
const C2 = "M660 10c30 0 48 18 48 30h-28c-2-6-9-10-20-10-16 0-25 12-25 32v1c0 20 9 32 25 32 12 0 18-5 21-12h28c-3 15-20 32-49 32-33 0-55-23-55-52v-1c0-30 22-52 55-52z";
const A = [
  "M715 135l30-123h32l30 123h-28l-6-26h-26l-6 26h-26z",
  "M752 85h18l-9-42-9 42z",
].join(" ");
const P2 = [
  "M815 12h55c24 0 38 14 38 37v1c0 24-14 38-38 38h-25v47h-30V12z",
  "M845 38v26h18c9 0 15-5 15-13v-1c0-8-6-12-15-12h-18z",
].join(" ");
const E = "M915 12h75v24h-45v18h38v22h-38v19h46v24h-76V12z";

const ALL_PATHS = [C1, O, R, P, U, S, C2, A, P2, E];

export function TraduxaLogo({ width = 380, className = "", animated = false }: CorpuscapeLogoProps) {
  const color = "#2a7f8f";

  if (!animated) {
    return (
      <svg width={width} height={width * 0.145} viewBox="0 0 990 145" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <g fill={color} fillRule="evenodd">
          {ALL_PATHS.map((d, i) => <path key={i} d={d} />)}
        </g>
      </svg>
    );
  }

  return (
    <motion.svg
      width={width}
      height={width * 0.145}
      viewBox="0 0 990 145"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial="hidden"
      animate="visible"
    >
      {ALL_PATHS.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill={color}
          fillRule="evenodd"
          custom={i}
          variants={letterVariants}
        />
      ))}
    </motion.svg>
  );
}
