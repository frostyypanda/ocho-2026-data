import {
  fmt,
  metricLabel,
  metricMeta,
  metricOptions,
  metricValue,
  pairwiseCorrelations,
  pearson,
  pct,
  regionBreakdown,
  summaryFor,
  taskDifficulty,
  topSwings,
} from "./stats.js";

const colors = ["#2563eb", "#dc7b22", "#0f8f72", "#b83280", "#6366f1", "#a16207", "#0891b2", "#be123c"];
const template = {
  paper_bgcolor: "rgba(255,255,255,0)",
  plot_bgcolor: "rgba(255,255,255,0)",
  font: { family: "Inter, system-ui, sans-serif", color: "#172033" },
  margin: { t: 34, r: 24, b: 46, l: 56 },
};
const config = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] };

export function renderOverview(people) {
  const ranked = [...people].sort((a, b) => b.totals.total - a.totals.total);
  plot("leaderboardChart", [
    {
      x: ranked.map((person) => person.totals.theory),
      y: ranked.map((person) => person.name),
      name: "Theory",
      type: "bar",
      orientation: "h",
      marker: { color: "#2f6fbb" },
      hovertemplate: "%{y}<br>Theory %{x:.2f}<extra></extra>",
    },
    {
      x: ranked.map((person) => person.totals.practical),
      y: ranked.map((person) => person.name),
      name: "Practical",
      type: "bar",
      orientation: "h",
      marker: { color: "#d56b30" },
      hovertemplate: "%{y}<br>Practical %{x:.2f}<extra></extra>",
    },
  ], {
    ...template,
    title: "Leaderboard Composition",
    barmode: "stack",
    height: Math.max(420, people.length * 22),
    yaxis: { automargin: true },
    xaxis: { title: "points", range: [0, 100] },
    legend: { orientation: "h" },
  });

  const difficulty = taskDifficulty();
  plot("difficultyChart", [
    {
      x: difficulty.map((problem) => problem.label),
      y: difficulty.map((problem) => problem.average),
      type: "bar",
      marker: { color: difficulty.map((problem) => (problem.group === "theory" ? "#2f6fbb" : "#d56b30")) },
      customdata: difficulty.map((problem) => [problem.median, problem.stdev]),
      hovertemplate: "%{x}<br>avg %{y:.1f}%<br>median %{customdata[0]:.1f}%<br>sd %{customdata[1]:.1f}<extra></extra>",
    },
  ], {
    ...template,
    title: "Problem Difficulty",
    yaxis: { title: "average score", ticksuffix: "%", range: [0, 100] },
  });

  const regions = regionBreakdown(people).sort((a, b) => b.total - a.total);
  plot("regionChart", [
    {
      x: regions.map((region) => region.region),
      y: regions.map((region) => region.total),
      type: "bar",
      marker: { color: "#0f8f72" },
      customdata: regions.map((region) => [region.count, region.theory, region.practical]),
      hovertemplate: "%{x}<br>avg total %{y:.2f}<br>people %{customdata[0]}<br>theory %{customdata[1]:.2f}<br>practical %{customdata[2]:.2f}<extra></extra>",
    },
  ], {
    ...template,
    title: "Region Averages",
    yaxis: { title: "average total" },
  });

  const swings = topSwings(people);
  plot("swingChart", [
    {
      x: swings.map((entry) => entry.practicalMinusTheory),
      y: swings.map((entry) => entry.person.name),
      type: "bar",
      orientation: "h",
      marker: { color: swings.map((entry) => (entry.practicalMinusTheory >= 0 ? "#0f8f72" : "#b83280")) },
      hovertemplate: "%{y}<br>practical - theory %{x:.1f} pp<extra></extra>",
    },
  ], {
    ...template,
    title: "Biggest Theory/Practical Splits",
    xaxis: { title: "percentage-point difference", zeroline: true },
    yaxis: { automargin: true },
  });
}

export function renderDistribution(people, metricIds, highlightIds, mode, bins) {
  const traces = metricIds.map((metricId, index) => ({
    x: people.map((person) => metricValue(person, metricId, mode)),
    type: "histogram",
    name: metricMeta(metricId).label,
    nbinsx: bins,
    opacity: metricIds.length > 1 ? 0.58 : 0.82,
    marker: { color: colors[index % colors.length] },
    hovertemplate: `${metricLabel(metricId, mode)}<br>%{x:.2f}<br>count %{y}<extra></extra>`,
  }));
  const highlights = people.filter((person) => highlightIds.includes(person.id));
  const highlightCount = highlights.length * metricIds.length;
  const topMargin = Math.min(170, 44 + highlightCount * 18);
  const shapes = [];
  const annotations = [];

  highlights.forEach((person, personIndex) => {
    metricIds.forEach((metricId, metricIndex) => {
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
    });
  });

  plot("distributionChart", traces, {
    ...template,
    margin: { ...template.margin, t: topMargin },
    title: "Distribution",
    barmode: metricIds.length > 1 ? "overlay" : "group",
    shapes,
    annotations,
    xaxis: { title: mode === "percent" ? "score percent" : mode },
    yaxis: { title: "participants" },
    legend: { orientation: "h" },
  });
  renderStatsTable("distributionStats", metricIds, people, mode);
}

export function renderPeopleComparison(people, selectedIds, metricIds, mode) {
  const selected = selectedIds.length
    ? people.filter((person) => selectedIds.includes(person.id))
    : people.slice(0, 5);
  const traces = selected.map((person, index) => ({
    x: metricIds.map((metricId) => metricMeta(metricId).label),
    y: metricIds.map((metricId) => metricValue(person, metricId, mode)),
    type: "bar",
    name: person.name,
    marker: { color: colors[index % colors.length] },
    hovertemplate: "%{x}<br>%{y:.2f}<extra>%{fullData.name}</extra>",
  }));
  plot("peopleBarChart", traces, {
    ...template,
    title: "Selected People by Task",
    barmode: "group",
    yaxis: { title: mode === "percent" ? "percent" : mode },
    legend: { orientation: "h" },
  });

  const radarTasks = metricIds.filter((metricId) => metricMeta(metricId).maxPoints).slice(0, 11);
  plot("peopleRadarChart", selected.map((person, index) => ({
    type: "scatterpolar",
    r: radarTasks.map((metricId) => metricValue(person, metricId, "percent")),
    theta: radarTasks.map((metricId) => metricMeta(metricId).label),
    fill: "toself",
    name: person.name,
    line: { color: colors[index % colors.length] },
  })), {
    ...template,
    title: "Profile Shape",
    polar: { radialaxis: { visible: true, range: [0, 100], ticksuffix: "%" } },
    legend: { orientation: "h" },
  });
}

export function renderCorrelation(people, metricX, metricY) {
  const xs = people.map((person) => metricValue(person, metricX, "percent"));
  const ys = people.map((person) => metricValue(person, metricY, "percent"));
  const fit = linearFit(xs, ys);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const r = pearson(metricX, metricY, people);

  plot("correlationChart", [
    {
      x: xs,
      y: ys,
      text: people.map((person) => person.name),
      mode: "markers+text",
      type: "scatter",
      textposition: "top center",
      marker: { color: people.map((person) => person.totals.total), colorscale: "Portland", size: 11, line: { color: "#fff", width: 1 } },
      hovertemplate: "%{text}<br>x %{x:.1f}%<br>y %{y:.1f}%<extra></extra>",
    },
    {
      x: [minX, maxX],
      y: [fit(minX), fit(maxX)],
      mode: "lines",
      name: `r = ${fmt(r, 3)}`,
      line: { color: "#172033", dash: "dot" },
      hoverinfo: "skip",
    },
  ], {
    ...template,
    title: "Correlation",
    xaxis: { title: metricLabel(metricX, "percent"), ticksuffix: "%", range: [0, 105] },
    yaxis: { title: metricLabel(metricY, "percent"), ticksuffix: "%", range: [0, 105] },
  });

  const stat = document.getElementById("correlationStat");
  stat.innerHTML = `<strong>${fmt(r, 3)}</strong><span>${corrLabel(r)}</span><span>${people.length} people</span>`;
}

export function renderHeatmap(people, metricIds) {
  const matrix = pairwiseCorrelations(metricIds, people);
  plot("heatmapChart", [
    {
      z: matrix,
      x: metricIds.map((id) => metricMeta(id).label),
      y: metricIds.map((id) => metricMeta(id).label),
      type: "heatmap",
      colorscale: "RdBu",
      zmin: -1,
      zmax: 1,
      hovertemplate: "%{y} vs %{x}<br>r %{z:.3f}<extra></extra>",
    },
  ], {
    ...template,
    title: "Correlation Matrix",
    margin: { t: 34, r: 20, b: 110, l: 110 },
  });
}

function renderStatsTable(elementId, metricIds, people, mode) {
  const rows = metricIds.map((metricId) => {
    const stats = summaryFor(metricId, people, mode);
    return `<tr><td>${metricMeta(metricId).label}</td><td>${fmt(stats.average)}</td><td>${fmt(stats.median)}</td><td>${fmt(stats.stdev)}</td><td>${fmt(stats.min)}</td><td>${fmt(stats.max)}</td></tr>`;
  });
  document.getElementById(elementId).innerHTML = `<table><thead><tr><th>Metric</th><th>Avg</th><th>Median</th><th>SD</th><th>Min</th><th>Max</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function plot(id, traces, layout) {
  const node = document.getElementById(id);
  if (node && window.Plotly) window.Plotly.react(node, traces, layout, config);
}

function linearFit(xs, ys) {
  const n = xs.length;
  const sx = xs.reduce((sum, x) => sum + x, 0);
  const sy = ys.reduce((sum, y) => sum + y, 0);
  const sxy = xs.reduce((sum, x, index) => sum + x * ys[index], 0);
  const sx2 = xs.reduce((sum, x) => sum + x * x, 0);
  const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx || 1);
  const intercept = sy / n - slope * (sx / n);
  return (x) => slope * x + intercept;
}

function corrLabel(r) {
  const strength = Math.abs(r) > 0.75 ? "strong" : Math.abs(r) > 0.45 ? "moderate" : "weak";
  return `${strength} ${r >= 0 ? "positive" : "negative"}`;
}

function shortName(name) {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.at(-1) : name;
}
