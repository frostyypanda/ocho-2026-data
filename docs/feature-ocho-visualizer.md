# Feature: OChO 2026 Data Visualizer

## Status
implemented

## Why this exists
The app lets competitors inspect the Austrian national competition results from multiple angles without manually cross-reading the full-results sheet and detailed theory/practical point sheets.

## What it does
The visualizer presents rankings, summary totals, individual task scores, score distributions with adjustable bucket size, highlighted competitors, percentile box plots, person-to-person task comparisons, correlation plots, a correlation matrix, regional averages, task difficulty, theory/practical splits, and a sortable detailed table.

## Boundaries & edge cases
The app is a static GitHub Pages site. It uses the transcribed 2026 dataset only and does not fetch live competition data. Practical detail rows are matched by the practical total in the full-results photo; Stefan Hojas is explicitly mapped to practical detail row 19, resolving the duplicate 21.75 practical total.

## Testing & verification
Data validation should check participant count, unique IDs, total consistency, practical row uniqueness, Stefan's corrected row, per-section point sums within rounding tolerance, and percentile summaries. Browser verification should confirm the charts render, distribution bucket-size changes update the histogram, box plots render quartiles, filters update the visible data, and the detail table remains usable on desktop and mobile widths.

## Decision log
| Date | Decision | Why | Who |
|------|----------|-----|-----|
| 2026-06-04 | Build a static vanilla JS app with Plotly CDN charts. | GitHub Pages can serve it directly at the requested URL without a build pipeline. | Codex |
| 2026-06-04 | Keep the practical-row correction in data and validation. | The 21.75 practical total appears twice, so the explicit mapping prevents accidental relabeling. | User, Codex |
| 2026-06-04 | Use fixed distribution bucket size and add box plots. | The distribution view should let users control percentage bucket width and inspect 25/50/75 percentiles visually. | User, Codex |
