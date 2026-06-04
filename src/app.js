import { CONTEST, PARTICIPANTS, PROBLEMS } from "./data.js";
import {
  filteredParticipants,
  fmt,
  metricMeta,
  metricOptions,
  metricValue,
  pearson,
  pct,
  rankFor,
  taskDifficulty,
  topSwings,
} from "./stats.js";
import {
  renderCorrelation,
  renderHeatmap,
  renderOverview,
  renderPeopleComparison,
} from "./charts.js";
import { renderDistribution } from "./distribution.js";
import { renderDetailTable } from "./table.js";

const state = {
  view: "overview",
  query: "",
  regions: new Set(),
  prizes: new Set(),
  metrics: new Set(["total", "theory", "practical"]),
  highlights: new Set(["kazazic-kei"]),
  people: new Set(["glueckert-alexander", "kazazic-kei", "koell-finn"]),
  mode: "percent",
  bucketSize: 5,
  corrX: "theory",
  corrY: "practical",
  sort: { key: "rank", dir: "asc" },
};

const el = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  populateControls();
  attachEvents();
  render();
  window.lucide?.createIcons();
});

function bindElements() {
  [
    "searchInput",
    "modeSelect",
    "bucketInput",
    "regionFilters",
    "prizeFilters",
    "metricPicker",
    "highlightSelect",
    "peopleSelect",
    "corrX",
    "corrY",
    "detailTable",
    "kpis",
    "insights",
    "sourceNote",
  ].forEach((id) => (el[id] = document.getElementById(id)));
}

function populateControls() {
  document.getElementById("appTitle").textContent = CONTEST.title;
  document.getElementById("appSubtitle").textContent = CONTEST.subtitle;
  el.sourceNote.textContent = CONTEST.sourceNote;
  syncBucketLabel();
  el.regionFilters.innerHTML = checkboxList(unique(PARTICIPANTS.map((person) => person.region)), "region");
  el.prizeFilters.innerHTML = checkboxList(unique(PARTICIPANTS.map((person) => person.prize)), "prize");
  el.metricPicker.innerHTML = metricOptions.map(metricCheckbox).join("");
  fillPersonSelect(el.highlightSelect, state.highlights);
  fillPersonSelect(el.peopleSelect, state.people);
  fillMetricSelect(el.corrX, state.corrX);
  fillMetricSelect(el.corrY, state.corrY);
}

function attachEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    });
  });
  document.querySelectorAll("[data-metric-set]").forEach((button) => {
    button.addEventListener("click", () => {
      state.metrics = new Set(metricSets[button.dataset.metricSet]);
      syncMetricChecks();
      render();
    });
  });
  el.searchInput.addEventListener("input", () => {
    state.query = el.searchInput.value;
    render();
  });
  el.modeSelect.addEventListener("change", () => {
    state.mode = el.modeSelect.value;
    syncBucketLabel();
    render();
  });
  el.bucketInput.addEventListener("input", () => {
    state.bucketSize = Number(el.bucketInput.value);
    syncBucketLabel();
    render();
  });
  el.metricPicker.addEventListener("change", () => {
    state.metrics = new Set(checkedValues("[data-metric]"));
    if (!state.metrics.size) state.metrics.add("total");
    render();
  });
  el.regionFilters.addEventListener("change", () => {
    state.regions = new Set(checkedValues("[data-region]"));
    render();
  });
  el.prizeFilters.addEventListener("change", () => {
    state.prizes = new Set(checkedValues("[data-prize]"));
    render();
  });
  el.highlightSelect.addEventListener("change", () => {
    state.highlights = new Set(selectedValues(el.highlightSelect));
    render();
  });
  el.peopleSelect.addEventListener("change", () => {
    state.people = new Set(selectedValues(el.peopleSelect));
    render();
  });
  el.corrX.addEventListener("change", () => {
    state.corrX = el.corrX.value;
    render();
  });
  el.corrY.addEventListener("change", () => {
    state.corrY = el.corrY.value;
    render();
  });
}

function render() {
  const people = filteredParticipants(state);
  const metrics = [...state.metrics];
  setActiveView();
  renderKpis(people);
  renderInsights(people);
  renderDetailTable(el.detailTable, people, state, updateSort);

  if (state.view === "overview") renderOverview(people);
  if (state.view === "distribution") renderDistribution(people, metrics, [...state.highlights], state.mode, state.bucketSize);
  if (state.view === "people") renderPeopleComparison(people, [...state.people], metrics, state.mode);
  if (state.view === "correlation") {
    renderCorrelation(people, state.corrX, state.corrY);
    renderHeatmap(people, metrics);
  }
}

function renderKpis(people) {
  const top = [...people].sort((a, b) => b.totals.total - a.totals.total)[0];
  const average = people.reduce((sum, person) => sum + person.totals.total, 0) / (people.length || 1);
  const practicalLeader = [...people].sort((a, b) => b.totals.practical - a.totals.practical)[0];
  el.kpis.innerHTML = [
    kpi("People", people.length),
    kpi("Average total", fmt(average)),
    kpi("Top total", top ? `${top.name} - ${fmt(top.totals.total)}` : "-"),
    kpi("Top practical", practicalLeader ? `${practicalLeader.name} - ${fmt(practicalLeader.totals.practical)}` : "-"),
  ].join("");
}

function renderInsights(people) {
  const difficulty = taskDifficulty().sort((a, b) => a.average - b.average);
  const split = topSwings(people)[0];
  const selected = [...state.people].map((id) => PARTICIPANTS.find((person) => person.id === id)).filter(Boolean);
  const bestPair = strongestCorrelation([...state.metrics], people);
  el.insights.innerHTML = [
    insight("Hardest task", `${difficulty[0].label} - ${pct(difficulty[0].average)}`),
    insight("Easiest task", `${difficulty.at(-1).label} - ${pct(difficulty.at(-1).average)}`),
    insight("Largest split", split ? `${split.person.name} - ${fmt(split.practicalMinusTheory, 1)} pp` : "-"),
    insight("Strongest selected correlation", bestPair),
    insight("Selected ranks", selected.map((person) => `${person.name} #${rankFor(person, "total")}`).join("; ") || "-"),
  ].join("");
}

function updateSort(key) {
  const sameKey = state.sort.key === key;
  state.sort = { key, dir: sameKey && state.sort.dir === "asc" ? "desc" : "asc" };
  renderDetailTable(el.detailTable, filteredParticipants(state), state, updateSort);
}

function setActiveView() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.hidden = view.id !== `${state.view}View`;
  });
}

function syncBucketLabel() {
  const suffix = state.mode === "percent" ? "%" : "";
  document.getElementById("bucketValue").textContent = `${state.bucketSize}${suffix}`;
}

function checkboxList(values, kind) {
  return values
    .map((value) => `<label><input type="checkbox" data-${kind} value="${escapeAttr(value)}"> ${value}</label>`)
    .join("");
}

function metricCheckbox(metric) {
  const checked = state.metrics.has(metric.id) ? "checked" : "";
  return `<label class="metric-pill ${metric.group}"><input type="checkbox" data-metric value="${metric.id}" ${checked}> ${metric.label}</label>`;
}

function fillPersonSelect(select, selected) {
  select.innerHTML = PARTICIPANTS.map((person) => {
    const isSelected = selected.has(person.id) ? "selected" : "";
    return `<option value="${person.id}" ${isSelected}>${person.name}</option>`;
  }).join("");
}

function fillMetricSelect(select, selected) {
  select.innerHTML = metricOptions.map((metric) => {
    const isSelected = metric.id === selected ? "selected" : "";
    return `<option value="${metric.id}" ${isSelected}>${metric.label}</option>`;
  }).join("");
}

function syncMetricChecks() {
  document.querySelectorAll("[data-metric]").forEach((box) => {
    box.checked = state.metrics.has(box.value);
  });
}

function checkedValues(selector) {
  return [...document.querySelectorAll(`${selector}:checked`)].map((input) => input.value);
}

function selectedValues(select) {
  return [...select.selectedOptions].map((option) => option.value);
}

function unique(values) {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
}

function kpi(label, value) {
  return `<div class="kpi"><span>${label}</span><strong>${value}</strong></div>`;
}

function insight(label, value) {
  return `<div class="insight"><span>${label}</span><strong>${value}</strong></div>`;
}

function strongestCorrelation(metricIds, people) {
  let best = { label: "-", value: 0 };
  metricIds.forEach((left, leftIndex) => {
    metricIds.slice(leftIndex + 1).forEach((right) => {
      const value = pearson(left, right, people);
      if (Math.abs(value) > Math.abs(best.value)) {
        best = { label: `${metricMeta(left).label} <-> ${metricMeta(right).label} - ${fmt(value, 2)}`, value };
      }
    });
  });
  return best.label;
}

function escapeAttr(value) {
  return String(value).replaceAll('"', "&quot;");
}

const metricSets = {
  summary: ["total", "theory", "practical"],
  theory: PROBLEMS.filter((problem) => problem.group === "theory").map((problem) => problem.id),
  practical: PROBLEMS.filter((problem) => problem.group === "practical").map((problem) => problem.id),
  all: metricOptions.map((metric) => metric.id),
};
