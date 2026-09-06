-- Same-month comparison of GitHub archive events in opensource.events.
-- Keep from_api=0 separate so API backfills do not distort the GH Archive baseline.

SELECT
    toYear(created_at) AS year,
    min(created_at) AS first_event_at,
    max(created_at) AS last_event_at,
    count() AS event_rows,
    uniqExact(type) AS event_types,
    countIf(from_api = 0) AS archive_rows,
    countIf(from_api = 1) AS api_rows
FROM opensource.events
WHERE platform = 'GitHub'
  AND toMonth(created_at) = 5
  AND toYear(created_at) BETWEEN 2022 AND 2026
GROUP BY year
ORDER BY year;

SELECT
    toYear(created_at) AS year,
    type,
    count() AS event_rows
FROM opensource.events
WHERE platform = 'GitHub'
  AND from_api = 0
  AND created_at >= '2022-05-01'
  AND created_at < '2026-06-01'
  AND toMonth(created_at) = 5
GROUP BY year, type
ORDER BY type, year;

-- Audit which types are introduced only by API backfills.
SELECT
    type,
    from_api,
    count() AS event_rows,
    min(created_at) AS first_event_at,
    max(created_at) AS last_event_at
FROM opensource.events
WHERE platform = 'GitHub'
  AND created_at >= '2022-05-01'
  AND created_at < '2026-06-01'
  AND toMonth(created_at) = 5
GROUP BY type, from_api
ORDER BY type, from_api;
