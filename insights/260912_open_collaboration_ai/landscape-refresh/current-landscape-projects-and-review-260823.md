# Agent & Model Infra 当前项目清单与审校建议（2026-08-23）

## 结论

- 当前首页按 `keep + add` 共展示 149 个项目：Agent Infra 88 个、Model Infra 61 个。
- 唯一事实源仍是 `data/agentic-ai-projects.csv`；本文是可审阅快照，不作为第二份手工数据源。
- 保留首页现有四阶段、25 个分区和视觉组件；建议只做项目归位、局部改名和密度控制。
- GitHub 元数据与 2026-07 OpenRank/参与者口径不同；本文不把 Stars、Trending 或社区活跃直接表述为生产采用。

## 数据质量摘要

- Rows：277（pass）
- Unique repo_id：277（pass）
- Unique repo_name (case-insensitive)：277（pass）
- Selected rows：149（pass）
- Selected rows with unknown homepage section：0（pass）
- Selected rows missing 2026-07 OpenRank：10（caveat）
- Selected rows with NOASSERTION license：26（caveat）
- Selected rows with blank selection reason：0（pass）

## 建议变更

- **P0 · move · `IBM/mcp-context-forge`**：Model Infra / Model API gateways → Agent Infra / Protocols & interoperability。核心对象是 MCP gateway、registry、治理与可观测，不是模型 API 聚合。
- **P0 · move · `agentgateway/agentgateway`**：Model Infra / Model API gateways → Agent Infra / Protocols & interoperability。项目定位是 agentic proxy 与 MCP/agent 流量策略，应该进入 agent 控制面。
- **P0 · watch · `withastro/flue`**：Agent Infra / Code-first frameworks → 观察池。当前 OpenRank 8.83、参与者 3；现有 selection_reason 也写明暂不作为核心代表。
- **P0 · watch · `deepseek-ai/deepseek-harness`**：Agent Infra / Coding harnesses → 观察池。developer preview，2026-07 尚无 OpenRank，参与者为 0。
- **P0 · watch · `openai/symphony`**：Agent Infra / Coding harnesses → 观察池。engineering preview，2026-07 尚无 OpenRank，参与者为 1。
- **P0 · watch · `microsoft/SkillOpt`**：Agent Infra / Observability & evaluation → 观察池。当前 OpenRank 1.56、参与者 2，且 skill 优化并不等同于 observability/evaluation。
- **P0 · watch · `allenai/olmocr`**：Model Infra / Data · Integration → 观察池。2026-07 OpenRank 缺失、参与者为 0；现有 caveat 也建议先作为数据层候选。
- **P1 · watch · `alibaba/open-code-review`**：Agent Infra / Agentic coding → 观察池。定位清晰，但当前 OpenRank 2.96，外部采用与 benchmark 仍待验证。
- **P1 · watch · `different-ai/openwork`**：Agent Infra / Workflow & agent builders → 观察池。当前 OpenRank 11.13、参与者 6，且许可证字段为 NOASSERTION；在拥挤的 builder 分区里先完成许可边界和持续性复核。
- **P1 · watch · `Graphify-Labs/graphify`**：Agent Infra / Memory, knowledge & context → 观察池。与 codebase-memory-mcp 等代码知识图谱项目高度重叠，且项目历史很短。
- **P1 · watch · `DeusData/codebase-memory-mcp`**：Agent Infra / Memory, knowledge & context → 观察池。同类代码知识图谱集中涌现，当前区已有 11 个项目，需要控制重复。
- **P1 · watch · `NVIDIA/SkillSpector`**：Agent Infra / Observability & evaluation → 观察池。安全扫描是有价值的新方向，但当前没有合适分类，OpenRank 1.93、参与者 4，先积累同类项目。
- **P1 · add · `NVIDIA-NeMo/RL`**：观察池 → Model Infra / Post-Train · Reinforcement learning。OpenRank 35.74、参与者 26，能补足成熟的分布式 post-training 工程实现。
- **P1 · add · `agno-agi/agno`**：观察池 → Agent Infra / Code-first frameworks。OpenRank 33.49、参与者 24；若 Flue 下架，可作为不扩容的替换候选。
- **P2 · add-after-structure · `stacklok/toolhive`**：观察池 → Agent Infra / Protocols & interoperability。OpenRank 16.71、参与者 11；只有在 gateway/control-plane 语义被明确后再加入，避免继续挤在 Model API gateway。

## 分类结构建议

- 不重做四阶段和 25 个分区，不改首页粉蓝配色、固定画布、卡片与交互。
- 两个 agent gateway 项目跨层归位到 Agent Infra；Model API gateways 回到模型 API 聚合语义。
- 可仅改三个标签：`Coding workflows & harnesses`、`Tools, web & computer use`、`Post-Train · RL & environments`。
- 暂不拆 `Agent security`；等至少 3 个持续活跃代表后再新增分区。

## 当前 Agent Infra 项目（88）

### Agentic coding（15）

- `openai/codex` — keep; OpenRank 175.40; 参与者 122; Stars 102,090
- `anomalyco/opencode` — keep; OpenRank 157.72; 参与者 97; Stars 190,463
- `anthropics/claude-code` — keep; OpenRank 143.36; 参与者 167; Stars 139,392
- `QwenLM/qwen-code` — keep; OpenRank 53.69; 参与者 38; Stars 26,393
- `warpdotdev/warp` — keep; OpenRank 53.23; 参与者 37; Stars 63,735
- `earendil-works/pi` — keep; OpenRank 43.89; 参与者 18; Stars 79,543
- `cline/cline` — keep; OpenRank 36.82; 参与者 66; Stars 65,129
- `google-gemini/gemini-cli` — keep; OpenRank 35.41; 参与者 11; Stars 106,219
- `Kilo-Org/kilocode` — keep; OpenRank 33.37; 参与者 23; Stars 26,569
- `esengine/DeepSeek-Reasonix` — add; OpenRank 26.06; 参与者 28; Stars 34,916
- `aaif-goose/goose` — keep; OpenRank 21.73; 参与者 21; Stars 51,850
- `MoonshotAI/kimi-code` — add; OpenRank 19.27; 参与者 13; Stars 6,954
- `OpenHands/OpenHands` — keep; OpenRank 11.89; 参与者 18; Stars 82,399
- `github/copilot-cli` — keep; OpenRank 9.93; 参与者 7; Stars 11,029
- `alibaba/open-code-review` — add; OpenRank 2.96; 参与者 9; Stars 20,946

### Chatbot workspaces（3）

- `CherryHQ/cherry-studio` — keep; OpenRank 45.74; 参与者 17; Stars 49,083
- `danny-avila/LibreChat` — keep; OpenRank 22.06; 参与者 11; Stars 41,382
- `open-webui/open-webui` — keep; OpenRank 21.58; 参与者 15; Stars 147,065

### Code-first frameworks（11）

- `vercel/ai` — keep; OpenRank 56.02; 参与者 72; Stars 25,859
- `pydantic/pydantic-ai` — keep; OpenRank 35.72; 参与者 23; Stars 18,861
- `CopilotKit/CopilotKit` — keep; OpenRank 31.48; 参与者 24; Stars 36,339
- `langchain-ai/langchain` — keep; OpenRank 27.87; 参与者 16; Stars 142,799
- `microsoft/agent-framework` — add; OpenRank 27.23; 参与者 20; Stars 12,468
- `livekit/agents` — keep; OpenRank 21.41; 参与者 10; Stars 11,536
- `pipecat-ai/pipecat` — keep; OpenRank 16.15; 参与者 8; Stars 13,773
- `crewAIInc/crewAI` — keep; OpenRank 14.35; 参与者 19; Stars 56,275
- `google/adk-python` — keep; OpenRank 11.68; 参与者 17; Stars 20,921
- `withastro/flue` — add; OpenRank 8.83; 参与者 3; Stars 7,968
- `JetBrains/koog` — add; OpenRank —; 参与者 1; Stars 4,476

### Coding harnesses（9）

- `pingdotgg/t3code` — add; OpenRank 44.99; 参与者 28; Stars 19,678
- `farion1231/cc-switch` — keep; OpenRank 29.32; 参与者 28; Stars 121,967
- `code-yeongyu/oh-my-openagent` — keep; OpenRank 23.75; 参与者 10; Stars 66,711
- `github/spec-kit` — add; OpenRank 15.58; 参与者 13; Stars 125,153
- `affaan-m/ECC` — keep; OpenRank 14.71; 参与者 8; Stars 234,546
- `herdrdev/herdr` — add; OpenRank 11.23; 参与者 9; Stars 30,899
- `obra/superpowers` — keep; OpenRank 5.12; 参与者 5; Stars 262,543
- `deepseek-ai/deepseek-harness` — add; OpenRank —; 参与者 0; Stars 186,968
- `openai/symphony` — add; OpenRank —; 参与者 1; Stars 26,402

### Development sandboxes（4）

- `coder/coder` — keep; OpenRank 62.06; 参与者 32; Stars 13,970
- `kubernetes-sigs/agent-sandbox` — add; OpenRank 11.35; 参与者 14; Stars 3,319
- `opensandbox-group/OpenSandbox` — keep; OpenRank 11.30; 参与者 10; Stars 12,219
- `daytonaio/daytona` — keep; OpenRank —; 参与者 1; Stars 72,122

### Memory, knowledge & context（11）

- `volcengine/OpenViking` — add; OpenRank 177.61; 参与者 163; Stars 27,560
- `milvus-io/milvus` — add; OpenRank 44.93; 参与者 30; Stars 45,399
- `infiniflow/ragflow` — keep; OpenRank 33.94; 参与者 26; Stars 86,252
- `topoteretes/cognee` — add; OpenRank 19.93; 参与者 22; Stars 29,501
- `vectorize-io/hindsight` — keep; OpenRank 15.15; 参与者 6; Stars 18,857
- `headroomlabs-ai/headroom` — add; OpenRank 13.92; 参与者 18; Stars 66,967
- `Graphify-Labs/graphify` — add; OpenRank 13.27; 参与者 11; Stars 108,555
- `mem0ai/mem0` — keep; OpenRank 12.93; 参与者 19; Stars 61,924
- `DeusData/codebase-memory-mcp` — add; OpenRank 8.74; 参与者 11; Stars 39,667
- `supermemoryai/supermemory` — add; OpenRank 6.70; 参与者 9; Stars 28,971
- `oceanbase/seekdb` — keep; OpenRank 6.29; 参与者 3; Stars 2,851

### Multi-agent orchestration（5）

- `bytedance/deer-flow` — keep; OpenRank 218.20; 参与者 181; Stars 78,057
- `mastra-ai/mastra` — keep; OpenRank 54.41; 参与者 34; Stars 26,649
- `paperclipai/paperclip` — keep; OpenRank 49.68; 参与者 98; Stars 74,970
- `multica-ai/multica` — keep; OpenRank 30.63; 参与者 33; Stars 42,351
- `stablyai/orca` — add; OpenRank 29.10; 参与者 49; Stars 49,709

### Observability & evaluation（6）

- `langfuse/langfuse` — keep; OpenRank 31.40; 参与者 22; Stars 32,022
- `comet-ml/opik` — keep; OpenRank 27.22; 参与者 20; Stars 20,941
- `Arize-ai/phoenix` — keep; OpenRank 25.11; 参与者 15; Stars 10,780
- `promptfoo/promptfoo` — keep; OpenRank 10.32; 参与者 11; Stars 23,689
- `NVIDIA/SkillSpector` — add; OpenRank 1.93; 参与者 4; Stars 14,808
- `microsoft/SkillOpt` — add; OpenRank 1.56; 参与者 2; Stars 15,540

### Personal AI assistants（7）

- `openclaw/openclaw` — keep; OpenRank 462.71; 参与者 281; Stars 384,408
- `NousResearch/hermes-agent` — keep; OpenRank 350.21; 参与者 549; Stars 221,762
- `zeroclaw-labs/zeroclaw` — keep; OpenRank 41.22; 参与者 21; Stars 32,421
- `lobehub/lobehub` — keep; OpenRank 38.07; 参与者 21; Stars 80,929
- `AstrBotDevs/AstrBot` — keep; OpenRank 36.97; 参与者 13; Stars 38,235
- `HKUDS/nanobot` — keep; OpenRank 36.96; 参与者 16; Stars 46,331
- `agentscope-ai/QwenPaw` — keep; OpenRank 35.86; 参与者 20; Stars 29,630

### Protocols & interoperability（5）

- `a2ui-project/a2ui` — add; OpenRank 33.04; 参与者 26; Stars 15,926
- `modelcontextprotocol/servers` — keep; OpenRank 8.13; 参与者 15; Stars 88,989
- `ag-ui-protocol/ag-ui` — add; OpenRank 5.38; 参与者 11; Stars 14,963
- `a2aproject/A2A` — keep; OpenRank 5.11; 参与者 8; Stars 25,069
- `anthropics/skills` — keep; OpenRank —; 参与者 6; Stars 164,751

### Tool & browser use（6）

- `larksuite/cli` — add; OpenRank 179.37; 参与者 190; Stars 16,096
- `trycua/cua` — add; OpenRank 7.79; 参与者 8; Stars 20,726
- `vercel-labs/agent-browser` — keep; OpenRank 6.29; 参与者 7; Stars 39,397
- `firecrawl/firecrawl` — add; OpenRank 5.72; 参与者 10; Stars 159,899
- `browser-use/browser-use` — keep; OpenRank 5.40; 参与者 15; Stars 107,103
- `alibaba/page-agent` — keep; OpenRank 1.55; 参与者 1; Stars 28,053

### Workflow & agent builders（6）

- `n8n-io/n8n` — keep; OpenRank 82.05; 参与者 51; Stars 198,383
- `langgenius/dify` — keep; OpenRank 53.65; 参与者 39; Stars 150,556
- `activepieces/activepieces` — keep; OpenRank 32.54; 参与者 29; Stars 23,454
- `langflow-ai/langflow` — keep; OpenRank 26.11; 参与者 12; Stars 152,530
- `different-ai/openwork` — add; OpenRank 11.13; 参与者 6; Stars 22,769
- `FlowiseAI/Flowise` — add; OpenRank 7.76; 参与者 3; Stars 54,996


## 当前 Model Infra 项目（61）

### Compute & scheduling（4）

- `ray-project/ray` — keep; OpenRank 71.45; 参与者 42; Stars 43,374
- `apache/spark` — keep; OpenRank 68.18; 参与者 44; Stars 43,716
- `volcano-sh/volcano` — keep; OpenRank 9.67; 参与者 12; Stars 5,813
- `kserve/kserve` — keep; OpenRank 9.58; 参与者 24; Stars 5,740

### Data · Governance（7）

- `open-metadata/OpenMetadata` — keep; OpenRank 47.49; 参与者 26; Stars 14,587
- `datahub-project/datahub` — keep; OpenRank 38.95; 参与者 23; Stars 12,365
- `apache/iceberg` — keep; OpenRank 34.89; 参与者 32; Stars 9,085
- `apache/hudi` — keep; OpenRank 24.44; 参与者 22; Stars 6,197
- `apache/gravitino` — keep; OpenRank 22.03; 参与者 13; Stars 3,136
- `apache/paimon` — keep; OpenRank 16.38; 参与者 5; Stars 3,353
- `delta-io/delta` — keep; OpenRank 15.67; 参与者 13; Stars 8,925

### Data · Integration（5）

- `apache/airflow` — keep; OpenRank 98.32; 参与者 60; Stars 46,289
- `docling-project/docling` — add; OpenRank 40.22; 参与者 14; Stars 63,893
- `airbytehq/airbyte` — keep; OpenRank 20.61; 参与者 38; Stars 21,723
- `microsoft/markitdown` — add; OpenRank 2.08; 参与者 11; Stars 174,844
- `allenai/olmocr` — add; OpenRank —; 参与者 0; Stars 19,363

### Data · Labeling（2）

- `cvat-ai/cvat` — keep; OpenRank 6.34; 参与者 5; Stars 16,398
- `HumanSignal/label-studio` — keep; OpenRank 1.97; 参与者 4; Stars 27,939

### Model API gateways（6）

- `BerriAI/litellm` — keep; OpenRank 92.22; 参与者 121; Stars 54,916
- `diegosouzapw/OmniRoute` — add; OpenRank 31.92; 参与者 30; Stars 51,639
- `IBM/mcp-context-forge` — add; OpenRank 30.35; 参与者 13; Stars 4,151
- `agentgateway/agentgateway` — add; OpenRank 17.51; 参与者 8; Stars 4,085
- `QuantumNous/new-api` — keep; OpenRank 10.99; 参与者 15; Stars 43,664
- `higress-group/higress` — keep; OpenRank 5.32; 参与者 7; Stars 8,960

### Post-Train · Reinforcement learning（5）

- `verl-project/verl` — keep; OpenRank 22.94; 参与者 13; Stars 22,699
- `huggingface/trl` — add; OpenRank 22.75; 参与者 14; Stars 18,952
- `RLinf/RLinf` — keep; OpenRank 10.12; 参与者 5; Stars 4,289
- `areal-project/AReaL` — keep; OpenRank 6.45; 参与者 4; Stars 5,612
- `huggingface/OpenEnv` — add; OpenRank —; 参与者 6; Stars 2,509

### Post-Train · Supervised fine-tuning（3）

- `unslothai/unsloth` — keep; OpenRank 28.52; 参与者 13; Stars 69,015
- `modelscope/ms-swift` — keep; OpenRank 13.69; 参与者 10; Stars 14,973
- `hiyouga/LlamaFactory` — keep; OpenRank —; 参与者 1; Stars 73,582

### Pre-Train · Compiler & accelerator（8）

- `flashinfer-ai/flashinfer` — keep; OpenRank 147.83; 参与者 119; Stars 6,053
- `triton-lang/triton` — keep; OpenRank 41.95; 参与者 14; Stars 19,803
- `NVIDIA/Model-Optimizer` — add; OpenRank 36.92; 参与者 22; Stars 3,324
- `NVIDIA/TransformerEngine` — keep; OpenRank 17.70; 参与者 9; Stars 3,450
- `openxla/xla` — add; OpenRank 11.48; 参与者 10; Stars 4,431
- `NVIDIA/cutlass` — keep; OpenRank 6.04; 参与者 6; Stars 10,151
- `Dao-AILab/flash-attention` — keep; OpenRank 5.43; 参与者 5; Stars 24,557
- `deepseek-ai/DeepEP` — keep; OpenRank —; 参与者 0; Stars 9,913

### Pre-Train · Evaluation & observability（2）

- `wandb/wandb` — keep; OpenRank 33.87; 参与者 8; Stars 11,209
- `mlflow/mlflow` — keep; OpenRank 31.50; 参与者 22; Stars 27,247

### Pre-Train · Framework & parallel（6）

- `pytorch/pytorch` — keep; OpenRank 333.26; 参与者 149; Stars 102,035
- `jax-ml/jax` — keep; OpenRank 121.48; 参与者 77; Stars 36,065
- `NVIDIA/Megatron-LM` — keep; OpenRank 32.39; 参与者 36; Stars 17,247
- `PaddlePaddle/Paddle` — keep; OpenRank 23.89; 参与者 38; Stars 24,035
- `tensorflow/tensorflow` — add; OpenRank 9.56; 参与者 26; Stars 196,564
- `deepspeedai/DeepSpeed` — keep; OpenRank 5.74; 参与者 5; Stars 42,826

### Pre-Train · Robotics infra（2）

- `huggingface/lerobot` — keep; OpenRank 9.76; 参与者 24; Stars 26,203
- `OpenMind/OM1` — keep; OpenRank —; 参与者 4; Stars 2,890

### Serving · Deploy（3）

- `ollama/ollama` — keep; OpenRank 167.01; 参与者 152; Stars 177,103
- `ai-dynamo/dynamo` — keep; OpenRank 115.92; 参与者 62; Stars 7,608
- `llm-d/llm-d` — keep; OpenRank 19.67; 参与者 9; Stars 3,897

### Serving · Inference（8）

- `sgl-project/sglang` — keep; OpenRank 215; 参与者 112; Stars 30,852
- `vllm-project/vllm` — keep; OpenRank 189.08; 参与者 164; Stars 87,453
- `NVIDIA/TensorRT-LLM` — keep; OpenRank 145.76; 参与者 77; Stars 14,235
- `ggml-org/llama.cpp` — keep; OpenRank 90.46; 参与者 53; Stars 121,872
- `vllm-project/vllm-omni` — add; OpenRank 54.29; 参与者 30; Stars 5,719
- `microsoft/onnxruntime` — add; OpenRank 46.91; 参与者 22; Stars 21,210
- `openvinotoolkit/openvino` — keep; OpenRank 27.34; 参与者 39; Stars 10,585
- `LMCache/LMCache` — add; OpenRank 17.97; 参与者 14; Stars 10,921
