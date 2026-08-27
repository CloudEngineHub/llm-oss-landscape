"use client";

import Link from "next/link";
import { ArrowLeftIcon, ExternalLinkIcon, PlayIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import LandscapeLogo from "@/app/components/landscape-logo";

import styles from "./page.module.css";

type StoryProject = {
  name: string;
  repo: string;
  layer: "agent" | "model";
  zone: string;
  openrank: number | null;
  participants: number | null;
  createdAt: string;
  growth: number | null;
  signals: Array<"new" | "rising">;
};

type StoryStats = {
  total: number;
  agent: number;
  model: number;
  agentRecent: number;
  modelRecent: number;
  agentAdds: number;
  modelAdds: number;
  sinceCoc: number;
};

const infraShifts = [
  {
    id: "execution",
    label: "Session runtime",
    before: "A deployed service starts from a known artifact",
    after: "An agent can create and run code inside the task",
    detail:
      "The environment may last only a few minutes, yet it still needs isolation, network policy, a stable task identity, warm-start latency and reliable cleanup.",
    mapSignal:
      "4 development sandboxes. Kubernetes Agent Sandbox adds declarative claims, templates and warm pools.",
    openInfra:
      "Kubernetes manages the sandbox lifecycle; Kata Containers supplies a VM-backed boundary for untrusted code.",
    href: "https://github.com/kubernetes-sigs/agent-sandbox/blob/main/examples/quickstart/README.md",
  },
  {
    id: "identity",
    label: "Task authority",
    before: "A service account represents a long-running application",
    after: "Authority has to be scoped to one task and its tools",
    detail:
      "One run may cross a repository, a document store and a deployment system. The platform needs bounded delegation, expiry and revocation while the run is still active.",
    mapSignal:
      "Protocols & interoperability grew from 5 to 8 projects; two agent gateways moved out of Model API gateways.",
    openInfra:
      "SPIFFE/SPIRE already provides workload identity and delegated identity, while explicitly warning about impersonation risk.",
    href: "https://spiffe.io/docs/latest/deploying/spire_agent/",
  },
  {
    id: "state",
    label: "Durable context",
    before: "State is attached to a service or database transaction",
    after: "Task context outlives several short-lived environments",
    detail:
      "Context, artifacts and tool results need a durable home, plus rules for expiry, inheritance and who may alter the record that guides a later action.",
    mapSignal:
      "9 memory and context projects. OpenViking gained 42.6 OpenRank points from April to July.",
    openInfra:
      "Existing data, object-storage and workflow systems remain the durable substrate; context databases add agent-specific semantics.",
    href: "https://github.com/volcengine/OpenViking",
  },
  {
    id: "observability",
    label: "Action trace",
    before: "Teams inspect service requests, logs and resources",
    after: "Teams need to reconstruct a decision and its side effect",
    detail:
      "A successful request does not show whether the agent made the right change. Useful evidence links model work, tool execution, sandbox events and the external result.",
    mapSignal:
      "4 agent observability projects; the category is stable, while tool and protocol layers are growing around it.",
    openInfra:
      "OpenTelemetry is widely deployed, but its GenAI agent and tool conventions are still marked Development.",
    href: "https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md",
  },
  {
    id: "scheduling",
    label: "Accelerators",
    before: "Services reserve a relatively predictable resource profile",
    after: "One task mixes inference, tools and short bursts of compute",
    detail:
      "The sequence is harder to forecast and may span CPU, GPU and network-sensitive distributed work. Allocation, topology and per-task cost become scheduling inputs.",
    mapSignal:
      "Serving inference leads Model Infra with 786.8 combined July OpenRank; FlashInfer gained 20.7 from April to July.",
    openInfra:
      "Kubernetes DRA is GA; Kueue combines quota, topology-aware placement and training/inference workloads.",
    href: "https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/",
  },
] as const;

export default function InclusionConfStory({
  stats,
  projects,
}: {
  stats: StoryStats;
  projects: StoryProject[];
}) {
  const [layer, setLayer] = useState<"agent" | "model">("agent");
  const [shiftId, setShiftId] = useState<(typeof infraShifts)[number]["id"]>(
    "execution",
  );

  const layerProjects = useMemo(
    () => projects.filter((project) => project.layer === layer),
    [layer, projects],
  );
  const leaders = useMemo(
    () =>
      [...layerProjects]
        .filter((project) => project.openrank !== null)
        .sort((a, b) => (b.openrank ?? 0) - (a.openrank ?? 0))
        .slice(0, 5),
    [layerProjects],
  );
  const growthLeaders = useMemo(
    () =>
      [...projects]
        .filter((project) => (project.growth ?? 0) > 0)
        .sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))
        .slice(0, 6),
    [projects],
  );

  const layerStats =
    layer === "agent"
      ? { count: stats.agent, recent: stats.agentRecent, adds: stats.agentAdds }
      : { count: stats.model, recent: stats.modelRecent, adds: stats.modelAdds };
  const recentShare = Math.round((layerStats.recent / layerStats.count) * 100);
  const activeShift = infraShifts.find((shift) => shift.id === shiftId)!;
  const maxGrowth = Math.max(
    ...growthLeaders.map((project) => project.growth ?? 0),
  );

  return (
    <main className={styles.page} lang="en">
      <nav className={styles.nav} aria-label="Talk chapters">
        <Link className={styles.brand} href="/">
          <LandscapeLogo className={styles.brandMark} />
          <span>Agentic AI Landscape</span>
        </Link>
        <div className={styles.chapterNav}>
          <a href="#landscape">01 Trends</a>
          <a href="#infrastructure">02 Open infrastructure</a>
          <a href="#collaboration">03 Collaboration</a>
          <a href="#signals">04 Signals</a>
        </div>
        <div className={styles.navActions} aria-label="Play presentations">
          <Link
            className={`${styles.playLink} ${styles.playInfra}`}
            href="/presentations/260910_inclusion/open-infrastructure/present"
          >
            <PlayIcon aria-hidden="true" />
            <span>5 MIN</span>
            <strong>Open Infrastructure</strong>
          </Link>
          <Link
            className={`${styles.playLink} ${styles.playCollaboration}`}
            href="/presentations/260910_inclusion/present"
          >
            <PlayIcon aria-hidden="true" />
            <span>10 MIN</span>
            <strong>Collaboration</strong>
          </Link>
          <Link className={styles.navBack} href="/">
            <ArrowLeftIcon aria-hidden="true" />
            <span>Landscape</span>
          </Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroTopline}>
          <p className={styles.eyebrow}>
            THE INCLUSION CONFERENCE · 09.10 · SHANGHAI
          </p>
          <p className={styles.eyebrow}>OPEN ECOSYSTEM FIELD NOTES · 2026</p>
        </div>
        <h1 className={styles.heroTitle}>
          When <span>agents</span> joined in,
          <em>what happened to open-source collaboration?</em>
        </h1>
        <div className={styles.heroBottom}>
          <p className={styles.continuity}>
            Twenty days after CommunityOverCode, the landscape has grown from
            126 to 143 projects. Most of the new attention still sits around
            coding. The production questions are moving lower in the stack.
          </p>
          <p className={styles.heroLede}>
            We use the latest Agent Infra and Model Infra maps to follow two
            changes: how agents enter open-source collaboration, and what open
            infrastructure has to manage once their actions reach production.
          </p>
        </div>
      </header>

      <section className={styles.axisBand} aria-label="Two questions">
        <article>
          <span>01 · AGENTS AS CONTRIBUTORS</span>
          <h2>How will an agent contribute?</h2>
          <p>
            Agents already read repository rules, edit code and run tests. The
            contribution surface now includes machine-readable instructions and
            plugins alongside issues and pull requests.
          </p>
        </article>
        <article>
          <span>02 · AGENTS AS WORKLOADS</span>
          <h2>What kind of workload is an agent?</h2>
          <p>
            An agent can generate code during a task, call an external tool and
            carry state across several short-lived environments. The process may
            disappear in minutes; its effects do not.
          </p>
        </article>
      </section>

      <section className={styles.metricBand} aria-label="Landscape summary">
        <Metric value={stats.total} label="Projects in the current landscape" />
        <Metric value={stats.agent} label="Agent Infra" />
        <Metric value={stats.model} label="Model Infra" />
        <Metric
          value={stats.sinceCoc}
          label="Selected since the CoC snapshot"
        />
      </section>

      <section className={styles.chapter} id="landscape">
        <SectionTag index="01">Trends</SectionTag>
        <h2 className={styles.chapterTitle}>
          The map added 17 projects. Its pressure points barely moved.
        </h2>
        <p className={styles.chapterLede}>
          Thirteen additions entered Agent Infra and four entered Model Infra.
          Seven of the thirteen Agent additions are coding tools, harnesses or
          code-first frameworks. The structural change sits elsewhere: gateways,
          context and sandbox projects are becoming a control layer around the
          agent, not another model API wrapper.
        </p>

        <div className={styles.trendGrid}>
          <TrendCard
            number="7 / 13"
            title="Coding still absorbs the new attention"
            body="DeepSeek Harness, Kimi Code, T3 Code and Spec Kit joined a layer that was already crowded. DeepSeek's launch signal is large; it is still too new for a complete OpenRank month."
          />
          <TrendCard
            number="9"
            title="Context is separating from RAG"
            body="The memory and context section now has nine projects. OpenViking rose by 42.6 OpenRank points between April and July, the second-largest gain in the map."
          />
          <TrendCard
            number="5 → 8"
            title="Protocols are becoming a control plane"
            body="AgentGateway and MCP Context Forge moved from Model API gateways into Agent Infra. Their work is tool discovery, policy, registry and runtime management."
          />
          <TrendCard
            number="786.8"
            title="Serving remains the heavy systems layer"
            body="Eight inference projects hold 786.8 combined July OpenRank. FlashInfer gained 20.7 points from April to July as multi-call workloads keep pressure on serving efficiency."
          />
        </div>

        <div className={styles.landscapeLens}>
          <div className={styles.lensHeader}>
            <div className={styles.lensToggle} aria-label="Choose a landscape">
              {(["agent", "model"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  data-layer={item}
                  data-active={layer === item}
                  onClick={() => setLayer(item)}
                >
                  {item === "agent" ? "Agent Infra" : "Model Infra"}
                </button>
              ))}
            </div>
            <p>Switch views · projects ordered by July 2026 OpenRank</p>
          </div>
          <iframe
            className={styles.landscapeFrame}
            key={layer}
            title={`${layer} infrastructure landscape 2026`}
            src={`/embed/${layer}-infra`}
          />
          <div className={styles.lensEvidence}>
            <div>
              <strong>{recentShare}%</strong>
              <span>Created in 2025 or later</span>
            </div>
            <div>
              <strong>+{layerStats.adds}</strong>
              <span>Added in the current review</span>
            </div>
            <div className={styles.leaderList}>
              {leaders.map((project) => (
                <a
                  href={`https://github.com/${project.repo}`}
                  key={project.repo}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{project.name}</span>
                  <b>{project.openrank?.toFixed(1)}</b>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.chapter} id="infrastructure">
        <SectionTag index="02">Open infrastructure</SectionTag>
        <h2 className={styles.chapterTitle}>
          The substrate is familiar. The control boundary is moving.
        </h2>
        <p className={styles.chapterLede}>
          Kubernetes and OpenStack already carry production AI workloads. Agents
          add a shorter-lived and less predictable unit of work: a task that can
          create code, borrow authority and leave effects in several systems.
          The figures below describe the installed base, not Agent adoption.
        </p>
        <div className={styles.infraBaseline}>
          <a
            href="https://www.cncf.io/reports/the-cncf-annual-cloud-native-survey/"
            target="_blank"
            rel="noreferrer"
          >
            <strong>82%</strong>
            <span>Kubernetes in production among container users</span>
            <small>CNCF 2025 survey</small>
          </a>
          <a
            href="https://www.cncf.io/reports/the-cncf-annual-cloud-native-survey/"
            target="_blank"
            rel="noreferrer"
          >
            <strong>66%</strong>
            <span>GenAI-hosting organisations using Kubernetes for inference</span>
            <small>CNCF 2025 survey</small>
          </a>
          <a
            href="https://openinfra.org/annual-report/2025/"
            target="_blank"
            rel="noreferrer"
          >
            <strong>55M+</strong>
            <span>Documented OpenStack cores in production</span>
            <small>OpenInfra 2025 annual report</small>
          </a>
        </div>
        <div className={styles.shiftModule}>
          <div
            className={styles.shiftTabs}
            role="tablist"
            aria-label="Infrastructure assumptions"
          >
            {infraShifts.map((shift) => (
              <button
                key={shift.id}
                type="button"
                role="tab"
                aria-selected={shift.id === shiftId}
                data-active={shift.id === shiftId}
                onClick={() => setShiftId(shift.id)}
              >
                {shift.label}
              </button>
            ))}
          </div>
          <div className={styles.shiftCompare}>
            <article>
              <span>A common infrastructure assumption</span>
              <h3>{activeShift.before}</h3>
            </article>
            <article>
              <span>What the agent changes</span>
              <h3>{activeShift.after}</h3>
              <p>{activeShift.detail}</p>
            </article>
          </div>
          <div className={styles.shiftEvidence}>
            <article>
              <span>Signal in the current landscape</span>
              <p>{activeShift.mapSignal}</p>
            </article>
            <article>
              <span>What established open infrastructure contributes</span>
              <p>{activeShift.openInfra}</p>
              <a href={activeShift.href} target="_blank" rel="noreferrer">
                Inspect the primary source
                <ExternalLinkIcon aria-hidden="true" />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.chapter} id="collaboration">
        <SectionTag index="03">Collaboration</SectionTag>
        <h2 className={styles.chapterTitle}>
          A public repository can still choose a closed core
        </h2>
        <p className={styles.chapterLede}>
          DeepSeek Harness makes the distinction visible. The code is released
          under MIT and Discussions are open. Issues and pull requests are
          disabled. Its contribution guide directs community work toward plugins
          and says external pull requests are not being accepted for now.
        </p>

        <div className={styles.caseGrid}>
          <article className={styles.caseNarrative}>
            <h3>The contribution surface sits outside the core repository</h3>
            <blockquote>
              “You may consider this repository an idea, an official showcase,
              and a source of inspiration, but not a mandate from us.”
            </blockquote>
            <p>
              The project treats its official code as a reference point and
              third-party plugins as the place where the ecosystem can branch
              out. That arrangement leaves practical governance work around
              interface stability, discovery and what happens when a plugin
              becomes unsafe or abandoned.
            </p>
          </article>
          <aside className={styles.caseEvidence}>
            <h3>DeepSeek Harness · checked 25 Aug 2026</h3>
            <dl className={styles.caseFacts}>
              <CaseFact label="Created" value="13 Aug" />
              <CaseFact label="License" value="MIT" />
              <CaseFact label="Issues" value="Off" state="off" />
              <CaseFact label="Pull requests" value="Off" state="off" />
              <CaseFact label="Discussions" value="On" state="on" />
              <CaseFact label="Plugin discovery" value="dsh-plugin" state="on" />
            </dl>
            <a
              className={styles.sourceLink}
              href="https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md"
              target="_blank"
              rel="noreferrer"
            >
              Read the contribution guide
              <ExternalLinkIcon aria-hidden="true" />
            </a>
          </aside>
        </div>
        <div className={styles.questionStrip} aria-label="Governance choices">
          <p>Interface stability needs a visible owner.</p>
          <p>Plugin discovery needs verification and provenance.</p>
          <p>Unsafe or abandoned capabilities need a revocation path.</p>
        </div>
      </section>

      <section className={styles.chapter} id="signals">
        <SectionTag index="04">Signals</SectionTag>
        <h2 className={styles.chapterTitle}>
          The strongest recent growth is showing up around tool use and memory
        </h2>
        <p className={styles.chapterLede}>
          Lark CLI and OpenViking recorded the largest OpenRank gains between
          April and July in this landscape. Orca also rose steadily in
          multi-agent orchestration. These figures show where developer attention
          is gathering; they do not establish production adoption.
        </p>
        <div className={styles.growthPanel}>
          <div className={styles.growthSummary}>
            <strong>APR→JUL</strong>
            <p>
              Each bar compares the same repository in April and July 2026. The
              length shows the OpenRank increase, not stars, revenue or deployment.
            </p>
          </div>
          <div className={styles.growthList}>
            {growthLeaders.map((project, index) => (
              <div className={styles.growthRow} key={project.repo}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <a
                  href={`https://github.com/${project.repo}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {project.name}
                </a>
                <span className={styles.projectMeta}>{project.zone}</span>
                <div className={styles.growthBar} aria-hidden="true">
                  <i
                    style={{
                      width: `${((project.growth ?? 0) / maxGrowth) * 100}%`,
                    }}
                  />
                </div>
                <b className={styles.growthValue}>
                  +{project.growth?.toFixed(1)}
                </b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <p>
          Can an agent run code, use authority and leave enough evidence for
          someone else to understand what happened?
        </p>
        <small>
          This is where agentic AI meets cloud native, PyTorch and OpenInfra. The
          established stack remains useful. Its control model has to account for
          code and environments that appear during the task.
        </small>
      </section>

      <section className={styles.methodology}>
        <details>
          <summary>Methodology and data boundaries</summary>
          <div className={styles.methodologyBody}>
            <p>
              The project list comes from the 143 repositories marked keep or
              add in data/agentic-ai-projects.csv. The CoC comparison uses the
              frozen 126-project selection. OpenRank and participant counts use
              the complete July 2026 month. Creation dates, categories and review
              decisions come from the landscape snapshot dated 23 August 2026.
            </p>
            <p>
              OpenRank, stars, forks and participant counts describe different
              signals. This page uses them to study developer attention and open
              collaboration. It does not treat them as evidence of production
              adoption, revenue or technical superiority. DeepSeek Harness
              repository settings were checked through the GitHub API on 25 August
              2026.
            </p>
          </div>
        </details>
        <div className={styles.sources}>
          <span className={styles.sourceLabel}>Sources</span>
          <a
            href="https://stateofopensource.ai/"
            target="_blank"
            rel="noreferrer"
          >
            State of Open Source AI · interaction reference
          </a>
          <a
            href="https://open-digger.cn/en/docs/user_docs/metrics/openrank"
            target="_blank"
            rel="noreferrer"
          >
            OpenRank documentation
          </a>
          <a
            href="https://github.com/deepseek-ai/deepseek-harness"
            target="_blank"
            rel="noreferrer"
          >
            DeepSeek Harness
          </a>
          <a
            href="https://www.cncf.io/reports/the-cncf-annual-cloud-native-survey/"
            target="_blank"
            rel="noreferrer"
          >
            CNCF Annual Cloud Native Survey 2025
          </a>
          <a
            href="https://openinfra.org/annual-report/2025/"
            target="_blank"
            rel="noreferrer"
          >
            OpenInfra Annual Report 2025
          </a>
          <a
            href="https://github.com/open-telemetry/semantic-conventions-genai"
            target="_blank"
            rel="noreferrer"
          >
            OpenTelemetry GenAI conventions
          </a>
        </div>
      </section>
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.metric}>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function TrendCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <article className={styles.trendCard}>
      <strong>{number}</strong>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function SectionTag({
  index,
  children,
}: {
  index: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.sectionTag}>
      <b>{index}</b>
      {children}
    </div>
  );
}

function CaseFact({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state?: "on" | "off";
}) {
  return (
    <div className={styles.caseFact}>
      <dt>{label}</dt>
      <dd data-state={state}>{value}</dd>
    </div>
  );
}
