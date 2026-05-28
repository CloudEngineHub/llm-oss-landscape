Just over three months ago, Ant Open Source and InclusionAI jointly released the very first **Open Source LLM Development Landscape**, along with a trend insights report. Our goal was simple: to highlight which projects in this fast-moving ecosystem are most worth tracking, using, and contributing to — and which ones might be less so.



The release drew a lot of attention and recognition, which we were thrilled to see. Meanwhile, the open source community hasn’t stood still. Every code commit and every project adoption subtly sketches the trajectory of the industry. In this AI battleground that feels like a “real-world hackathon,” change has been relentless.



That’s why, we’re excited to unveil the **2.0 release of our Landscape** — a refreshed view of the ecosystem, built with even more insights and context. With the 2.0 release, we also refreshed our methodology for mapping the ecosystem. As expected, this surfaced a wave of previously overlooked projects, at the same time, some projects didn’t make the cut this round.



The spotlight is moving. Who are the new open source stars? Which heavyweights are setting the tone? And most importantly — where do we, as developers and contributors, find our place in this ever-evolving arena? Over the next sections, we’ll walk through the key shifts — and the constants — that have defined these last 100 days.

## Open Source LLM Development Landscape 2.0
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757512236895-8eff51a8-6596-4f9d-aa90-8305631ac13e.png)

[https://antoss-landscape.my.canva.site/](https://antoss-landscape.my.canva.site/)



The updated landscape is organized into two major directions: **AI Infra** and **AI Agents**. Drawing on community data, we identified and included **114 of the most prominent open source projects**, spanning **22 distinct technical domains**.



A key part of our analysis continues to rely on the [OpenRank evaluation system](https://open-digger.cn/en/docs/user_docs/metrics/openrank), which is an algorithm that measures the relative influence of projects across the ecosystem by analyzing patterns of community collaboration and relationships. Since we’ll be referencing OpenRank repeatedly in later sections of this report, it’s worth calling it out here up front.


In the **1.0 version**, our approach started with a handful of well-known seed projects — such as **PyTorch**, **vLLM**, and **LangChain**. From there, we expanded outward by multi-hop searching their collaboration networks and gathering the closely linked open source projects. While effective, this method was heavily influenced by factors like which seed projects we chose and how many projects were pulled in at each hop — making the results somewhat random.

For 2.0, we shifted the methodology. Since **OpenRank** is itself an algorithm based on community collaboration relationships, we went straight to the **global GitHub OpenRank rankings for that month**. From the top down, we filtered projects by their descriptions and tags to identify those belonging to the LLM ecosystem, and then gradually refined the scope.

This change paid off: the process surfaced many previously overlooked projects with high activity and momentum. It also gave us confidence to raise the bar — only including projects with an **OpenRank score of 50 or higher** for that month.

*Note: By installing the [**HyperCRX**](https://github.com/hypertrons/hypertrons-crx) browser extension, you can view an open-source project's **OpenRank trend** in the bottom-right corner of its GitHub repository page.*


Compared with the **1.0 release a hundred days ago**, this new **2.0 Landscape** brings in **39 fresh projects** — making up about **35% of the total list**. On the other hand, **60 projects from the first version have been dropped**. The biggest reason behind these removals is the new bar we set. Many of the excluded projects, looking at the trends, are indeed sliding toward the **“AI graveyard.”** We’ll unpack some of these cases in detail later. There are also category-specific cases — for instance, **ONNX Runtime**. While it remains highly relevant in traditional machine learning for training and inference, it has limited overlap with the large model ecosystem, and thus didn’t make the cut this time.

<font style="color:black;"></font>

Even if we include the projects that were dropped, the **median “age”** of all projects in the large model development ecosystem is just **30 months — barely two and a half years old**. Their youth mirrors the breathtaking pace of iteration in this space.

In fact, **62% of these projects were launched after the “GPT moment” (October 2022)**, with **12 of them founded as recently as this year**. Despite being so new, the attention they’ve received is staggering: on average, each project has already **<font style="color:rgba(253,58,184,1);">accumulated nearly 30,000 GitHub stars</font>** — a level of traction older open source projects could hardly dream of.

<font style="color:black;"></font>

These projects have drawn participation from **<font style="color:rgba(253,58,184,1);">366,521 developers worldwide</font>**. Among those with identifiable locations, about **24% are based in the United States**, **18% in China**, followed by **India (8%)**, **Germany (6%)**, and the **United Kingdom (5%)**.



## Global Developer Contribution
Across the **170+ open source projects** covered in both the 1.0 and 2.0 Landscapes, we observed over **360K GitHub accounts** engaging through issues or pull requests. This number alone gives a sense of the scale of today's LLM developers. Among these, we identified **124,351 developers** who had location data that could be reliably parsed. Using this, we mapped out their **country-level distribution** and calculated their **relative contribution share** within the ecosystem. The charts and tables below show:

+ **C** - the total contribution scores of representative countries,
+ **R** - their ratio share of overall contributions, and
+ **D** - the number of identifiable developers.

(As a rough rule of thumb, multiplying the number of identified developers by three provides a reasonable estimate of each country's actual developer base in the LLM ecosystem.)

Overall, U.S. accounts for **37.4% of contributions**, with **China at 18.7%**, putting their combined share above **55%**. By contrast, the third-place country, Germany, drops sharply to **6.5%**.

_Note: Developer contribution scores are calculated by _[_Community OpenRank_](https://open-digger.cn/en/docs/user_docs/metrics/community_openrank)_, which measures collaboration networks within each project (based on issues and PRs)._



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757502744478-5d71309f-a597-41e3-9207-7f23b580f639.png)



**Top 10 Countries by Contribution in Open-Source LLM Ecosystem**

| **<font style="color:#FFFFFF;">#</font>** | **<font style="color:#FFFFFF;">1</font>** | **<font style="color:#FFFFFF;">2</font>** | **<font style="color:#FFFFFF;">3</font>** | **<font style="color:#FFFFFF;">4</font>** | **<font style="color:#FFFFFF;">5</font>** | **<font style="color:#FFFFFF;">6</font>** | **<font style="color:#FFFFFF;">7</font>** | **<font style="color:#FFFFFF;">8</font>** | **<font style="color:#FFFFFF;">9</font>** | **<font style="color:#FFFFFF;">10</font>** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Country** | **U.S.** | **China** | **Germany** | **India** | **U.K.** | **Canada** | **France** | **Poland** | **Netherlands** | **Norway** |
| Contribution Share | 37.41% | 18.72% | 6.46% | 4.25% | 3.88% | 3.53% | 2.37% | 2.16% | 1.56% | 1.35% |
| Developers<br/>Recognized | 29451 | 22463 | 7612 | 9931 | 5711 | 4522 | 3961 | 1542 | 2144 | 585 |


****

**Top 3 Countries by Contribution in Each Technical Field**

| **<font style="color:#FFFFFF;">Domain</font>** | **<font style="color:#FFFFFF;">AI Agent</font>** |  |  | **<font style="color:#FFFFFF;">AI Infra</font>** |  |  | **<font style="color:#FFFFFF;">AI Data</font>** |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Country** | **U.S.** | **China** | **Germany** | **U.S.** | **China** | **Germany** | **U.S.** | **China** | **Germany** |
| Contribution<br/>Share | 24.62% | 21.5% | 10.41% | 43.39% | 22.03% | 3.95% | 35.76% | 10.77% | 6.78% |




Looking across technical fields, there are **56,206 developers in AI Infra**, **56,580 in AI Agents**, and **27,018 in AI Data**. Together, these numbers roughly match the total of 120K identified developers — suggesting that overlap is low, and most contributors focus on just one technical field.



Looking at country-level contributions across the three major domains, a few patterns emerge. 

+ In **AI Infra**, developers from the U.S. and China account for **over 60%** of contributions, while Germany, in third place, contributes less than 4%. 
+ In **AI Data**, participation is more globally distributed: several European countries — including **Poland, Norway, France, and the Netherlands** — all rank in the global top 10. 
+ In **AI Agents**, U.S. and Chinese developers contribute **24.6% and 21.5%** respectively, with Chinese developers showing relatively higher engagement in Agents compared with other domains.



## Large Models Landscape 2025
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757512271205-398364a7-e26d-4478-b81e-9d0b73059c5f.png)



Outside of the open source development ecosystem, large models themselves are being released at a rapid pace. While there isn’t yet a robust data pipeline to fully capture the dynamics of the model community, it’s clear that these releases sit at the **center of industry attention**.

To track this, we compiled a **timeline of major model launches from January 2025 to today**, covering both **open-weight** and **closed-source** releases from leading global vendors. In the updated **Landscape chart**, we also annotate each model with key details such as **parameter size** and **modality**, helping shed light on where the most intense competition is unfolding.

From this mapping, a few **interesting observations** emerge:



+ **<font style="color:rgba(253,58,184,1);">MoE Takes Center Stage</font>**: One of the clearest trends this year is the scaling of parameters under the Mixture of Experts (MoE) architecture. Flagship models like DeepSeek, Qwen, and Kimi have all adopted MoE — a design built on the principle of sparse activation: while the total parameter count can be massive, only a small subset is active during any single inference step. This approach has enabled the release of trillion-parameter giants such as K2, Claude Opus, and o3 throughout 2025. 



+ **<font style="color:rgba(253,58,184,1);">Reinforcement Learning Boosts Reasoning</font>**: DeepSeek R1 combines large-scale pretraining with RL-based post-training, significantly improved performance in areas like automated reasoning, complex decision-making, and knowledge inference. Reasoning has quickly become the signature feature for flagship model releases in 2025. At the same time, reasoning comes with trade-offs: models generally take longer inference times and consume more tokens. To balance this, series like Qwen, Claude, and Gemini have begun integrating "hybrid reasoning" modes. Much like the human brain switches between fast reactions and deep thinking, users can now choose different modes depending on their scenario.



+ **<font style="color:rgba(253,58,184,1);">Multimodality Goes Mainstream:</font>** Most of today's releases focus on language, image, and speech interaction, though we've also seen the emergence of specialized vision-only and speech-only models in 2025.In the development ecosystem, a vibrant toolchain has sprung up around speech, including projects like Pipecat and LiveKit Agents. Back in early 2024, OpenAI's Sora demo video stunned the world, sparking fresh excitement about world models and AGI. Yet standing here in 2025, it's clear that both video modality maturity and the path to AGI still have some distance left to go.



+ **<font style="color:rgba(253,58,184,1);">Subjective vs. Objective Model Evaluation</font>**: When it comes to benchmarking and ranking models, evaluation approaches generally fall into two categories:
    - **Human preference voting** — evaluations based on subjective judgments from human annotators.  
_Examples: Design Arena, LMArena_
    - **Objective benchmark testing** — evaluations against standardized datasets with ground-truth answers.

The table below summarizes the key benchmark suites most frequently cited in new model releases over the past two months. These can be considered **the leading edge of today's evaluation landscape**.

| **Benchmark Suite** | **Target Domain** | **Recently Cited By** |
| --- | --- | --- |
| **AIME 2025** | Math | DeepSeek-V3.1, GPT-5, Claude Opus 4.1, Qwen3-2507, Kimi K2, Grok 4 |
| **GPQA Diamond** | Math | GPT-5，Claude Opus 4.1, Kimi K2（GPQA：Grok 4，Qwen3-2507，GLM-4.5） |
| **LiveCode Bench v6** | Math | Qwen3-2507, Kimi K2 |
| **SWE-bench verified** | Coding | DeepSeek-V3.1，GPT-5, Claude Opus 4.1, Kimi K2, GLM 4.5 |
| **Terminal-Bench** | Coding | DeepSeek-V3.1，Claude Opus 4.1, GLM 4.5 |
| **BrowseComp** | Agentic | DeepSeek-V3.1，GPT-5，GLM 4.5 |
| **MMMU** | Multimodal | GPT-5，Claude Opus 4.1 |




## From Landscape to Tech Trends
### Large Models Development Keywords
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757493049009-2a01bb3e-3c00-4ff2-9c3e-5d81ca57d901.png)



We took the **GitHub descriptions and topics** of every open-source project in the Landscape and extracted keywords from that text. To clean things up, we applied some simple normalization:

+ merged uppercase/lowercase variants (_MCP_ & _mcp_),
+ combined singular and plural forms (_agent_ & _agents_),
+ removed common stop words (_a, an, and,_ etc.).

The result is a **100-word cloud** that captures the defining technical terms of today’s LLM development ecosystem. The most frequent keywords are: **AI (126)**, **LLM (98)**, **Agent (81)**, **Data (79)**, **Learning (44)**, **Search (36)**, **Model (36)**, **OpenAI (35)**, **Framework (32)**, **Python (30)**, **MCP (29)**.

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758612634279-a1b2a3c0-827f-4e65-a288-9fb88b79a3f6.png)



### Top 10 Open Source Project
We reviewed the **Top 10 open-source projects by OpenRank** in the Landscape:

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039029898-6e493fe8-1649-4afe-bb81-37a6a44e7185.png)

_<font style="color:#8A8F8D;">Note: All data is as of August 1, 2025</font>_



The **top 10 projects** represent the most active and influential community forces in today’s open-source LLM ecosystem. Together, they span nearly the entire chain: from foundational compute and frameworks like **PyTorch** and **Ray**, to training data pipelines such as **Airflow**, to high-performance serving engines like **vLLM, SGLang,** and **TensorRT-LLM**. On the application side, they include Agent orchestration platforms like **Dify** and **n8n**, as well as developer and end-user facing tools such as **Gemini CLI** and **Cherry Studio**.



From a **programming language perspective**, Python dominates the infrastructure layer, while TypeScript rules the application layer, together forming the backbone of the ecosystem.



Looking at the **forces behind these projects**, we see multiple streams of innovation:

+ **Academia**: Projects like _vLLM, SGLang,_ and _Ray_ emerged from UC Berkeley’s labs under Ion Stoica, showcasing the academic world’s outsized influence.
+ **Tech giants**: _Meta, Google, NVIDIA_ hold or shape critical positions in the stack.
+ **Indie teams**: Closer to the application layer, smaller teams like _Dify_ and _Cherry Studio_ are innovating rapidly, delivering user-friendly tools that spark new growth points.



### Redefining Open Source in the LLM Era
Veterans familiar with the long debates around **open source licensing** might feel a twinge of alarm when looking at the licenses adopted by today’s OpenRank Top 10 projects. While most projects in the LLM ecosystem still rely on permissive licenses like **Apache 2.0** or **MIT**, several high-profile cases stand out for their nonstandard or modified approaches:

+ **Dify’s “Open Source License”**. Based on Apache 2.0 but with two additional clauses:  
a. Restricts unauthorized operation in multi-tenant environments.  
b. Prohibits removing or modifying the logo and copyright notice in Dify’s frontend.
+ **n8n’s “Sustainable Use License”**. A license inspired by _fair-code_ principles. While it allows free use, modification, and distribution, it comes with three limitations:  
a. Use and modification are restricted to internal, non-commercial, or personal contexts.  
b. Redistribution must be free of charge and for non-commercial purposes only.  
c. License, copyright, and author information may not be altered.
+ **Cherry Studio’s “User-Segmented Dual Licensing”**. Cherry Studio ties licensing to the size of the user’s organization:  
a. **Personal users or orgs ≤10 people**: Licensed under **AGPLv3**, a copyleft license requiring that any modifications or redistributions also be open-sourced with full source code provided.  
b. **Orgs >10 people**: Required to obtain a commercial license from the Cherry Studio team.



It’s clear that the licensing tweaks above are mostly designed to **protect commercial interests**. Because they restrict certain classes of users, they would naturally fail to gain OSI approval, from which perspective, these projects might not even qualify as _true_ open source.



At the same time, **GitHub has evolved beyond a code hosting and collaboration platform** to become a stage for product operations. Many products with closed-source codebases — like **Cursor** and **Claude-Code** — still maintain a presence on GitHub. This often creates the illusion that they are open source projects, when in reality their repos serve a different function: **collecting user feedback**. Unsurprisingly, these repos accumulate huge numbers of stars, even though they provide little to no actual source code.



### Shifting Trends Across Technical Domains
Looking at this year’s landscape, **AI Coding, Model Serving, and LLMOps** are all on an upward trajectory. Among them, **AI Coding stands out with a steep growth curve** that has continued to climb over the past two months — once again confirming that _boosting R&D efficiency with AI_ is the application scenario to truly take root in 2025.

On the other hand, **Agent Frameworks** and **AI Data** have shown noticeable declines. The drop in Agent Frameworks is closely tied to reduced community investment from once-dominant projects like **LangChain, LlamaIndex, and AutoGen**. Meanwhile, AI Data — spanning areas like **vector databases, data integration, and data governance** — is showing a slower, steadier slide.

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757151270548-24e04176-2f7b-4917-8eb4-023706299dee.png)

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757151316205-2ba58bbe-ab91-4324-8aee-f3956209eedb.png)

### 
### Projects on The Brink List
Here are some projects that didn’t make it into this version of **Landscape**, but still show strong potential. We’ll be keeping an eye on them as they evolve. Keep pushing forward!

| **<font style="color:#FFFFFF;">Project</font>** | **<font style="color:#FFFFFF;">OpenRank</font>** | **<font style="color:#FFFFFF;">Star</font>** | **<font style="color:#FFFFFF;">OpenRank Trend</font>** | **<font style="color:#FFFFFF;">Language</font>** | **<font style="color:#FFFFFF;">Created</font>** |
| --- | :---: | :---: | :---: | :---: | :---: |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039312318-d24be49a-cc85-4d3a-bd57-ed085b9c09e7.png) | **<font style="color:black;">48</font>** | **<font style="color:black;">25630</font>** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039132296-b79665c9-820c-442b-8a88-e65115424d4e.png) | <font style="color:black;">TypeScript</font> | <font style="color:black;">2022-08-17</font> |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039285683-4e7db60d-3b45-4a37-8912-b1916af94121.png) | **<font style="color:black;">46</font>** | **<font style="color:black;">13254</font>** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039146093-e8487219-61d0-4d22-bb73-fc0d875223b0.png) | <font style="color:black;">Python</font> | <font style="color:black;">2023-04-27</font> |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039324633-41038448-0c06-4a46-af52-7644803806e9.png) | **<font style="color:black;">37</font>** | **<font style="color:black;">15954</font>** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039151570-35ab93c5-fb38-4ccb-a9e1-2d8a5edba797.png) | <font style="color:black;">Python</font> | <font style="color:black;">2025-05-07</font> |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039276733-930cb1d4-7994-4a7c-b1e2-736cb5c32e99.png) | **<font style="color:black;">36</font>** | **<font style="color:black;">3704</font>** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039163009-77054d73-a52c-49f0-afd9-88beade26831.png) | <font style="color:black;">C++</font> | <font style="color:black;">2024-06-25</font> |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039268911-25a37913-f166-4f37-b010-ef2d42e2af44.png) | **<font style="color:black;">34</font>** | **<font style="color:black;">14782</font>** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039167076-e0f13feb-5de1-4e32-94b7-92c4c7cf38ad.png) | <font style="color:black;">Python</font> | <font style="color:black;">2024-07-26</font> |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039263566-dbb192f2-ea35-45fa-8e59-5e4b13a03561.png) | **<font style="color:black;">32</font>** | **<font style="color:black;">15548</font>** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039170796-512b976e-d550-4456-86ec-4c8adc24a46d.png) | <font style="color:black;">Python</font> | <font style="color:black;">2024-07-03</font> |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039258654-92d36456-2d7e-4b12-8c96-ecaf9cec8d17.png) | **<font style="color:black;">29</font>** | **<font style="color:black;">18825</font>** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039175074-6ac57da8-96be-4590-a0e3-613040112049.png) | <font style="color:black;">TypeScript</font> | <font style="color:black;">2025-03-25</font> |


_<font style="color:#8A8F8D;">Note: All data is as of August 1, 2025</font>_

## 100 Days of Change and Continuity
Beyond the obvious project reshuffling, the jump from **1.0 to 2.0** also brought refinements to how we define and describe the ecosystem. For example, the broad categories of _“Infrastructure”_ and _“Application”_ in the first release were restructured into three clearer domains: **AI Infra, AI Agent, and AI Data**. These categories now reflect boundaries that are becoming sharper as the technology matures.

The pace of progress remains fast — especially in the Agent space, where project roles and boundaries continue to shift dynamically. By tracking the changes across versions of the **Landscape**, we can watch a new technical ecosystem gradually evolve: from early-stage chaos to an increasingly ordered structure.



### Which Fields and Projects Dropped Out?
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758037615068-d08f0a12-68ea-49c2-b6ea-2e1a9fc4a27b.png)



Some fields saw projects exit the open source landscape altogether. For example, regardless of how fast **Manus** or **Perplexity** may be growing as commercial products, their corresponding domains in the open source ecosystem have not developed strong traction. As a result, related open source projects have struggled to gain momentum and eventually fell out of the Landscape.



#### On the Road to the “AI Graveyard”
Among the projects that dropped out, many appear to be heading toward what can only be called the **“AI graveyard.”**

****

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039817735-685ef7e8-20fa-47be-be64-29229b809c8b.png)

+ **Manus** briefly exploded in popularity this March, inspiring multi-agent frameworks like **MetaGPT** and **Camel AI** to release open-source versions (_OpenManus_ and _OWL_). But the hype proved short-lived.
+ **NextChat**, one of the earliest popular LLM client apps, has since lost ground. Its pace of iteration and feature updates lagged far behind newer entrants like **Cherry Studio** and **LobeChat**, leaving it largely unmaintained.
+ **Bolt.new**, once a trendy full-stack web development tool, was open-sourced in the form of template repositories. But with little external contribution, no issue-tracking functionality, and declining activity, its repos are drifting toward zero momentum.

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758271709726-d297b414-3db0-409f-9e52-f4c07ed276e7.png)

+ **MLC-LLM** and **GPT4All** were once widely used for on-device model deployment. MLC-LLM was tied to its own inference engine (_MLCEngine_), while GPT4All, like **Ollama**, relied on _llama.cpp_. In the end, though, **Ollama emerged as the clear winner** in this niche.
+ **FastChat** represented **LMSYS's** early experiments in training, inference, and evaluation. Today, their efforts have evolved into the more successful **SGLang** and **LMArena** platforms.
+ **Text Generation Inference (TGI)**, an earlier engine for GPU-based LLM inference, has gradually been abandoned by Hugging Face, as its performance fell behind newer solutions like **vLLM** and **SGLang**.



#### TensorFlow: A Decade-Long Decline of a Former Giant
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757084053627-682ee0b9-815e-4508-b2ee-0f8173b0ec2f.png)



In **November 2015**, Google open-sourced **TensorFlow** under the Apache 2.0 license. It quickly rose to become the dominant framework in deep learning. From the very beginning, TensorFlow was designed with **production environments** in mind — a philosophy that stood in sharp contrast to **PyTorch**, which later launched with a “Pythonic” and “researcher-first” approach. As innovators building the next generation of models, researchers gravitated toward PyTorch for its flexibility and ease of use.



By **October 2019**, TensorFlow released **version 2.0**, adopting many of PyTorch’s core design principles and streamlining model building. But this technically sensible shift came at a steep price: the lack of seamless backward compatibility and the complexity of migration tools left many developers unwilling to rewrite legacy 1.x code or learn a new API. Having already moved to PyTorch, they doubled down on their loyalty there instead.



This was the turning point: around 2019, the **PyTorch community overtook TensorFlow**, and the trajectories of the two frameworks began to diverge sharply.



### New Fields and Projects Entering the Spotlight
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757169346179-fea18c6f-a266-422c-8ca9-9bb708155dcc.png)



The most notable shifts are happening in the **Agent layer**, where new high-profile projects have emerged across **AI Coding, chatbots, and development frameworks**. Among them, two projects stand out for their connection to **embodied intelligence**: 1. [AI XiaoZhi](https://github.com/78/xiaozhi-esp32), an ESP32-based AI voice interaction device that enables large language models like Qwen and DeepSeek to run directly on hardware, 2. [Genesis](https://github.com/Genesis-Embodied-AI/Genesis), a general-purpose robotics and embodied simulation platform designed for robot learning, physics simulation, rendering, and data generation



On the **Infra side**, the biggest change comes from the integration of “model operations” into a more holistic concept: **LLMOps**. By merging domains that previously focused on model evaluation and traditional ML operations, LLMOps now represents a **full life-cycle approach to managing large language models**. In essence, it’s the natural extension of **MLOps into the LLM era**, tackling the challenge of using large models **efficiently, reliably, and controllably in real-world production environments**. Current projects in the LLMOps space span multiple functions, including **Observability** (_Langfuse, Phoenix_), **Evaluation & Benchmarking**(_Promptfoo_), **Agentic Workflow Runtime Management** (_1Panel, Dagger_).



#### Top 10 Active Newcomers
We also reviewed the **Top 10 new projects by OpenRank** in this release. Notably, the **Gemini CLI**, an end-user AI coding assistant, and **Cherry Studio**, a model client interaction and chat tool, ranked **3rd** and **7th** respectively across _all_ projects in the Landscape — a remarkable showing for first-time entrants.

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757678791937-f0bbcecd-a159-4414-9e29-6248034ee0ef.png)

_<font style="color:#8A8F8D;">Note: All data is as of August 1, 2025</font>_



### What Hasn’t Changed: Rise, Fall, and the Cycle of Momentum
Some things remain the same: **as one wave rises, another recedes** — growth and decline are constants in the ecosystem.

In the **Landscape** below, we highlighted three groups in particular: 

+ Projects newly created in **2025**
+ Projects showing the **most significant growth** compared with six months ago
+ Projects showing the **steepest decline** over the same period



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757170355050-17ea0fc0-fd2d-4752-b5c3-59b16c5537f6.png)



#### _The New Wave_ on the Landscape
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757648282322-a0345a3a-6355-4c85-8987-b9caba8eb87f.png)

_<font style="color:#8A8F8D;">Note: All data is as of August 1, 2025</font>_



 Among the new wave of projects launched in 2025, **OpenCode**, created by the startup _Anomaly Innovations_, was positioned from day one as a **100% open-source alternative to Claude Code**.

The other newcomers highlight how major players are laying out their open-source strategies across **model serving, agent toolchains, and AI coding**:

+ **Dynamo** supports mainstream inference backends such as _vLLM, SGLang,_ and _TensorRT-LLM_, while being perfectly optimized for NVIDIA GPUs. As it matures into an enterprise-grade tool for **high-throughput, multi-model deployment**, it will further encourage enterprises to choose NVIDIA hardware to maximize performance.
+ **adk-python** and **openai-agents-python** are agent system builders packaged specifically for _Gemini_ and _OpenAI_ models. The former even includes cloud optimizations, enabling agents to be orchestrated and deployed natively on **Google Cloud**.
+ **Gemini CLI** and **Codex CLI** both follow the model pioneered by Claude Code — bringing autonomous code understanding and editing directly into the command line. _Gemini CLI_ is tightly bound to Gemini, while _Codex CLI_ is compatible with OpenAI models and exposes an **MCP interface**.





#### _Rising and Falling_ on the Landscape
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758088415504-68ee6cdd-6ba5-4c50-9a5f-6568d96c83d4.png)



The ten projects above rank at the top in terms of both **absolute** and **relative OpenRank changes** over the past six months. The chart shows their OpenRank shifts between **February and August**.



The projects showing the most noticeable growth include **TensorRT-LLM**, NVIDIA’s enterprise-grade inference backend; **Dynamo**, its multi-tenant inference orchestration tool; **verl**, a reinforcement learning framework for LLMs from ByteDance; **OpenCode**, an open-source command-line coding tool positioned as an alternative to Claude Code; and **Mastra**, an Agent orchestration framework for TypeScript and JavaScript developers.



In contrast, the projects experiencing the sharpest decline include four Agent frameworks — **Eliza, LangChain, LlamaIndex, and AutoGen**. The other is **Codex**, OpenAI’s command-line coding tool released in April, which, compared with the rapid rise of Gemini CLI, seems to have gotten off to a rather rocky start.

## Core Tech Trends: **Serving, Coding, and Agents**


![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1756822293176-b3e01d10-d49e-415b-ae8f-7ff30a17c7f3.png)

### Serving: Making Models Truly Usable
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757507604194-4db6f461-e349-4ee1-960b-62536c89f0aa.png)

## ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757507564594-b94377c5-3b99-43b4-a033-d901ab66261f.png)![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757507570523-79bd997e-f50a-45d8-ac59-baee8512c912.png)


At its core, **model serving** is about running a trained model in a way that applications can reliably call. The challenge isn’t just _“can it run?”_ — but _“can it run efficiently, controllably, and at scale?”_



In terms of scenarios, **large-scale online inference** remains the main battlefield for model serving, with data center–level deployments handling tens of millions of requests. At the same time, many enterprises set up **private inference services** to meet security and compliance requirements. On the edge side, projects like **llama.cpp** and **Ollama** make it possible to run models on personal computers, mobile devices, and even embedded hardware — addressing offline and privacy-sensitive needs. Meanwhile, **hybrid modes** are becoming more common, where lightweight processing is done locally while complex reasoning is offloaded to clusters.



Since 2023, rapid progress has made serving the **critical middleware layer** connecting AI infrastructure with applications. On one side, inference engines like **vLLM** and **SGLang** are pushing the limits of performance in high-throughput, long-context, multi-user scenarios. On the other, **Ollama** and **llama.cpp** have expanded accessibility, making “LLMs at your fingertips” a reality. Meanwhile, orchestration frameworks like **NVIDIA Dynamo** are scaling beyond single-machine efficiency to **multi-node, multi-model, multi-tenant clusters**.



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758724648257-ba892640-fc87-46f3-8814-ab3e58810419.png)



### Coding: The New Developer Vibe
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757507625071-7914c2dc-1ad2-4fca-87c2-dfcffc9c8d3b.png)



AI Coding has evolved far beyond basic code completion, now encompassing **multimodal support, contextual awareness, and collaborative workflows**.

**CLI tools** like _Gemini CLI_ and _OpenCode_ leverage the reasoning power of large models to transform developer intent into a faster, more efficient coding experience. At the same time, **plugin-based tools** such as _Cline_ and _Continue_ integrate seamlessly into existing development platforms, enabling developers to preserve familiar workflows while tapping into AI-powered assistance that dramatically improves productivity.

Collaboration platforms such as _Goose_ and _OpenHands_ go further, weaving AI into team-level processes like project management, code review, and task allocation — fostering smoother cross-regional and cross-functional teamwork.

On the commercial side, closed-source tools like _Claude Code, Cursor,_ and _Windsurf_ are already attracting a wide base of individual developers and enterprise customers. With demand accelerating, the **commercial potential of AI Coding is enormous** — subscription plans, SaaS offerings, and premium features are likely to become the dominant monetization models in the years ahead.



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758726415027-ab4bd453-f7a5-4136-80ed-bb27e3740633.png)







### Agent: Building Toward AGI
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757507891940-e09ed4e2-29b8-42e0-b902-16db46555abe.png)



Many say **2025 will be the year AI applications truly land**. In the early days, frameworks like **LangChain** and **LlamaIndex** provided the basic building blocks for Agent development. Since then, the open-source ecosystem has expanded with projects specializing in different components: **Mem0** (memory), **Browser-Use** (tool use), **Dify** (workflow execution), and **LobeChat** (interaction interface).

Together, these projects are shaping a more complete foundation for building autonomous AI systems. While each tackles a different aspect, they share the same goal: enabling AI to understand, remember, act, and interact more intelligently — ultimately unlocking real productivity gains.



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758727506412-67df26d7-927d-4c5b-adaa-d42719dc9a1b.png)

