import { ArrowUpRightIcon, ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import { getLandscapeProjects } from "@/lib/landscape-data";

import LandscapeLogo from "./components/landscape-logo";
import LandscapeExplorer from "./components/landscape-explorer";
import FloatingLandscapeNav from "./components/floating-landscape-nav";
import styles from "./page.module.css";

export default function Home() {
  const projects = getLandscapeProjects();

  return (
    <main className={styles.page}>
      <FloatingLandscapeNav />
      <div className={styles.appShell}>
        <header className={styles.siteHeader}>
          <a
            className={styles.brand}
            href="#landscape"
            aria-label="Agentic AI Open Source Landscape home"
          >
            <LandscapeLogo className={styles.brandMark} />
            <strong>Agentic AI Landscape</strong>
          </a>
          <nav className={styles.headerNav} aria-label="Primary navigation">
            <details className={styles.navMenu} name="primary-navigation-menu">
              <summary>
                Releases
                <ChevronDownIcon aria-hidden="true" />
              </summary>
              <div className={styles.navPanel}>
                <a
                  className={styles.archiveRelease}
                  href="https://github.com/antgroup/agentic-ai-landscape/blob/main/insights/260527-agentic_landscape/260527_agentic_ai_en.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>260527</strong>
                  <ArrowUpRightIcon aria-hidden="true" />
                </a>
                <a
                  className={styles.archiveRelease}
                  href="https://github.com/antgroup/agentic-ai-landscape/blob/main/insights/260401_agentic_landscape/01-Taking-the-Pulse-of-Agentic-AI-Q1-2026.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>260401</strong>
                  <ArrowUpRightIcon aria-hidden="true" />
                </a>
                <a
                  className={styles.archiveRelease}
                  href="https://github.com/antgroup/agentic-ai-landscape/blob/main/insights/250913_llm_landscape/250913_llm_report_en.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>250913</strong>
                  <ArrowUpRightIcon aria-hidden="true" />
                </a>
                <a
                  className={styles.archiveRelease}
                  href="https://github.com/antgroup/agentic-ai-landscape/blob/main/insights/250527_llm_landscape/250527_llm_report_en.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>250527</strong>
                  <ArrowUpRightIcon aria-hidden="true" />
                </a>
              </div>
            </details>
            <details className={styles.navMenu} name="primary-navigation-menu">
              <summary>
                Presentations
                <ChevronDownIcon aria-hidden="true" />
              </summary>
              <div className={styles.navPanel}>
                <Link
                  className={styles.inclusionPresentation}
                  href="/presentations/260910_inclusion"
                >
                  <span>260910</span>
                  <strong>260910_inclusion</strong>
                </Link>
                <Link
                  className={styles.communityPresentation}
                  href="/presentations/260807_CommunityOverCode"
                >
                  <span>260807</span>
                  <strong>260807_CommunityOverCode</strong>
                </Link>
              </div>
            </details>
            <a
              href="https://github.com/antgroup/agentic-ai-landscape"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
              <ArrowUpRightIcon aria-hidden="true" />
            </a>
          </nav>
        </header>

        <LandscapeExplorer projects={projects} />

        <footer className={styles.footer}>
          <div>
            <LandscapeLogo className={styles.footerMark} />
            <p>
              Open-source projects across Agent Infra, Model Infra, Large
              Models, and reusable agent assets.
            </p>
          </div>
          <p>
            Data from{" "}
            <a
              href="https://github.com/antgroup/agentic-ai-landscape"
              target="_blank"
              rel="noreferrer"
            >
              antgroup/agentic-ai-landscape
            </a>
            . Multi-label categories overlap by design.
          </p>
        </footer>
      </div>
    </main>
  );
}
