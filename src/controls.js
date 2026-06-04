export function metricSelectLabel(metric) {
  if (metric.group === "summary") return metric.label;
  return `${metric.label} (${metric.group === "theory" ? "Theory" : "Practical"})`;
}

export function correlationMetricsFrom(metrics) {
  const selected = [...metrics];
  const x = selected[0] || "total";
  const y = selected.find((metricId) => metricId !== x) || fallbackCorrelationMetric(x);
  return { x, y };
}

function fallbackCorrelationMetric(metricId) {
  return metricId === "total" ? "theory" : "total";
}
