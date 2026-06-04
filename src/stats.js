import { CONTEST, PARTICIPANTS, PROBLEMS } from "./data.js";

export const problemMap = Object.fromEntries(PROBLEMS.map((problem) => [problem.id, problem]));

export const metricOptions = [
  { id: "total", label: "Total", group: "summary", maxPoints: CONTEST.totals.total },
  { id: "theory", label: "Theory total", group: "summary", maxPoints: CONTEST.totals.theory },
  { id: "practical", label: "Practical total", group: "summary", maxPoints: CONTEST.totals.practical },
  ...PROBLEMS.map((problem) => ({
    id: problem.id,
    label: problem.label,
    group: problem.group,
    maxPoints: problem.maxPoints,
    maxRaw: problem.maxRaw,
  })),
];

export function metricMeta(metricId) {
  return metricOptions.find((metric) => metric.id === metricId) || metricOptions[0];
}

export function metricValue(person, metricId, mode = "points") {
  if (metricId === "total") return formatMode(person.totals.total, CONTEST.totals.total, mode);
  if (metricId === "theory") return formatMode(person.totals.theory, CONTEST.totals.theory, mode);
  if (metricId === "practical") return formatMode(person.totals.practical, CONTEST.totals.practical, mode);

  const score = person.scores[metricId];
  const problem = problemMap[metricId];
  if (!score || !problem) return 0;
  if (mode === "raw") return score.raw;
  return formatMode(score.points, problem.maxPoints, mode);
}

export function metricLabel(metricId, mode = "points") {
  const metric = metricMeta(metricId);
  if (mode === "percent") return `${metric.label} (%)`;
  if (mode === "raw" && metric.maxRaw) return `${metric.label} raw`;
  return `${metric.label} points`;
}

export function filteredParticipants(filters) {
  const query = filters.query.trim().toLocaleLowerCase();
  return PARTICIPANTS.filter((person) => {
    const matchesRegion = filters.regions.size === 0 || filters.regions.has(person.region);
    const matchesPrize = filters.prizes.size === 0 || filters.prizes.has(person.prize);
    const haystack = `${person.name} ${person.region} ${person.school}`.toLocaleLowerCase();
    return matchesRegion && matchesPrize && (!query || haystack.includes(query));
  });
}

export function summaryFor(metricId, people, mode = "points") {
  const values = people.map((person) => metricValue(person, metricId, mode));
  return {
    average: mean(values),
    q1: percentile(values, 25),
    median: median(values),
    q3: percentile(values, 75),
    stdev: stdev(values),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function taskDifficulty() {
  return PROBLEMS.map((problem) => {
    const percentages = PARTICIPANTS.map((person) => metricValue(person, problem.id, "percent"));
    return {
      ...problem,
      average: mean(percentages),
      median: median(percentages),
      stdev: stdev(percentages),
    };
  });
}

export function pearson(metricA, metricB, people = PARTICIPANTS) {
  const xs = people.map((person) => metricValue(person, metricA, "percent"));
  const ys = people.map((person) => metricValue(person, metricB, "percent"));
  const mx = mean(xs);
  const my = mean(ys);
  const numerator = xs.reduce((sum, x, index) => sum + (x - mx) * (ys[index] - my), 0);
  const xDenominator = Math.sqrt(xs.reduce((sum, x) => sum + (x - mx) ** 2, 0));
  const yDenominator = Math.sqrt(ys.reduce((sum, y) => sum + (y - my) ** 2, 0));
  return xDenominator && yDenominator ? numerator / (xDenominator * yDenominator) : 0;
}

export function pairwiseCorrelations(metricIds, people) {
  return metricIds.map((a) => metricIds.map((b) => pearson(a, b, people)));
}

export function rankFor(person, metricId, mode = "points") {
  const sorted = [...PARTICIPANTS].sort((a, b) => metricValue(b, metricId, mode) - metricValue(a, metricId, mode));
  return sorted.findIndex((candidate) => candidate.id === person.id) + 1;
}

export function regionBreakdown(people = PARTICIPANTS) {
  const groups = groupBy(people, (person) => person.region);
  return [...groups].map(([region, members]) => ({
    region,
    count: members.length,
    total: mean(members.map((person) => person.totals.total)),
    theory: mean(members.map((person) => person.totals.theory)),
    practical: mean(members.map((person) => person.totals.practical)),
  }));
}

export function topSwings(people = PARTICIPANTS) {
  return people
    .map((person) => ({
      person,
      practicalMinusTheory: metricValue(person, "practical", "percent") - metricValue(person, "theory", "percent"),
    }))
    .sort((a, b) => Math.abs(b.practicalMinusTheory) - Math.abs(a.practicalMinusTheory))
    .slice(0, 8);
}

export function fmt(value, digits = 2) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(value) {
  return `${fmt(value, 1)}%`;
}

function formatMode(points, maxPoints, mode) {
  return mode === "percent" ? (points / maxPoints) * 100 : points;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values) {
  return percentile(values, 50);
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = ((sorted.length - 1) * percentileValue) / 100;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function stdev(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function groupBy(values, keyFn) {
  return values.reduce((groups, value) => {
    const key = keyFn(value);
    groups.set(key, [...(groups.get(key) || []), value]);
    return groups;
  }, new Map());
}
