import { motion } from "framer-motion";

interface TraduxaLogoProps {
  width?: number;
  className?: string;
  animated?: boolean;
}

const letterVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const T = "M0 10h95v26H60v99H35V36H0V10z";

const R = [
  "M100 10h55c22 0 36 14 36 35v2c0 15-8 26-20 31l24 57h-30l-21-52h-14v52h-30V10z",
  "M130 36v24h18c8 0 13-4 13-12v-1c0-7-5-11-13-11h-18z",
].join(" ");

const A1 = [
  "M200 135l30-125h32l30 125h-28l-6-26h-26l-6 26h-26z",
  "M237 85h18l-9-42-9 42z",
].join(" ");

const D = [
  "M300 10h40c30 0 50 20 50 52v1c0 33-20 52-50 52h-40V10z",
  "M330 36v53h12c14 0 20-9 20-26v-1c0-17-6-26-20-26h-12z",
].join(" ");

const U = "M400 10h30v70c0 10 5 16 15 16s15-6 15-16V10h30v73c0 30-18 45-45 45s-45-15-45-45V10z";

const X = "M500 65l-28-55h32l14 30 14-30h30l-28 55 30 60h-32l-16-34-16 34h-30l30-60z";

const A2 = [
  "M560 135l30-125h32l30 125h-28l-6-26h-26l-6 26h-26z",
  "M597 85h18l-9-42-9 42z",
].join(" ");

const ALL_PATHS = [T, R, A1, D, U, X, A2];

export function TraduxaLogo({ width = 380, className = "", animated = false }: TraduxaLogoProps) {
  const color = "#2a7f8f";

  if (!animated) {
    return (
      <svg width={width} height={width * 0.22} viewBox="0 0 652 145" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <g fill={color} fillRule="evenodd">
          {ALL_PATHS.map((d, i) => <path key={i} d={d} />)}
        </g>
      </svg>
    );
  }

  return (
    <motion.svg
      width={width}
      height={width * 0.22}
      viewBox="0 0 652 145"
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
