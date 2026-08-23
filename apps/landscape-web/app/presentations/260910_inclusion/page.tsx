import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MonitorPlayIcon,
} from "lucide-react";

import LandscapeLogo from "@/app/components/landscape-logo";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "260910 InclusionAI｜Agentic AI Landscape",
  description:
    "Agentic AI Landscape 2026 年 9 月趋势洞察与交互式演示。",
};

const sections = [
  {
    index: "01",
    label: "LANDSCAPE",
    title: "生态图更新",
    detail: "项目增删、分类调整与生态位置变化",
  },
  {
    index: "02",
    label: "SIGNALS",
    title: "趋势洞察",
    detail: "OpenRank、参与者与技术领域的月度变化",
  },
  {
    index: "03",
    label: "PRESENTATION",
    title: "交互式演示",
    detail: "16:9 播放、键盘翻页、触控与全屏",
  },
] as const;

export default function InclusionPresentationHome() {
  return (
    <main className={styles.page} lang="zh-CN">
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link
            className={styles.brand}
            href="/"
            aria-label="返回 Agentic AI Landscape"
          >
            <LandscapeLogo className={styles.brandMark} />
            <strong>Agentic AI Landscape</strong>
          </Link>
          <p className={styles.releaseLabel}>
            <strong>260910</strong>
            InclusionAI
          </p>
          <div className={styles.headerActions}>
            <Link
              className={styles.stageLink}
              href="/presentations/260910_inclusion/present"
            >
              <MonitorPlayIcon aria-hidden="true" />
              播放演示
            </Link>
            <Link className={styles.backLink} href="/">
              <ArrowLeftIcon aria-hidden="true" />
              返回生态图
            </Link>
          </div>
        </header>

        <section className={styles.hero} aria-labelledby="inclusion-title">
          <div className={styles.dateBlock} aria-label="2026 年 9 月 10 日">
            <div className={styles.inclusionMark}>
              <Image
                src="/keynote/inclusionai/inclusionai.png"
                alt="InclusionAI"
                width={52}
                height={52}
                priority
              />
              <span>InclusionAI</span>
            </div>
            <strong>
              09<span aria-hidden="true">.</span>10
            </strong>
            <small>2026 · Trend update</small>
          </div>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>AGENTIC AI LANDSCAPE · SEPTEMBER 2026</p>
            <h1 id="inclusion-title">
              最新一期
              <em>趋势洞察</em>
            </h1>
            <p className={styles.heroIntro}>
              这一期继续更新 Agent Infra、Model Infra 与项目活跃度信号，并把完整内容组织成适合现场讲解的交互式演示。
            </p>
            <Link
              className={styles.primaryAction}
              href="/presentations/260910_inclusion/present"
            >
              进入 16:9 播放模式
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className={styles.releaseStructure} aria-labelledby="release-structure-title">
          <div className={styles.sectionHeading}>
            <span>260910</span>
            <h2 id="release-structure-title">本期结构</h2>
          </div>
          <div className={styles.sectionRows}>
            {sections.map((section) => (
              <article key={section.index}>
                <span>{section.index}</span>
                <p>{section.label}</p>
                <h3>{section.title}</h3>
                <small>{section.detail}</small>
              </article>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <strong>ANT OPEN SOURCE</strong>
          <span>×</span>
          <strong>INCLUSION AI</strong>
        </footer>
      </div>
    </main>
  );
}
