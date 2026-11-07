import { chiSquareOne } from "./statistics";
import type { SubtitleCue } from "./import-parsers";

export type TimeRange = { start: number; end: number };
export interface ParallelPair {
  source: string;
  target: string;
  note: string;
  confidence?: number;
  sourceTime?: TimeRange;
  targetTime?: TimeRange;
}

const moves = [
  [1, 1, 0.89], [1, 0, 0.01], [0, 1, 0.01],
  [2, 1, 0.0445], [1, 2, 0.0445], [2, 2, 0.011],
] as const;

export function alignSentences(source: string, target: string, sourceLocale: string, targetLocale: string): ParallelPair[] {
  const split = (text: string, locale: string) =>
    [...new Intl.Segmenter(locale === "und" ? undefined : locale, { granularity: "sentence" }).segment(text)]
      .map(({ segment }) => segment.trim()).filter(Boolean);
  const a = split(source, sourceLocale), b = split(target, targetLocale);
  const n = a.length, m = b.length;
  if (!n || !m) return (n ? a : b).map((text) => ({
    source: n ? text : "", target: m ? text : "", note: "", confidence: 0,
  }));
  const prefix = (sentences: string[]) => {
    const sums = [0];
    for (const text of sentences) sums.push(sums.at(-1)! + [...text].length);
    return sums;
  };
  const aLengths = prefix(a), bLengths = prefix(b);
  const ratio = bLengths[m] / aLengths[n];
  const match = (i: number, j: number, di: number, dj: number) => {
    const sa = aLengths[i] - aLengths[i - di], sb = bLengths[j] - bLengths[j - dj];
    const mean = (sa + sb / ratio) / 2;
    const delta = (sb - sa * ratio) / Math.sqrt(6.8 * mean);
    return chiSquareOne(delta * delta).logP;
  };
  // Backtracking uses one byte per cell. Only three rows of scores are needed.
  // For long texts search a corridor around the expected sentence ratio.
  for (let band = Math.max(64, Math.ceil(m / n) * 2); ; band *= 2) {
    const offsets = new Int32Array(n + 1);
    const trace: Uint8Array[] = [];
    const costs: Float64Array[] = [];
    for (let i = 0; i <= n; i++) {
      const center = Math.round(i * m / n);
      const lo = Math.max(0, center - band), hi = Math.min(m, center + band);
      offsets[i] = lo;
      const cost = new Float64Array(hi - lo + 1).fill(Infinity);
      const row = new Uint8Array(cost.length);
      costs[i % 3] = cost;
      trace.push(row);
      for (let j = lo; j <= hi; j++) {
        const k = j - lo;
        if (i === 0 && j === 0) { cost[k] = 0; continue; }
        for (const [index, [di, dj, prior]] of moves.entries()) {
          if (di > i || dj > j) continue;
          const previous = costs[(i - di) % 3][j - dj - offsets[i - di]];
          if (!Number.isFinite(previous)) continue;
          const candidate = previous - Math.log(prior) - match(i, j, di, dj);
          if (candidate < cost[k]) { cost[k] = candidate; row[k] = index + 1; }
        }
      }
    }
    let i = n, j = m, touchedEdge = false;
    const pairs: ParallelPair[] = [];
    while (i || j) {
      const row = trace[i], k = j - offsets[i];
      const move = moves[row[k] - 1];
      if (!move) break;
      if ((k === 0 && j > 0) || (k === row.length - 1 && j < m)) touchedEdge = true;
      const [di, dj] = move;
      pairs.push({
        source: a.slice(i - di, i).join(" "),
        target: b.slice(j - dj, j).join(" "),
        note: "",
        confidence: di && dj ? Math.exp(match(i, j, di, dj)) * (di === 1 && dj === 1 ? 1 : 0.7) : 0,
      });
      i -= di;
      j -= dj;
    }
    if (!i && !j && (!touchedEdge || band >= m)) return pairs.reverse();
  }
}

export function pairSubtitles(source: SubtitleCue[], target: SubtitleCue[]): ParallelPair[] {
  const a = [...source].sort((x, y) => x.start - y.start);
  const b = [...target].sort((x, y) => x.start - y.start);
  const candidates: { i: number; j: number; score: number; overlap: number }[] = [];
  let first = 0;
  for (const [i, cue] of a.entries()) {
    while (first < b.length && b[first].end <= cue.start) first++;
    for (let j = first; j < b.length && b[j].start < cue.end; j++) {
      const overlap = Math.min(cue.end, b[j].end) - Math.max(cue.start, b[j].start);
      const score = overlap / Math.min(cue.end - cue.start, b[j].end - b[j].start);
      if (score >= 0.5) candidates.push({ i, j, score, overlap });
    }
  }
  const aLinks = a.map(() => [] as number[]), bLinks = b.map(() => [] as number[]);
  for (const { i, j } of candidates.sort((x, y) => y.score - x.score || y.overlap - x.overlap)) {
    const left = aLinks[i], right = bLinks[j];
    if (left.length >= 2 || right.length >= 2 || (left.length && right.length)) continue;
    if (left.some((other) => bLinks[other].length > 1) || right.some((other) => aLinks[other].length > 1)) continue;
    left.push(j);
    right.push(i);
  }
  const group = (indices: number[], cues: SubtitleCue[]) =>
    [...indices].sort((x, y) => x - y).map((index) => cues[index]);
  const row = (left: SubtitleCue[], right: SubtitleCue[]): ParallelPair => {
    const range = (cues: SubtitleCue[]) => cues.length ? {
      start: Math.min(...cues.map(({ start }) => start)),
      end: Math.max(...cues.map(({ end }) => end)),
    } : undefined;
    return {
      source: left.map(({ text }) => text).join("\n"),
      target: right.map(({ text }) => text).join("\n"),
      note: "",
      sourceTime: range(left),
      targetTime: range(right),
    };
  };
  const pairs = a.flatMap((cue, i) => {
    const targets = aLinks[i];
    if (!targets.length) return [row([cue], [])];
    const sources = bLinks[targets[0]];
    if (i !== Math.min(...sources)) return [];
    return [row(group(sources, a), group(targets, b))];
  });
  b.forEach((cue, j) => { if (!bLinks[j].length) pairs.push(row([], [cue])); });
  const start = (pair: ParallelPair) => Math.min(pair.sourceTime?.start ?? Infinity, pair.targetTime?.start ?? Infinity);
  return pairs.sort((x, y) => start(x) - start(y));
}

export function subtitleTimestamp(ms: number) {
  const hours = Math.floor(ms / 3600000);
  return `${String(hours).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
}
