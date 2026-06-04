import { colors, plot, template } from "./charts.js";
import { fmt, metricLabel, metricMeta, metricValue, summaryFor } from "./stats.js";

export function renderDistribution(people, metricIds, highlightIds, mode, bucketSize) {
  const traces = metricIds.map((metricId, index) => ({
    x: valuesFor(people, metricId, mode),
    type: "histogram",
    name: metricMeta(metricId).label,
    xbins: bucketsFor(metricId, mode, bucketSize),
    opacity: metricIds.length > 1 ? 0.58 : 0.82,
    marker: { color: colors[index % colors.length] },
    hovertemplate: `${metricLabel(metricId, mode)}<br>bucket %{x:.2f}<br>count %{y}<extra></extra>`,
  }));
  const markers = highlightMarkers(people, metricIds, highlightIds, mode);

  plot("distributionChart", traces, {
    ...template,
    margin: { ...template.margin, t: markers.topMargin },
    title: "Distribution",
    barmode: metricIds.length > 1 ? "overlay" : "group",
    shapes: markers.shapes,
    annotations: markers.annotations,
    xaxis: { title: mode === "percent" ? "score percent" : mode },
    yaxis: { title: "participants" },
    legend: { orientation: "h" },
  });
  renderStatsTable("distributionStats", metricIds, people, mode);
  renderBoxPlot(people, metricIds, mode);
}

function highlightMarkers(people, metricIds, highlightIds, mode) {
  const highlights = people.filter((person) => highlightIds.includes(person.id));
  const topMargin = Math.min(170, 44 + highlights.length * metricIds.length * 18);
  const shapes = [];
  const annotations = [];
  highlights.forEach((person, personIndex) => {
    metricIds.forEach((metricId, metricIndex) => {
      addHighlight(shapes, annotations, person, metricId, metricIndex, personIndex, metricIds, mode);
    });
  });
  return { annotations, shapes, topMargin };
}

function addHighlight(shapes, annotations, person, metricId, metricIndex, personIndex, metricIds, mode) {
  const value = metricValue(person, metricId, mode);
  const width = mode === "percent" ? 1.2 : 0.35;
  shapes.push({
    type: "rect",
    x0: value - width,
    x1: value + width,
    y0: 0,
    y1: 1,
    yref: "paper",
    fillcolor: colors[personIndex % colors.length],
    opacity: 0.14,
    line: { width: 0 },
  });
  annotations.push({
    x: value,
    y: 1.02 + (personIndex * metricIds.length + metricIndex) * 0.055,
    yref: "paper",
    text: `${shortName(person.name)} - ${metricMeta(metricId).label.replace(" total", "")}`,
    showarrow: false,
    font: { size: 11, color: "#172033" },
    bgcolor: "rgba(255,255,255,.82)",
  });
}

function renderStatsTable(elementId, metricIds, people, mode) {
  const rows = metricIds.map((metricId) => statsRow(metricId, people, mode));
  document.getElementById(elementId).innerHTML = `<table><thead><tr><th>Metric</th><th>Avg</th><th>Q1</th><th>Median</th><th>Q3</th><th>SD</th><th>Min</th><th>Max</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function statsRow(metricId, people, mode) {
  const stats = summaryFor(metricId, people, mode);
  return `<tr><td>${metricMeta(metricId).label}</td><td>${fmt(stats.average)}</td><td>${fmt(stats.q1)}</td><td>${fmt(stats.median)}</td><td>${fmt(stats.q3)}</td><td>${fmt(stats.stdev)}</td><td>${fmt(stats.min)}</td><td>${fmt(stats.max)}</td></tr>`;
}

function renderBoxPlot(people, metricIds, mode) {
  const traces = metricIds.map((metricId, index) => ({
    y: valuesFor(people, metricId, mode),
    type: "box",
    name: metricMeta(metricId).label,
    boxpoints: "all",
    jitter: 0.28,
    pointpos: 0,
    marker: { color: colors[index % colors.length], size: 6, opacity: 0.62 },
    line: { color: colors[index % colors.length] },
    hovertemplate: `${metricLabel(metricId, mode)}<br>%{y:.2f}<extra></extra>`,
  }));
  plot("boxPlotChart", traces, {
    ...template,
    title: "Percentiles",
    yaxis: { title: mode === "percent" ? "score percent" : mode, rangemode: "tozero" },
    legend: { orientation: "h" },
  });
}

function valuesFor(people, metricId, mode) {
  return people.map((person) => metricValue(person, metricId, mode));
}

function bucketsFor(metricId, mode, bucketSize) {
  const meta = metricMeta(metricId);
  const max = mode === "percent" ? 100 : meta.maxRaw || meta.maxPoints || 100;
  const end = Math.ceil(max / bucketSize) * bucketSize;
  return { start: 0, end, size: bucketSize };
}

function shortName(name) {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.at(-1) : name;
}
