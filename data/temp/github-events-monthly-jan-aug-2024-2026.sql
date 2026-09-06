-- Monthly GitHub archive event totals for January-August, 2024-2026.
-- API backfills are excluded to keep the same baseline as the May comparison.

SELECT
    toYear(created_at) AS year,
    toMonth(created_at) AS month,
    count() AS archive_rows
FROM opensource.events
WHERE platform = 'GitHub'
  AND from_api = 0
  AND created_at >= '2024-01-01'
  AND created_at < '2026-09-01'
  AND toMonth(created_at) <= 8
GROUP BY year, month
ORDER BY year, month;
