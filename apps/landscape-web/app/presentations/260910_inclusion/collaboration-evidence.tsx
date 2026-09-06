"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type { ReportLocale } from "@/lib/inclusion-report-copy";
import type { CollaborationResearchStats } from "./research-data";
import styles from "./collaboration-evidence.module.css";

type Props = {
  research: CollaborationResearchStats;
};

const threadCases = [
  {
    id: "coder",
    project: "Coder",
    identity: "Mixed",
    kind: "Pull request",
    number: "#25800",
    outcome: "Merged",
    title: "Classify provider_disabled 503 as non-retryable",
    excerpt: "/coder-agents-review",
    detail:
      "A maintainer invoked the review swarm more than once. The bot reported 17 reviewers and a $62.66 spend; a human then acknowledged the result before merge.",
    href: "https://github.com/coder/coder/pull/25800",
    actors: [
      ["Contributor", "opens fix", "human"],
      ["Maintainer", "invokes review", "human"],
      ["Agent swarm", "checks the patch", "agent"],
      ["Maintainer", "accepts and merges", "human"],
    ],
  },
  {
    id: "onnx",
    project: "ONNX Runtime",
    identity: "Traditional",
    kind: "Pull request",
    number: "#28045",
    outcome: "Merged",
    title: "Add CUDA LabelEncoder support for numeric types",
    excerpt: "Please use std::stable_sort and remove duplicate keys.",
    detail:
      "Copilot opened the change and supplied four commits. Human review surfaced implementation and test gaps; eight later commits completed a 944-line change.",
    href: "https://github.com/microsoft/onnxruntime/pull/28045",
    actors: [
      ["Copilot", "opens + 4 commits", "agent"],
      ["Reviewers", "find semantic gaps", "human"],
      ["Author", "rewrites and tests", "human"],
      ["Maintainer", "merges", "human"],
    ],
  },
  {
    id: "langchain",
    project: "LangChain",
    identity: "LLM-native",
    kind: "Pull request",
    number: "#37607",
    outcome: "Closed",
    title: "Add float support to merge_dicts and merge_obj",
    excerpt: "Opening a PR is not an indication it will be accepted.",
    detail:
      "The repository bot closed an unassigned contribution. Automation handled the gate, but the rule being enforced came from the project’s human contribution policy.",
    href: "https://github.com/langchain-ai/langchain/pull/37607",
    actors: [
      ["Contributor", "opens patch", "human"],
      ["Policy bot", "checks assignment", "agent"],
      ["Policy", "requires prior scope", "system"],
      ["Bot", "closes PR", "agent"],
    ],
  },
  {
    id: "pytorch",
    project: "PyTorch",
    identity: "Traditional",
    kind: "Pull request",
    number: "#182986",
    outcome: "Deep review",
    title: "Inner-tree sum reduction",
    excerpt: "This is a fairly sweeping change.",
    detail:
      "Humans repeatedly called Claude for CI analysis and review. A contributor challenged one false positive with benchmarks; maintainers still required stronger justification.",
    href: "https://github.com/pytorch/pytorch/pull/182986",
    actors: [
      ["Contributor", "proposes optimization", "human"],
      ["Claude", "reviews and reads CI", "agent"],
      ["Contributor", "rebuts with benchmarks", "human"],
      ["Maintainer", "holds the gate", "human"],
    ],
  },
  {
    id: "supabase",
    project: "Supabase",
    identity: "Traditional",
    kind: "Issue",
    number: "#42193",
    outcome: "PR followed",
    title: "Community request moves from planning to implementation",
    excerpt: "The issue description is inaccurate.",
    detail:
      "CodeRabbit offered a plan, several people asked to take the work, and the issue author corrected the premise before a contributor opened a pull request.",
    href: "https://github.com/supabase/supabase/issues/42193",
    actors: [
      ["Reporter", "opens issue", "human"],
      ["CodeRabbit", "suggests a plan", "agent"],
      ["Community", "asks for assignment", "human"],
      ["Contributor", "opens PR", "human"],
    ],
  },
  {
    id: "gemini",
    project: "Gemini CLI",
    identity: "LLM-native",
    kind: "Issue",
    number: "#24026",
    outcome: "Closed duplicate",
    title: "Quota report is matched to known incidents",
    excerpt: "This issue appears to be a duplicate.",
    detail:
      "The Gemini bot surfaced related reports. A human then identified the quota and capacity pattern and closed the issue as a known duplicate.",
    href: "https://github.com/google-gemini/gemini-cli/issues/24026",
    actors: [
      ["User", "reports failure", "human"],
      ["Gemini bot", "finds related issues", "agent"],
      ["Maintainer", "matches incident", "human"],
      ["Maintainer", "closes duplicate", "human"],
    ],
  },
  {
    id: "n8n",
    project: "n8n",
    identity: "LLM-native",
    kind: "Issue",
    number: "#33411",
    outcome: "Fixed",
    title: "Public issue becomes an internal work item",
    excerpt: "Created Linear issue GHC-8844.",
    detail:
      "An assistant acknowledged the report and routed it into the team’s internal tracker. A human later returned to GitHub and closed the public issue as fixed.",
    href: "https://github.com/n8n-io/n8n/issues/33411",
    actors: [
      ["User", "reports bug", "human"],
      ["Assistant", "acknowledges", "agent"],
      ["Assistant", "creates work item", "agent"],
      ["Maintainer", "confirms fix", "human"],
    ],
  },
] as const;

const metricNotes: Record<string, string> = {
  agentParticipation:
    "This line follows how often a named Agent appears anywhere in the sampled thread as the repository moves from launch to 2026.",
  maintainerParticipation:
    "This line follows the share of sampled threads with a visible response from an owner, member or collaborator at each stage.",
  mergedWithin30Days:
    "This line follows the share of sampled pull requests that reached GitHub's merged state within 30 days.",
};

const threadCaseTranslations: Record<
  string,
  {
    kind: string;
    outcome: string;
    title: string;
    excerpt: string;
    detail: string;
    actors: readonly (readonly [string, string, string])[];
  }
> = {
  coder: {
    kind: "PR",
    outcome: "已合入",
    title: "将 provider_disabled 503 判定为不可重试",
    excerpt: "/coder-agents-review",
    detail: "维护者多次调用 review swarm。Bot 报告共使用 17 个 reviewer、花费 62.66 美元；随后由真人确认结果并完成合入。",
    actors: [["贡献者", "提交修复", "human"], ["维护者", "调用 review", "human"], ["Agent swarm", "检查补丁", "agent"], ["维护者", "接受并合入", "human"]],
  },
  onnx: {
    kind: "PR",
    outcome: "已合入",
    title: "为数值类型增加 CUDA LabelEncoder 支持",
    excerpt: "请使用 std::stable_sort，并删除重复 key。",
    detail: "Copilot 发起改动并提交 4 个 commit。真人评审发现实现与测试缺口；之后的 8 个 commit 完成了这项 944 行的改动。",
    actors: [["Copilot", "发起并提交 4 次", "agent"], ["Reviewer", "发现语义缺口", "human"], ["作者", "重写并补充测试", "human"], ["维护者", "完成合入", "human"]],
  },
  langchain: {
    kind: "PR",
    outcome: "已关闭",
    title: "为 merge_dicts 与 merge_obj 增加 float 支持",
    excerpt: "提交 PR 并不表示它一定会被接受。",
    detail: "仓库 Bot 关闭了一项未分配的贡献。自动化执行了入口规则，但规则本身来自项目制定的真人贡献政策。",
    actors: [["贡献者", "提交补丁", "human"], ["政策 Bot", "检查分配状态", "agent"], ["贡献政策", "要求事先确认范围", "system"], ["Bot", "关闭 PR", "agent"]],
  },
  pytorch: {
    kind: "PR",
    outcome: "深度评审",
    title: "Inner-tree sum reduction",
    excerpt: "这是一项影响范围相当大的改动。",
    detail: "真人多次调用 Claude 分析 CI 与 review。贡献者用 benchmark 反驳了一次误报，维护者仍要求提供更充分的理由。",
    actors: [["贡献者", "提出优化", "human"], ["Claude", "评审并读取 CI", "agent"], ["贡献者", "用 benchmark 回应", "human"], ["维护者", "把守合入决定", "human"]],
  },
  supabase: {
    kind: "Issue",
    outcome: "随后产生 PR",
    title: "社区需求从计划进入实现",
    excerpt: "Issue 描述并不准确。",
    detail: "CodeRabbit 给出方案，多位参与者申请接手；Issue 作者先纠正问题前提，随后才有贡献者提交 PR。",
    actors: [["报告者", "提交 Issue", "human"], ["CodeRabbit", "提出方案", "agent"], ["社区", "申请分配任务", "human"], ["贡献者", "提交 PR", "human"]],
  },
  gemini: {
    kind: "Issue",
    outcome: "作为重复项关闭",
    title: "把配额报告与已知事件关联",
    excerpt: "这个 Issue 看起来是重复项。",
    detail: "Gemini Bot 找到相关报告，随后由真人识别配额与容量模式，并把 Issue 作为已知重复项关闭。",
    actors: [["用户", "报告故障", "human"], ["Gemini Bot", "寻找相关 Issue", "agent"], ["维护者", "匹配已知事件", "human"], ["维护者", "关闭重复项", "human"]],
  },
  n8n: {
    kind: "Issue",
    outcome: "已修复",
    title: "公开 Issue 被转成内部工作项",
    excerpt: "已创建 Linear issue GHC-8844。",
    detail: "Assistant 确认报告并把它转入团队内部 tracker。真人随后回到 GitHub，将公开 Issue 标记为已修复并关闭。",
    actors: [["用户", "报告 bug", "human"], ["Assistant", "确认问题", "agent"], ["Assistant", "创建内部工作项", "agent"], ["维护者", "确认修复", "human"]],
  },
};

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function CollaborationCasebook({ locale }: { locale: ReportLocale }) {
  const [caseId, setCaseId] = useState<string>(threadCases[0].id);
  const active = threadCases.find((item) => item.id === caseId) ?? threadCases[0];
  const isChinese = locale === "zh-CN";
  const translated = threadCaseTranslations[active.id];
  const activeKind = isChinese ? translated.kind : active.kind;
  const activeOutcome = isChinese ? translated.outcome : active.outcome;
  const activeActors = isChinese ? translated.actors : active.actors;

  return (
    <section className={styles.casebook} data-reveal>
      <header>
        <h3>{isChinese ? "相同结果背后，可能是完全不同的交接方式。" : "The same outcome can hide very different hand-offs."}</h3>
        <p>
          {isChinese ? "其中四条案例来自 5,000 条线程样本，三条来自十仓库面板。公开时间线显示，在一条线程被合入、关闭或修复之前，贡献者、Agent、自动化和维护者分别从哪里进入工作。" : "Four cases come from the 5,000-thread sample and three from the ten-repository panels. Their public timelines show where contributors, Agents, automation and maintainers enter the work before a thread is merged, closed or fixed."}
        </p>
      </header>
      <div className={styles.caseTabs} role="tablist" aria-label="Issue and pull request cases">
        {threadCases.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={item.id === active.id}
            data-active={item.id === active.id}
            key={item.id}
            onClick={() => setCaseId(item.id)}
          >
            <span>{item.project}</span>
            <small>{isChinese ? threadCaseTranslations[item.id].kind : item.kind} {item.number}</small>
          </button>
        ))}
      </div>
      <article className={styles.caseStage}>
        <div className={styles.caseCopy}>
          <div className={styles.caseMeta}>
            <span>{active.identity}</span>
            <span>{activeKind}</span>
            <span>{activeOutcome}</span>
          </div>
          <h4>{isChinese ? translated.title : active.title}</h4>
          <blockquote>“{isChinese ? translated.excerpt : active.excerpt}”</blockquote>
          <p>{isChinese ? translated.detail : active.detail}</p>
          <a href={active.href} target="_blank" rel="noreferrer">
            {isChinese ? "打开公开线程" : "Open the public thread"} <ExternalLinkIcon aria-hidden="true" />
          </a>
        </div>
        <ol className={styles.actorTrace}>
          {activeActors.map(([actor, action, role], index) => (
            <li data-role={role} key={`${actor}-${action}-${index}`}>
              <i>{String(index + 1).padStart(2, "0")}</i>
              <div><strong>{actor}</strong><span>{action}</span></div>
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}

export function CollaborationEvolution({ research }: Props) {
  const [projectId, setProjectId] = useState(research.projectStages[0]?.project ?? "");
  const [metric, setMetric] = useState<"agentParticipation" | "maintainerParticipation" | "mergedWithin30Days">("agentParticipation");
  const project = research.projectStages.find((item) => item.project === projectId) ?? research.projectStages[0];
  const points = useMemo(() => {
    if (!project) return [];
    return project.stages.map((stage, index) => ({
      x: 92 + index * 292,
      y: stage[metric] === null ? null : 238 - stage[metric]! * 182,
      value: stage[metric],
      label: stage.label,
      pullRequests: stage.pullRequests,
    }));
  }, [metric, project]);
  const path = points.filter((point) => point.y !== null).map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <section className={styles.evolutionLab} data-reveal>
      <header>
        <h3>Agent participation changes as a repository matures.</h3>
        <p>
          The full lifecycle panel contains 900 threads from ten repositories: 30 in each
          project&apos;s launch window, 30 in 2025 Q4 and 30 in May–August 2026. This chart
          shows four at a time and compares each repository with its own earlier stages.
          The trajectories reveal whether Agent participation, maintainer presence and
          30-day merge outcomes moved together as the project grew.
        </p>
      </header>
      <div className={styles.evolutionControls}>
        <div role="tablist" aria-label="Project">
          {research.projectStages.map((item) => (
            <button type="button" data-active={item.project === project?.project} key={item.project} onClick={() => setProjectId(item.project)}>
              {item.project.split("/")[1]}
            </button>
          ))}
        </div>
        <div role="tablist" aria-label="Measure">
          <button type="button" data-active={metric === "agentParticipation"} onClick={() => setMetric("agentParticipation")}>Agent present</button>
          <button type="button" data-active={metric === "maintainerParticipation"} onClick={() => setMetric("maintainerParticipation")}>Maintainer present</button>
          <button type="button" data-active={metric === "mergedWithin30Days"} onClick={() => setMetric("mergedWithin30Days")}>PR merged ≤30d</button>
        </div>
      </div>
      <div className={styles.stageChart}>
        <svg viewBox="0 0 760 300" role="img" aria-label={`${project?.project} stage trajectory`}>
          {[0, .25, .5, .75, 1].map((tick) => (
            <g key={tick}>
              <line x1="72" x2="700" y1={238 - tick * 182} y2={238 - tick * 182} />
              <text x="12" y={242 - tick * 182}>{Math.round(tick * 100)}%</text>
            </g>
          ))}
          {path ? <path d={path} className={styles.stageLine} /> : null}
          {points.map((point) => (
            <g key={point.label}>
              <line className={styles.stageGuide} x1={point.x} x2={point.x} y1="56" y2="238" />
              {point.y === null ? (
                <text className={styles.noPoint} x={point.x} y="148" textAnchor="middle">no PRs</text>
              ) : (
                <>
                  <circle cx={point.x} cy={point.y} r="10" />
                  <text className={styles.pointValue} x={point.x} y={point.y - 18} textAnchor="middle">{percent(point.value!)}</text>
                </>
              )}
              <text className={styles.stageName} x={point.x} y="274" textAnchor="middle">{point.label}</text>
            </g>
          ))}
        </svg>
        <aside>
          <span>{project?.identity.replace("_", " ")} · {project?.niche.replaceAll("_", " ")}</span>
          <p>{metricNotes[metric]}</p>
          <dl>
            {project?.stages.map((stage) => (
              <div key={stage.stage}><dt>{stage.label}</dt><dd>{stage.pullRequests} PRs</dd></div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}

export function CollaborationCommitAttribution({ research }: Props) {
  return (
    <section className={styles.lineageSection} data-reveal>
      <header>
        <strong>Who carried the patch after it opened?</strong>
        <span>Four examples from the 10-PR code-lineage subset</span>
      </header>
      <div className={styles.lineageRows}>
        {research.codeLineages.map((item) => (
          <a href={item.href} target="_blank" rel="noreferrer" key={`${item.project}-${item.number}`}>
            <div>
              <strong>{item.project} #{item.number}</strong>
              <small>+{item.additions} / −{item.deletions} · {item.commits} commits</small>
            </div>
            <div className={styles.commitBraid} aria-label={`${item.agentCommits} Agent-attributed and ${item.otherCommits} human or unattributed commits`}>
              {Array.from({ length: item.agentCommits }, (_, index) => <i data-role="agent" key={`a-${index}`} />)}
              {Array.from({ length: item.otherCommits }, (_, index) => <i data-role="other" key={`h-${index}`} />)}
            </div>
            <span>{item.agentCommits} Agent · {item.otherCommits} human / unknown</span>
          </a>
        ))}
      </div>
      <p>
        Commit identity is a narrow public signal. ONNX Runtime and OpenMetadata show a visible
        Agent-to-human handoff; Vercel AI SDK #18818 remains Agent-attributed throughout the sampled history.
      </p>
    </section>
  );
}
