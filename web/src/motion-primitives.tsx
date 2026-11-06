// Adapted from Velora UI's MIT-licensed orbiting-circles, blur-fade and
// aurora-background components. See THIRD_PARTY_NOTICES.txt.
import { Children, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 22, filter: "blur(5px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -35px 0px" }}
      transition={{
        duration: reduced ? 0 : 0.65,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {children}
    </motion.div>
  );
}

export function OrbitingWords({
  children,
  radius = 180,
  duration = 58,
  reverse = false,
}: {
  children: ReactNode;
  radius?: number;
  duration?: number;
  reverse?: boolean;
}) {
  const items = Children.toArray(children);
  return (
    <>
      <div
        className="orbit-ring"
        style={{ width: radius * 2, height: radius * 2 }}
      />
      {items.map((child, i) => {
        const angle = (360 / items.length) * i;
        return (
          <div
            key={i}
            data-orbit="word"
            className={`orbiting-word ${reverse ? "reverse" : ""}`}
            style={
              {
                "--orbit-duration": `${duration}s`,
                "--orbit-radius": `${radius}px`,
                "--orbit-angle": `${angle}deg`,
              } as CSSProperties
            }
          >
            {child}
          </div>
        );
      })}
    </>
  );
}

export function Aurora() {
  return (
    <div className="lp-aurora" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}
