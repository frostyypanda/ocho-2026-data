import { CONTEST, PARTICIPANTS, PROBLEMS } from "../src/data.js";
import { summaryFor } from "../src/stats.js";

const tolerance = 0.04;
const ids = new Set(PARTICIPANTS.map((person) => person.id));
const rows = new Set(PARTICIPANTS.map((person) => person.practicalRow));

assert(PARTICIPANTS.length === 24, "expected 24 participants");
assert(ids.size === PARTICIPANTS.length, "participant IDs are unique");
assert(rows.size === PARTICIPANTS.length, "practical detail rows are unique");
assert(PROBLEMS.length === 11, "expected 11 problems");
assert(find("hojas-stefan").practicalRow === 19, "Stefan Hojas uses practical row 19");
assert(find("gruber-leander").practicalRow === 20, "Leander Gruber uses practical row 20");

PARTICIPANTS.forEach((person, index) => {
  assert(person.rank === index + 1, `${person.name} rank matches full-results order`);
  assert(Object.keys(person.scores).length === PROBLEMS.length, `${person.name} has every problem`);

  const theory = sumProblems(person, "theory");
  const practical = sumProblems(person, "practical") - (person.practicalDeduction || 0);
  assertClose(theory, person.totals.theory, `${person.name} theory sum`);
  assertClose(practical, person.totals.practical, `${person.name} practical sum`);
  assertClose(person.totals.theory + person.totals.practical, person.totals.total, `${person.name} total`);

  PROBLEMS.forEach((problem) => {
    const score = person.scores[problem.id];
    assert(score.raw <= problem.maxRaw + tolerance, `${person.name} ${problem.id} raw within max`);
    assert(score.points <= problem.maxPoints + tolerance, `${person.name} ${problem.id} points within max`);
    assertClose((score.raw / problem.maxRaw) * problem.maxPoints, score.points, `${person.name} ${problem.id} conversion`);
  });
});

const totalMax = CONTEST.totals.theory + CONTEST.totals.practical;
assert(totalMax === CONTEST.totals.total, "summary max totals add to 100");
assertClose(summaryFor("total", PARTICIPANTS, "percent").q1, 47.31, "total Q1 percent");
assertClose(summaryFor("total", PARTICIPANTS, "percent").median, 51.03, "total median percent");
assertClose(summaryFor("total", PARTICIPANTS, "percent").q3, 67.35, "total Q3 percent");

console.log(`Validated ${PARTICIPANTS.length} participants, ${PROBLEMS.length} problems, and corrected practical row mapping.`);

function sumProblems(person, group) {
  return PROBLEMS.filter((problem) => problem.group === group)
    .map((problem) => person.scores[problem.id].points)
    .reduce((sum, value) => sum + value, 0);
}

function find(id) {
  return PARTICIPANTS.find((person) => person.id === id);
}

function assertClose(actual, expected, label) {
  assert(Math.abs(actual - expected) <= tolerance, `${label}: ${actual.toFixed(3)} != ${expected.toFixed(3)}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
