# Weekly Update Workflow

This file records the actual `scripts/weekly_update.py` commands used by this repo. Keep it focused on runnable workflow commands.

## Environment

Local runs use:

```bash
.venv/bin/python scripts/weekly_update.py ...
```

Runtime config is loaded from `scripts/.env`. Do not commit `scripts/.env`.

Important variables used by `weekly_update.py`:

- `GITHUB_TOKEN` or `GH_TOKEN`
- `CLICKHOUSE_HOST`
- `CLICKHOUSE_USER`
- `CLICKHOUSE_PASSWORD`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `OPENAI_TIMEOUT`
- `ALLOW_LLM_FALLBACK`
- `YUQUE_API_TOKEN` or `YUQUE_PUBLISH_COMMAND`
- `DINGTALK_WEBHOOK`
- `DINGTALK_SECRET`

## Generate Report Only

Use this to test the weekly report without publishing, creating a PR, or sending DingTalk.

```bash
.venv/bin/python scripts/weekly_update.py --check --report-only
```

Alias:

```bash
.venv/bin/python scripts/weekly_update.py --check --no-publish
```

Outputs:

- `data/weekly_report.md`
- `data/trend_context.md`
- `insights/weekly_reports_by_agents/YYYY-MM-DD-weekly-agentic-ai-report.md`

## Re-generate LLM Insights Only

Use this when the report was generated with fallback insights, or when OpenAI/local LLM connectivity has been fixed after report generation.

This command does not re-query ClickHouse or GitHub. It reads `data/trend_context.md`, patches only the `Deep Trend Insights` section, and keeps the archive report plus `data/weekly_report.md` in sync.

```bash
.venv/bin/python scripts/weekly_update.py --add-insights --report-path insights/weekly_reports_by_agents/YYYY-MM-DD-weekly-agentic-ai-report.md
```

For the latest report copy:

```bash
.venv/bin/python scripts/weekly_update.py --add-insights --report-path data/weekly_report.md
```

## Full Weekly Workflow

Use this for the normal weekly flow.

```bash
.venv/bin/python scripts/weekly_update.py --check
```

It performs:

1. Query ClickHouse for top star-growth projects.
2. Fetch GitHub metadata and READMEs.
3. Filter new Agentic AI candidates.
4. Enrich candidates with OpenRank and participant data.
5. Generate the weekly report.
6. Publish the report to Yuque.
7. Create a GitHub review PR.
8. Send DingTalk notification.

It does not update `data/agentic-ai-projects.csv`; that happens only after PR review and merge.

## Publish Existing Report

Use these when a report already exists and only publishing needs to be retried.

Publish to Yuque only:

```bash
.venv/bin/python scripts/weekly_update.py --publish-yuque --report-path data/weekly_report.md
```

Create GitHub review PR only:

```bash
.venv/bin/python scripts/weekly_update.py --publish-pr --report-path data/weekly_report.md
```

Send DingTalk only:

```bash
.venv/bin/python scripts/weekly_update.py --publish-dingtalk --report-path data/weekly_report.md --yuque-url <yuque-url> --pr-url <github-pr-url>
```

Publish to Yuque, create PR, then send DingTalk:

```bash
.venv/bin/python scripts/weekly_update.py --publish-existing --report-path data/weekly_report.md
```

## Post-Merge Ingestion

After reviewers check the PR checklist and merge the weekly PR, run:

```bash
.venv/bin/python scripts/weekly_update.py --post-merge --pr <number>
```

It performs:

1. Fetch the merged upstream PR from `antgroup/agentic-ai-landscape`.
2. Parse checked repositories from the review checklist.
3. Add selected projects to `data/agentic-ai-projects.csv`.
4. Reclassify top projects and selected new projects.
5. Print taxonomy coverage suggestions if gaps appear.

## Legacy Full Mode

This bypasses PR review and adds all discovered projects directly. Use only when explicitly intended.

```bash
.venv/bin/python scripts/weekly_update.py --full
```

## Deprecated Confirm Mode

Do not use this for new work.

```bash
.venv/bin/python scripts/weekly_update.py --confirm
```

The script will print the PR-based replacement flow.

## Scheduled GitHub Actions Run

Repository workflow:

```text
.github/workflows/weekly-agentic-ai-report.yml
```

Schedule:

```text
Every Monday 11:00 Asia/Shanghai
cron: 0 3 * * 1
```

The scheduled job runs:

```bash
python scripts/weekly_update.py --check
```

Manual dispatch supports `report_only=true`, which runs:

```bash
python scripts/weekly_update.py --check --report-only
```

If ClickHouse, Yuque, DingTalk, or an OpenAI-compatible endpoint is only reachable from the internal network, set GitHub Actions variable `WEEKLY_RUNNER` to a self-hosted runner label with intranet access.

## Quick Checks

Check OpenAI config without printing secrets:

```bash
.venv/bin/python -c "from dotenv import load_dotenv; import os, requests; load_dotenv('scripts/.env'); base=os.getenv('OPENAI_BASE_URL','https://api.openai.com/v1').rstrip('/'); key=os.getenv('OPENAI_API_KEY','').strip(); print('base=', base); print('key_set=', bool(key)); s=requests.Session(); s.trust_env=False; r=s.get(base + '/models', headers={'Authorization':'Bearer ' + key}, timeout=20); print('status=', r.status_code); print('body=', r.text[:300].replace('\\n',' '))"
```

Run weekly script tests:

```bash
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python scripts/test_weekly_update.py
```
