export function parallelReviewFlags(
  pairs: { source: string; target: string }[],
): string[][] {
  const counts = new Map<string, number>();
  for (const p of pairs) {
    const key = JSON.stringify([p.source, p.target]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return pairs.map((p) =>
    [
      !p.source.trim() ? "Missing source" : "",
      !p.target.trim() ? "Missing target" : "",
      p.source.trim() && p.source.trim() === p.target.trim()
        ? "Identical segments"
        : "",
      (counts.get(JSON.stringify([p.source, p.target])) ?? 0) > 1
        ? "Duplicate pair"
        : "",
    ].filter(Boolean),
  );
}
