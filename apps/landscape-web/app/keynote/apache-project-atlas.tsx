"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Image from "next/image";

import {
  type ApacheDomainKey,
  apacheDomains,
  apacheLandscapeGroups,
  apacheLandscapeProjects,
} from "./apache-ecosystem";
import styles from "./page.module.css";

export default function ApacheProjectAtlas({
  activeDomain,
  onDomainChange,
  stage = false,
  stageBuild = 0,
}: {
  activeDomain: ApacheDomainKey;
  onDomainChange?: (domain: ApacheDomainKey) => void;
  stage?: boolean;
  stageBuild?: number;
}) {
  return (
    <div
      className={`${styles.apacheAtlas} ${styles.deepDive}`}
      data-stage={stage ? "true" : undefined}
      data-build={stage ? stageBuild : undefined}
    >
      <div className={styles.apacheAtlasHeading}>
        <div>
          {!stage ? <strong>APACHE PROJECT ATLAS</strong> : null}
          <span>Apache 项目领域与 Agentic Landscape 入选</span>
        </div>
        {!stage ? (
          <dl>
            <div><dt>领域</dt><dd>7 个</dd></div>
            <div><dt>来源</dt><dd>Apache Projects Directory</dd></div>
            <div><dt>数量</dt><dd>同一项目可属于多个领域</dd></div>
            <div><dt>头部项目</dt><dd>主要 GitHub repo stars</dd></div>
          </dl>
        ) : null}
      </div>

      <div className={styles.apacheAtlasBody}>
        <div
          className={styles.apacheDomainTabs}
          role="tablist"
          aria-label="Apache 技术领域"
        >
          {(Object.keys(apacheDomains) as ApacheDomainKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              tabIndex={stage ? -1 : undefined}
              aria-selected={activeDomain === key}
              className={activeDomain === key ? styles.activeDomain : ""}
              onClick={() => onDomainChange?.(key)}
            >
              <strong>{apacheDomains[key].count}</strong>
              <span>{apacheDomains[key].label}</span>
            </button>
          ))}
        </div>

        <article className={styles.apacheDomainDetail} key={activeDomain}>
          <div className={styles.apacheDomainLead}>
            <div>
              {!stage ? <span>PROJECT RECORDS</span> : null}
              <strong>{apacheDomains[activeDomain].count}</strong>
            </div>
            <div className={styles.apacheDomainName}>
              <h3>{apacheDomains[activeDomain].label}</h3>
              <div className={styles.apacheLabelCloud}>
                {apacheDomains[activeDomain].officialLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
            <p className={styles.apacheDomainDefinition}>
              {apacheDomains[activeDomain].definition}
            </p>
          </div>

          <div className={styles.apacheHeadProjects}>
            <p>{stage ? "头部项目" : "HEAD PROJECTS · GITHUB STARS SNAPSHOT"}</p>
            <div>
              {apacheDomains[activeDomain].heads.map(([name, stars]) => (
                <span key={name}>
                  <strong>{name}</strong>
                  <small>★ {stars}</small>
                </span>
              ))}
            </div>
          </div>

        </article>
      </div>

      <div
        className={styles.apacheAgenticMapping}
        data-focus={stage ? "true" : "false"}
      >
        <div className={styles.apacheAgenticMappingLead}>
          <strong>{stage ? "6 个 Landscape 入选项目" : "6 APACHE PROJECTS IN AGENTIC LANDSCAPE"}</strong>
          {!stage ? <span>按 Agentic AI 技术角色重组</span> : null}
        </div>
        <div className={styles.apacheAgenticGroups}>
          {apacheLandscapeGroups.map((group) => (
            <section key={group.label}>
              <header>
                <small>{group.label}</small>
                <strong>{group.title}</strong>
              </header>
              <div>
                {group.projects.map((name) => {
                  const project = apacheLandscapeProjects.find(
                    (candidate) => candidate.name === name,
                  );
                  if (!project) return null;
                  return (
                    <span key={project.name}>
                      <Image src={project.logo} alt="" width={18} height={18} />
                      Apache {project.name}
                    </span>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className={styles.apacheMetadataGap}>
        <strong>45</strong>
        <div>
          <span>目录中缺少可用领域标签的记录</span>
          <p>
            其中 2 个 Landscape 项目是 Paimon、Gravitino；Fory、Celeborn 等项目也在这 45 条记录中。
          </p>
        </div>
        <div className={styles.apacheSourceLinks}>
          <a
            href="https://projects.apache.org/"
            target="_blank"
            rel="noreferrer"
            tabIndex={stage ? -1 : undefined}
          >
            Projects Directory <ArrowUpRightIcon aria-hidden="true" />
          </a>
          <a
            href="https://github.com/apache"
            target="_blank"
            rel="noreferrer"
            tabIndex={stage ? -1 : undefined}
          >
            GitHub apache org <ArrowUpRightIcon aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
