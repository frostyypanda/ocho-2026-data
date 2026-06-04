import { PROBLEMS } from "./data.js";
import { fmt } from "./stats.js";

export function renderDetailTable(element, people, state, onSort) {
  const rows = [...people].sort((a, b) => compareRows(a, b, state.sort));
  const headers = [
    ["rank", "Rank"],
    ["name", "Name"],
    ["region", "Region"],
    ["theory", "Theory"],
    ["practical", "Practical"],
    ["total", "Total"],
    ...PROBLEMS.map((problem) => [problem.id, problem.id]),
    ["prize", "Prize"],
  ];
  element.innerHTML = `<table><thead><tr>${headers.map((header) => headerCell(header, state.sort)).join("")}</tr></thead><tbody>${rows
    .map((person) => tableRow(person, state))
    .join("")}</tbody></table>`;
  element.querySelectorAll("button[data-sort]").forEach((button) => {
    button.addEventListener("click", () => onSort(button.dataset.sort));
  });
}

function tableRow(person, state) {
  const selected = state.people.has(person.id) || state.highlights.has(person.id);
  const cells = [
    person.rank,
    `<strong>${person.name}</strong><span>${person.school}</span>`,
    person.region,
    fmt(person.totals.theory),
    fmt(person.totals.practical),
    fmt(person.totals.total),
    ...PROBLEMS.map((problem) => fmt(person.scores[problem.id].points)),
    person.prize,
  ];
  return `<tr class="${selected ? "selected" : ""}">${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
}

function headerCell([key, label], sort) {
  const arrow = sort.key === key ? (sort.dir === "asc" ? "^" : "v") : "";
  return `<th><button data-sort="${key}">${label} ${arrow}</button></th>`;
}

function compareRows(a, b, sort) {
  const value = (person) => {
    if (["theory", "practical", "total"].includes(sort.key)) return person.totals[sort.key];
    if (PROBLEMS.some((problem) => problem.id === sort.key)) return person.scores[sort.key].points;
    return person[sort.key];
  };
  const left = value(a);
  const right = value(b);
  const order = typeof left === "number" ? left - right : String(left).localeCompare(String(right));
  return sort.dir === "asc" ? order : -order;
}
