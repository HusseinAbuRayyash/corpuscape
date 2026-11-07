/** Upper-tail chi-square probability for one degree of freedom, Q(1/2, g2/2).
 * A series is used near zero and a continued fraction in the upper tail.
 * logP remains useful when the double-precision probability underflows.
 */
export function chiSquareOne(g2: number): { p: number; logP: number } {
  if (!Number.isFinite(g2) || g2 < 0)
    throw new Error("G² must be finite and non-negative.");
  if (g2 === 0) return { p: 1, logP: 0 };
  const x = g2 / 2,
    a = 0.5,
    logFactor = -x + a * Math.log(x) - Math.log(Math.PI) / 2;
  if (x < 1.5) {
    let term = 1 / a,
      sum = term,
      ap = a;
    for (let i = 0; i < 10000; i++) {
      ap++;
      term *= x / ap;
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    const lower = Math.exp(logFactor) * sum;
    const p = Math.max(0, Math.min(1, 1 - lower));
    return { p, logP: Math.log1p(-lower) };
  }
  const tiny = 1e-300;
  let b = x + 1 - a,
    c = 1 / tiny,
    d = 1 / b,
    h = d;
  for (let i = 1; i < 10000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  const logP = logFactor + Math.log(h);
  return { p: Math.exp(logP), logP };
}
/** Benjamini–Hochberg adjusted p-values; original row order is retained. */
export function benjaminiHochberg(pValues: number[]) {
  if (pValues.some((p) => !Number.isFinite(p) || p < 0 || p > 1))
    throw new Error("P-values must be between zero and one.");
  const ordered = pValues
      .map((p, index) => ({ p, index }))
      .sort((a, b) => a.p - b.p),
    result = new Array<number>(pValues.length);
  let minimum = 1;
  for (let i = ordered.length - 1; i >= 0; i--) {
    // Roundoff in p*m/m must not make an adjusted probability smaller than p.
    minimum = Math.min(
      minimum,
      Math.max(ordered[i].p, (ordered[i].p * ordered.length) / (i + 1)),
    );
    result[ordered[i].index] = minimum;
  }
  return result;
}
