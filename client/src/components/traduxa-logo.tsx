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

export function TraduxaLogo({ width = 380, className = "", animated = false }: TraduxaLogoProps) {
  const color = "#2a7f8f";

  if (!animated) {
    return (
      <svg width={width} height={width * 0.28} viewBox="0 0 520 145" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <g fill={color}>
          <path d="M0 10h100v28H62v97H38V38H0V10z" />
          <path d="M95 38h30v20h18c16 0 28 10 28 28v2c0 18-12 28-28 28h-18v19h-30V38zm30 52h12c6 0 10-4 10-11v-2c0-7-4-11-10-11h-12v24z" />
          <path d="M178 38h34l28 97h-30l-4-18h-24l-4 18h-28l28-97zm24 55l-7-34h-2l-7 34h16z" />
          <path d="M248 38h36c28 0 46 16 46 48v1c0 32-18 48-46 48h-36V38zm30 69h8c12 0 18-7 18-21v-1c0-14-6-21-18-21h-8v43z" />
          <path d="M340 38h30v57c0 8 4 13 12 13s12-5 12-13V38h30v60c0 28-16 40-42 40s-42-12-42-40V38z" />
          <path d="M432 87l-30-49h34l14 26 14-26h32l-30 49 32 52h-34l-16-28-16 28h-32l32-52z" />
          <path d="M488 38h34l28 97h-30l-4-18h-24l-4 18h-28l28-97zm24 55l-7-34h-2l-7 34h16z" />
        </g>
      </svg>
    );
  }

  const letters = [
    { d: "M0 10h100v28H62v97H38V38H0V10z" },
    { d: "M95 38h30v20h18c16 0 28 10 28 28v2c0 18-12 28-28 28h-18v19h-30V38zm30 52h12c6 0 10-4 10-11v-2c0-7-4-11-10-11h-12v24z" },
    { d: "M178 38h34l28 97h-30l-4-18h-24l-4 18h-28l28-97zm24 55l-7-34h-2l-7 34h16z" },
    { d: "M248 38h36c28 0 46 16 46 48v1c0 32-18 48-46 48h-36V38zm30 69h8c12 0 18-7 18-21v-1c0-14-6-21-18-21h-8v43z" },
    { d: "M340 38h30v57c0 8 4 13 12 13s12-5 12-13V38h30v60c0 28-16 40-42 40s-42-12-42-40V38z" },
    { d: "M432 87l-30-49h34l14 26 14-26h32l-30 49 32 52h-34l-16-28-16 28h-32l32-52z" },
    { d: "M488 38h34l28 97h-30l-4-18h-24l-4 18h-28l28-97zm24 55l-7-34h-2l-7 34h16z" },
  ];

  return (
    <motion.svg
      width={width}
      height={width * 0.28}
      viewBox="0 0 520 145"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial="hidden"
      animate="visible"
    >
      {letters.map((letter, i) => (
        <motion.path
          key={i}
          d={letter.d}
          fill={color}
          custom={i}
          variants={letterVariants}
        />
      ))}
    </motion.svg>
  );
}
