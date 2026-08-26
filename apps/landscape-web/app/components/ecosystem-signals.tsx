"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { LandscapeProject } from "@/lib/landscape-types";

import styles from "../page.module.css";

const MONTHS = [
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
];

const NUMBER_FORMAT = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const SIGNAL_CHART_CONFIG = {
  agent: {
    label: "Agent Infra",
    color: "#ef72ca",
  },
  model: {
    label: "Model Infra",
    color: "#74b7e3",
  },
  application: {
    label: "Agent Application",
    color: "#e65fc1",
  },
  framework: {
    label: "Agent Framework",
    color: "#f19bd8",
  },
  runtime: {
    label: "Agent Runtime Infra",
    color: "#9f4b8d",
  },
  access: {
    label: "Access & Serving",
    color: "#58a6d8",
  },
  training: {
    label: "Model Training",
    color: "#94cbed",
  },
  foundation: {
    label: "Data & Compute",
    color: "#2e6f9c",
  },
  openrank: {
    label: "OpenRank",
    color: "#141414",
  },
  stars: {
    label: "Stars",
    color: "#717171",
  },
} satisfies ChartConfig;

type FieldTrendPoint = {
  month: string;
  [key: string]: string | number;
};

type FieldSeries = {
  key: string;
  label: string;
  color: string;
};

const AGENT_FIELD_SERIES: FieldSeries[] = [
  { key: "application", label: "Application", color: "#e65fc1" },
  { key: "framework", label: "Framework", color: "#f19bd8" },
  { key: "runtime", label: "Runtime", color: "#9f4b8d" },
];

const MODEL_FIELD_SERIES: FieldSeries[] = [
  { key: "access", label: "Access & Serving", color: "#58a6d8" },
  { key: "training", label: "Training", color: "#94cbed" },
  { key: "foundation", label: "Data & Compute", color: "#2e6f9c" },
];

function getFieldTotal(row: FieldTrendPoint, series: FieldSeries[]) {
  return series.reduce((total, item) => total + Number(row[item.key] ?? 0), 0);
}

function FieldTrendPanel({
  title,
  tone,
  data,
  series,
  sharedMaximum,
}: {
  title: string;
  tone: "agent" | "model";
  data: FieldTrendPoint[];
  series: FieldSeries[];
  sharedMaximum: number;
}) {
  const latest = data.at(-1);
  const previous = data.at(-2);
  const latestTotal = latest ? getFieldTotal(latest, series) : 0;
  const previousTotal = previous ? getFieldTotal(previous, series) : 0;
  const change = previousTotal
    ? ((latestTotal - previousTotal) / previousTotal) * 100
    : 0;
  const peak = data.reduce(
    (best, row) =>
      getFieldTotal(row, series) > getFieldTotal(best, series) ? row : best,
    data[0],
  );

  return (
    <article className={styles.signalFieldPanel} data-tone={tone}>
      <header className={styles.signalFieldPanelHeader}>
        <div>
          <h3>{title}</h3>
          <p className={styles.signalFieldHeadline}>
            <strong>{NUMBER_FORMAT.format(latestTotal)}</strong>
            <span data-direction={change >= 0 ? "up" : "down"}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}% vs {previous?.month}
            </span>
          </p>
        </div>
        <dl className={styles.signalFieldPeak}>
          <dt>Peak</dt>
          <dd>
            {peak.month} · {NUMBER_FORMAT.format(getFieldTotal(peak, series))}
          </dd>
        </dl>
      </header>

      <div className={styles.signalFieldBreakdown}>
        {series.map((item) => (
          <span key={item.key}>
            <i style={{ backgroundColor: item.color }} aria-hidden="true" />
            <small>{item.label}</small>
            <strong>{NUMBER_FORMAT.format(Number(latest?.[item.key] ?? 0))}</strong>
          </span>
        ))}
      </div>

      <ChartContainer
        config={SIGNAL_CHART_CONFIG}
        className={styles.signalFieldChart}
      >
        <AreaChart
          accessibilityLayer
          data={data}
          syncId="openrank-by-field"
          margin={{ left: 0, right: 8, top: 10, bottom: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tickMargin={9}
            interval="preserveStartEnd"
          />
          <YAxis
            width={44}
            axisLine={false}
            tickLine={false}
            domain={[0, sharedMaximum]}
            tickCount={4}
            tickFormatter={(value) => NUMBER_FORMAT.format(value)}
          />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          {series.map((item) => (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stackId="openrank"
              fill={item.color}
              fillOpacity={0.9}
              stroke={item.color}
              strokeWidth={1.5}
              isAnimationActive={false}
              activeDot={{ r: 3 }}
              dot={false}
              connectNulls
              baseValue={0}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </article>
  );
}

function isAgentProject(project: LandscapeProject) {
  return project.stage !== "model";
}

function getModelField(project: LandscapeProject) {
  if (
    [
      "Model API gateways",
      "Serving · Deploy",
      "Serving · Inference",
    ].includes(project.zone)
  ) {
    return "access";
  }

  if (
    project.zone.startsWith("Post-Train") ||
    project.zone.startsWith("Pre-Train")
  ) {
    return "training";
  }

  return "foundation";
}

function sum(
  projects: LandscapeProject[],
  selector: (project: LandscapeProject) => number,
) {
  return projects.reduce((total, project) => total + selector(project), 0);
}

export function EcosystemSignals({
  projects,
}: {
  projects: LandscapeProject[];
}) {
  const agentProjects = projects.filter(isAgentProject);
  const modelProjects = projects.filter(
    (project) => project.stage === "model",
  );
  const totalOpenRank = sum(
    projects,
    (project) => project.openrank ?? 0,
  );
  const totalStars = sum(projects, (project) => project.stars);
  const totalParticipants = sum(
    projects,
    (project) => project.participants ?? 0,
  );
  const trendSignalCount = projects.reduce(
    (count, project) => count + project.trendSignals.length,
    0,
  );

  const agentFieldTrend = MONTHS.map((month, index) => ({
    month,
    application: Math.round(
      sum(
        agentProjects.filter((project) => project.stage === "application"),
        (project) => project.trend[index] ?? 0,
      ),
    ),
    framework: Math.round(
      sum(
        agentProjects.filter((project) => project.stage === "framework"),
        (project) => project.trend[index] ?? 0,
      ),
    ),
    runtime: Math.round(
      sum(
        agentProjects.filter((project) => project.stage === "runtime"),
        (project) => project.trend[index] ?? 0,
      ),
    ),
  }));
  const modelFieldTrend = MONTHS.map((month, index) => ({
    month,
    access: Math.round(
      sum(
        modelProjects.filter(
          (project) => getModelField(project) === "access",
        ),
        (project) => project.trend[index] ?? 0,
      ),
    ),
    training: Math.round(
      sum(
        modelProjects.filter(
          (project) => getModelField(project) === "training",
        ),
        (project) => project.trend[index] ?? 0,
      ),
    ),
    foundation: Math.round(
      sum(
        modelProjects.filter(
          (project) => getModelField(project) === "foundation",
        ),
        (project) => project.trend[index] ?? 0,
      ),
    ),
  }));
  const fieldTrendMaximum =
    Math.ceil(
      Math.max(
        ...agentFieldTrend.map((row) =>
          getFieldTotal(row, AGENT_FIELD_SERIES),
        ),
        ...modelFieldTrend.map((row) =>
          getFieldTotal(row, MODEL_FIELD_SERIES),
        ),
      ) / 1000,
    ) * 1000;
  const leaders = [...projects]
    .filter(
      (project): project is LandscapeProject & { openrank: number } =>
        project.openrank !== null,
    )
    .sort((a, b) => b.openrank - a.openrank)
    .slice(0, 10)
    .map((project) => ({
      name: project.name,
      openrank: project.openrank,
      layer: isAgentProject(project) ? "agent" : "model",
    }));

  const languageRows = [
    ...projects.reduce((counts, project) => {
      const language = project.language || "—";
      const current = counts.get(language) ?? {
        language,
        agent: 0,
        model: 0,
      };
      current[isAgentProject(project) ? "agent" : "model"] += 1;
      counts.set(language, current);
      return counts;
    }, new Map<string, { language: string; agent: number; model: number }>()),
  ]
    .map(([, row]) => row)
    .sort((a, b) => b.agent + b.model - (a.agent + a.model))
    .slice(0, 8);

  const agentScatter = agentProjects
    .filter((project) => project.stars > 0 && (project.openrank ?? 0) > 0)
    .map((project) => ({
      name: project.name,
      stars: project.stars,
      openrank: project.openrank,
      participants: project.participants ?? 0,
    }));
  const modelScatter = modelProjects
    .filter((project) => project.stars > 0 && (project.openrank ?? 0) > 0)
    .map((project) => ({
      name: project.name,
      stars: project.stars,
      openrank: project.openrank,
      participants: project.participants ?? 0,
    }));

  const snapshotMetrics = [
    {
      label: "Projects",
      value: projects.length.toLocaleString(),
    },
    {
      label: "Stars",
      value: NUMBER_FORMAT.format(totalStars),
    },
    {
      label: "Participants · Jul 2026",
      value: NUMBER_FORMAT.format(totalParticipants),
    },
    {
      label: "OpenRank · Jul 2026",
      value: NUMBER_FORMAT.format(totalOpenRank),
    },
    {
      label: "Trend signals",
      value: trendSignalCount.toLocaleString(),
    },
  ];

  return (
    <section className={styles.signals} id="signals">
      <div className={styles.signalsIntro}>
        <h2>Ecosystem signals</h2>
      </div>

      <div className={styles.signalMetricGrid}>
        {snapshotMetrics.map((metric) => (
          <Card key={metric.label} className={styles.signalMetricCard}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle>{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className={styles.signalDashboardGrid}>
        <Card className={styles.signalFieldCard}>
          <CardHeader>
            <CardTitle>OpenRank by field</CardTitle>
            <CardDescription>
              Aug 2025–Jul 2026 · monthly OpenRank sum · shared scale
            </CardDescription>
          </CardHeader>
          <CardContent className={styles.signalFieldGrid}>
            <FieldTrendPanel
              title="Agent Infra"
              tone="agent"
              data={agentFieldTrend}
              series={AGENT_FIELD_SERIES}
              sharedMaximum={fieldTrendMaximum}
            />
            <FieldTrendPanel
              title="Model Infra"
              tone="model"
              data={modelFieldTrend}
              series={MODEL_FIELD_SERIES}
              sharedMaximum={fieldTrendMaximum}
            />
          </CardContent>
        </Card>

        <Card className={styles.signalTallCard}>
          <CardHeader>
            <CardTitle>OpenRank leaders</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={SIGNAL_CHART_CONFIG}
              className={styles.signalRankingChart}
            >
              <BarChart
                data={leaders}
                layout="vertical"
                margin={{ left: 10, right: 28 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => NUMBER_FORMAT.format(value)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={112}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 650 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="openrank" radius={[0, 4, 4, 0]}>
                  {leaders.map((project) => (
                    <Cell
                      key={project.name}
                      fill={
                        project.layer === "agent"
                          ? "var(--color-agent)"
                          : "var(--color-model)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className={styles.signalLanguageCard}>
          <CardHeader>
            <CardTitle>Language composition</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={SIGNAL_CHART_CONFIG}
              className={styles.signalMediumChart}
            >
              <BarChart
                data={languageRows}
                layout="vertical"
                margin={{ left: 4, right: 18 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="language"
                  width={72}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 650 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                  dataKey="agent"
                  stackId="language"
                  fill="var(--color-agent)"
                />
                <Bar
                  dataKey="model"
                  stackId="language"
                  fill="var(--color-model)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className={styles.signalScatterCard}>
          <CardHeader>
            <CardTitle>Stars and OpenRank by project</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={SIGNAL_CHART_CONFIG}
              className={styles.signalMediumChart}
            >
              <ScatterChart margin={{ left: 8, right: 18, top: 10 }}>
                <CartesianGrid />
                <XAxis
                  type="number"
                  dataKey="stars"
                  name="Stars"
                  scale="log"
                  domain={["auto", "auto"]}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => NUMBER_FORMAT.format(value)}
                />
                <YAxis
                  type="number"
                  dataKey="openrank"
                  name="OpenRank"
                  scale="log"
                  domain={["auto", "auto"]}
                  width={48}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => NUMBER_FORMAT.format(value)}
                />
                <ZAxis
                  type="number"
                  dataKey="participants"
                  range={[35, 180]}
                />
                <ChartTooltip
                  content={<ChartTooltipContent labelKey="name" />}
                />
                <Scatter
                  name="Agent Infra"
                  data={agentScatter}
                  fill="var(--color-agent)"
                  fillOpacity={0.72}
                />
                <Scatter
                  name="Model Infra"
                  data={modelScatter}
                  fill="var(--color-model)"
                  fillOpacity={0.76}
                />
              </ScatterChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

    </section>
  );
}
