
在一年前和我司 CTO 探讨开源和技术势态的时候，我们碰撞出来一个观点——“**作为一个开放、领先的科技公司，我们应该可以主动利用社区数据，形成自己对技术趋势的洞察”**。由此，我们开始尝试基于开源社区的行为数据，对技术趋势进行分析。并且，“来自于社区，回馈到社区”，我们不仅会把这个分析到的全景图和结论分享给社区，也会把过程中的数据分享出来。

在上半年的 “527 蚂蚁技术日”，我们发布的全景和趋势 1.0 版本得到了很多关注和肯定。更重要的是，我们的同事和社区的朋友们在技术和架构判断、技术选型、兼容性取舍，甚至是商业拓展选择上都有参考全景图所呈现的信息。当然，发布后的这三个多月，我们也收到很多意见、建议和疑问，同时社区也发生了很多变化，于是，在外滩大会上，2.0 的发布也如期而至了。

—— 王旭，蚂蚁集团开源技术委员会副主席

#


3 个多月前，在一年一度的「527 蚂蚁技术日」上，蚂蚁开源联合 Inclusion AI 首次发布了一份大模型开发生态下的开源项目[全景图](https://antoss-landscape.my.canva.site/)，和一份对生态趋势的[洞察报告](../250527_llm_landscape/250527_llm_report_cn.md)。我们希望能依据对社区的洞察，指出生态中哪些项目是最应该跟踪、使用和参与的，反之亦然。



很高兴看到，我们发布的全景和趋势在过去这段时间得到了很多关注和肯定。当然，发布后的这三个多月，我们也收到很多意见、建议和疑问，比如对于上榜项目许可证选择的争议、开源项目入选标准的咨询、以及在其他技术领域是否可以复刻相关研究方法的探讨……100 天转瞬即逝，开发者们在开源社区的每一次代码提交、每一次项目引用，都在悄然勾勒着行业未来的走向，在这个仿若「真实世界的黑客松」的 AI 战场里发生了很多变化。于是今天，**在 Inclusion 外滩大会上，我们诚意满满的「大模型开源开发全景与趋势」2.0 版本如期而至**。



在 2.0 版本的迭代中，我们对看生态全景的方法进行了更新，果然发现了更多之前未注意到的、热度和活跃度都相当高的开源项目。当然，也有不少在数据拼杀中被拿掉的项目，从趋势来看已经在走向「AI 墓园」的路上。再看生态与趋势，有些领域和项目已经出局，有些领域和项目第一次进入视野，还有一些，正从早期的混沌中脱颖而出，在这个新兴的生态位中站稳了脚跟。

<font style="color:black;"></font>

开源明星易主，群雄逐鹿今谁强？重器谁执牛耳，我辈入局在何方？**这 100 天中的变与不变，都将在下文中为你一一呈现。**



## 大模型开源开发生态全景
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757512236895-8eff51a8-6596-4f9d-aa90-8305631ac13e.png)

[https://antoss-landscape.my.canva.site/](https://antoss-landscape.my.canva.site/)



这张全景图整体分为 AI Infra 和 AI Agent 两大技术方向，基于我们对社区数据的洞察，收录了 **114** 个在这个生态下最顶尖也最受关注的开源项目，这些项目分布在 **22** 个技术领域。



在数据洞察中，我们依旧大量使用了 [OpenRank 评价体系](https://open-digger.cn/docs/user_docs/metrics/openrank)，OpenRank 是一种基于社区协作关联关系，计算生态中所有项目的相对影响力的算法，在我们后续的数据洞察中还将多次引用这一概念，在此特别说明。


不同于 1.0 版本的是，在第一版中，我们是通过一些已知的种子项目（PyTorch、vLLM、LangChain），基于开发者的协作关系多跳搜索和它们紧密关联的开源项目，并将其进行整理呈现。这种方式受到选取的种子项目、每跳返回的项目数量等因素影响，得到的结果具有很大程度的随机性。而这一次，考虑到全景图使用的评价方法 OpenRank 本身就是一种基于社区协作关联关系的算法，我们直接拉取了当月 GitHub 全域项目的 OpenRank 排名，根据描述和标签来从上往下标注出其中属于大模型生态的项目，再逐步收敛。果然，这个过程中发现了更多之前未发现的、热度和活跃度都相当高的项目们，让我们可以自信的将参考标准提高至了<font style="color:rgba(253,58,184,1);">**当月 OpenRank 达到 50</font>** 这个水平。



和百天前发布的 1.0 版本相比，有 39 个项目是这次新进的，占据当前整体版面的 35%。而第一版中的 60 个项目被拿掉了，这背后最主要的原因是项目达不到 OpenRank 大于 50 这个新的标准，而其中有不少从趋势来看，也确实已经在步入「AI 墓园」的路上，后面我们会详细展开；也有部分项目，典型的如 ONNXRuntime，由于主要面向于传统机器学习的训练和推理，在大模型领域并没有很紧密的结合而被拿掉。



算上那些被拿掉的在大模型开发生态的项目，这些项目从创建至今的"年龄"中位数是 **30 个月**，也就是两年半。他们年轻的程度正应和着这个领域迭代的速度 —— 高达 62% 的项目都是在 "GPT"时刻（2022 年 10 月）之后发布的，而其中有 12 个项目甚至是在今年才新近发起的。在如此崭新的基础上，这些项目获得的关注度却是上一个时代的开源项目们难以企及的：**<font style="color:rgba(253,58,184,1);">它们平均获得的星标数量高达近 3 万个</font>**。



这些项目吸引了全球 **<font style="color:rgba(253,58,184,1);">366,521 位开发者</font>** 的参与。在能够统计到位置信息的开发者中，约 **24%** 来自美国，**18%** 来自中国，其次是印度（**8%**）、德国（**6%**）和英国（**5%**）。无论是大模型的研发还是围绕着模型的开源开发生态，美国和中国都扮演着主导角色，这一格局也许会进一步影响全球技术的演进与合作。



## 全球开发者贡献画像
从 1.0 到 2.0，两次发布的全景图涉及到的一共 170 多个开源项目中，在其中有过 Issue 或 PR 相关行为的 GitHub 账号高达 **36 万**，这个数字一定程度上体现了当下大模型生态的开发者规模。我们识别到其中 **124,351** 位在个人页面填写了可以被正确解析位置信息的开发者，并统计了他们的国家分布和对应的在大模型开发生态中的贡献度分布。图和表中展示了头部国家的**开发者贡献度总和、整体贡献度占比**和**识别到的开发者数量**，其中，将开发者数量乘以三的话，可以大致认为是估算出的该国家大模型生态开发者的总量。

总体来看，中美引领了 AI 领域的开源贡献。美国以 37.4% 的贡献领先，中国以 18.7% 位居第二，这两个国家的贡献总比例达到 55% 以上，而排名第三的德国已降低至 6.5%。

注：开发者贡献度也使用 OpenRank 评价体系计算，是一种项目内基于 Issue/PR 协作网络的计算方式，详情见 [OpenRank 介绍文档。](https://open-digger.cn/docs/user_docs/metrics/community_openrank)

<font style="color:black;"></font>

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757502744478-5d71309f-a597-41e3-9207-7f23b580f639.png)



**大模型开源开发生态整体贡献度 Top 10 国家分布**

| **<font style="color:#FFFFFF;">#</font>** | **<font style="color:#FFFFFF;">1</font>** | **<font style="color:#FFFFFF;">2</font>** | **<font style="color:#FFFFFF;">3</font>** | **<font style="color:#FFFFFF;">4</font>** | **<font style="color:#FFFFFF;">5</font>** | **<font style="color:#FFFFFF;">6</font>** | **<font style="color:#FFFFFF;">7</font>** | **<font style="color:#FFFFFF;">8</font>** | **<font style="color:#FFFFFF;">9</font>** | **<font style="color:#FFFFFF;">10</font>** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **国家** | **美国** | **中国** | **德国** | **印度** | **英国** | **加拿大** | **法国** | **波兰** | **荷兰** | **挪威** |
| 贡献比例 | 37.41% | 18.72% | 6.46% | 4.25% | 3.88% | 3.53% | 2.37% | 2.16% | 1.56% | 1.35% |
| 识别到的开发者数量 | 29451 | 22463 | 7612 | 9931 | 5711 | 4522 | 3961 | 1542 | 2144 | 585 |


**不同技术领域下的贡献度 Top 3 国家分布**

| **<font style="color:#FFFFFF;">领域</font>** | **<font style="color:#FFFFFF;">AI Agent</font>** | | | **<font style="color:#FFFFFF;">AI Infra</font>** | | | **<font style="color:#FFFFFF;">AI Data</font>** | | |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **国家** | **美国** | **中国** | **德国** | **美国** | **中国** | **德国** | **美国** | **中国** | **德国** |
| 贡献比例 | 24.62% | 21.5% | 10.41% | 43.39% | 22.03% | 3.95% | 35.76% | 10.77% | 6.78% |


分技术领域来看，AI Infra 开发者 56,206 人，AI Agent 开发者 56,580 人，AI Data 开发者 27,018 人，这个总和与 12 万开发者的总人数相差不多，说明不同领域下的重复开发者比例不高，大多数人只参与一个技术领域下的项目。



从三大技术领域下的国家贡献度分布来看，整体以中美为主导，在 **AI Infra 领域**中美的领先地位更加明显，两国在基础设施领域的贡献度达到 **60%** 以上，排名第三的德国不足 4%，可见在基础设施领域中美有较强的控制力；**AI Data 领域**全球的参与情况更加平均，中美的总体贡献占比仅 46.5%，欧洲各国，如波兰、挪威、法国、荷兰等国的参与度均进入全球前十；**AI Agent 领域**中美差距大幅缩小，贡献度占比分别为 24.6% 和 21.5%，中国开发者在 Agent 层面相较其他领域的投入更多。



## 2025 大模型发展全景
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757512271205-398364a7-e26d-4478-b81e-9d0b73059c5f.png)



在开源开发生态之外，大模型也在进行着高频的发布。虽然目前还没有很好的数据渠道来帮助我们理解大模型社区，但毕竟它们处在注意力焦点的中心。因此，我们也精心梳理了 2025 年 1 月至今国内外主流厂商的大模型发布时间线，包含开放参数的模型和闭源模型。这张全景图内也标注了每个模型的参数、模态等关键信息，来一定程度上帮助理解当下各家厂商的白热化竞争究竟是在哪些方向上展开的。以此，我们得出了一些有趣的观察，比如：



+ **<font style="color:rgba(253,58,184,1);">MoE 架构下模型参数在规模化发展</font>**：今年发布的 DeepSeek、Qwen、Kimi 等旗舰模型全面采用了专家混合（Mixture of Experts，MoE）这种神经网络架构，它最朴素的原理为"稀疏激活"：虽然模型总参数可以非常庞大，但每次推理时只用其中很小一部分。在这种架构下，我们看到了 K2、Claude Opus、o3 等达到了万亿参数规模的庞大模型在今年陆续发布。参数规模的增加能够有效提升模型在任务上的表现，但同时也对训练和推理时的计算与内存带来了进一步的挑战。
+ **<font style="color:rgba(253,58,184,1);">通过强化学习提升模型 Reasoning 能力</font>**：DeepSeek R1 通过将强化学习后训的过程与大规模预训练结合，显著提升了模型性能，在自动化推理、复杂决策和知识推断等任务上，比传统的 LLM 提高了多个维度的能力，Reasoning 能力也成为了今年重磅模型在发布时的时尚单品。由于模型在推理时普遍需要更久的时间和更多的 token，Qwen、Claude、Gemini 等系列模型也逐步整合了"混合推理"的能力：如同人类大脑有快速反应和深度思考两种模式，用户也可以基于需求场景，让模型在不同模式下给出反应。
+ **<font style="color:rgba(253,58,184,1);">多模态模型走向主流</font>**：当前市面上的多模态模型支持的能力以语言、图像和语音的交互为主，也有一些垂类的视觉模型和语音模型在今年发布。而在开发生态中，我们也发现了围绕着语音模态的丰富工具链，如 Pipecat、LiveKit Agents 和 CosyVoice。在 2024 年年初，OpenAI 发布的 Sora 演示视频惊艳世界，有关世界模型和通用人工智能似乎已经不再停留于畅想，而站在 2025 这个时间节点，无论是视频模态的成熟还是 AGI 的成功，都仍旧有一段路要走。
+ **<font style="color:rgba(253,58,184,1);">主观和客观的不同模型评价模式</font>**：对模型的评价和排名，整体可以分为以下模式：
    - 基于人类主观投票的评测。代表平台：[Design Arena](https://designarena.ai/)，[LMArena](https://lmarena.ai/)；
    - 基于客观标准答案的评测。下表梳理了最近两个月新模型发布时主要提及的性能对比评测集，可以作为当下最顶尖也最前沿的评测集的代表：

| **<font style="color:#FFFFFF;">当下的主流评测集</font>** | **<font style="color:#FFFFFF;">面向领域</font>** | **<font style="color:#FFFFFF;">被哪些最新发布的模型使用</font>** |
| --- | --- | --- |
| **AIME 2025** | Math | DeepSeek-V3.1, GPT-5, Claude Opus 4.1, Qwen3-2507, Kimi K2, Grok 4 |
| **GPQA Diamond** | Math | GPT-5，Claude Opus 4.1, Kimi K2（GPQA：Grok 4，Qwen3-2507，GLM-4.5） |
| **LiveCode Bench v6** | Math | Qwen3-2507, Kimi K2 |
| **SWE-bench verified** | Coding | DeepSeek-V3.1，GPT-5, Claude Opus 4.1, Kimi K2, GLM 4.5 |
| **Terminal-Bench** | Coding | DeepSeek-V3.1，Claude Opus 4.1, GLM 4.5 |
| **BrowseComp** | Agentic | DeepSeek-V3.1，GPT-5，GLM 4.5 |
| **MMMU** | Multimodal | GPT-5，Claude Opus 4.1 |




## 从生态全景到技术趋势
### 大模型开发生态关键词
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757493049009-2a01bb3e-3c00-4ff2-9c3e-5d81ca57d901.png)



把全景图上所有开源项目在 GitHub 首页填写的 description 和 topics 中的内容作为文本提取关键词，并在提取过程中做一些基本的规则化处理：大小写和单复数合并（MCP & mcp、agents & agent 等），去除常用词（a、an、and 等）。我们最终得到一张这样的词云图，图中一共有 100 个单词，总结了当下大模型开发生态的技术关键词。其中，最高频出现的词语为：

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758041046280-34da5dc8-e843-4805-8304-14974cd8f02b.png)



### 最活跃的开源项目 Top 10
我们梳理了 OpenRank Top 10 的开源项目。

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039029898-6e493fe8-1649-4afe-bb81-37a6a44e7185.png)

_<font style="color:#7f7f7f;">注：以上数据截止 2025 年 8 月 1 日</font>_



头部的这 10 个项目，代表了当下大模型开发生态里最活跃、最具代表性的社区力量。它们几乎覆盖了**模型生态的完整链路**：从底层的算力和框架 PyTorch、Ray，模型训练的数据处理管线 Airflow，模型服务的性能基座 vLLM、SGLang、TensorRT-LLM，到 Agent 应用调度平台 Dify、n8n，直接面向开发者与终端用户的 Gemini CLI、Cherry Studio。



**从编程语言来看**，**Python** 主导基础设施，**TypeScript** 统治应用层，成为支撑整个生态体系的核心语言。



**从背后的发起力量来看**，我们看到了来自学术界的创新迸发出的高影响力：vLLM、SGLang、Ray 都生长于 Ion Stoica 执掌下的伯克利实验室；Meta、Google、NVIDIA 这些大厂掌控或布局在一些关键节点之上，但在靠近应用层的位置，Dify、Cherry Studio 这样的独立团队也能够迅速创新，通过提供用户友好的工具，形成快速增长点。



### 如何定义这个时代的开源？
熟悉围绕开源许可证的一些前尘往事的开源老人，在看到刚刚这 10 个顶尖的项目所采用的许可证时，也许心中已经警铃大作。是的，虽然多数大模型开发生态的项目仍然采用的是 Apache 2.0 或 MIT 宽松许可，但仍然有不少值得关注的特别案例.

<font style="color:black;"></font>

+ **Dify 的 Open Source License。** 这是 Dify 基于 Apache 2.0 许可的文本做了修改，增加了两个附加条款：
    1. 限制未经许可的多租户环境运营；
    2. 使用Dify前端时，不得移除或修改 LOGO 和版权信息。
+ **n8n 的 Sustainable Use License。** 这是 n8n 基于 fair-code 主张，新提出的一种许可，在允许免费使用、修改、分发的基础上，做了三点限制：
    1. 仅限于在企业内部，或者非商业、个人用途下使用或修改；
    2. 在分发时，必须基于非商业目的免费提供；
    3. 不能更改软件中的许可、版权或作者信息。
+ **Cherry Studio 的 User-Segmented Dual License。** Cherry Studio 根据用户所在组织的规模做分段，提出了一种双许可限制，不同规模组织下的用户使用不同的许可：
    1. 如果是个人用户或者所在组织是 10 人及以下，采用 AGPLv3，这也是一种 copyleft 协议，用户可以免费使用，但如果做了修改和分发，必须同样开源并提供完整的源代码；
    2. 超过 10 人的情况，则需要联系 Cherry Studio 的团队进行商业授权。



可以看出，上述许可证的条款多半是出于保护商业利益的考虑，由于带有对部分用户的限制属性，自然难以获得 OSI 的批准。从开源原教旨主义的角度来看，它们甚至未必算得上真正的开源项目。



在当下，**<font style="color:rgba(253,58,184,1);">「开源」的定义愈发模糊</font>**：不仅“开源大模型”与“开放权重大模型”之间存在诸多争议，传统软件的开源也仿佛在雾里看花。与此同时，GitHub 不再只是单纯的代码托管、协作和分发平台，而是成为这一时代的运营阵地：许多连源代码都闭源的产品（如 **Cursor、Claude-Code**<font style="color:rgba(253,58,184,1);"> </font>等）依旧在 GitHub 上占有一席之地，让看客们常常拥有一种它们也是开源项目的错觉。这些仓库无一例外拥有一骑绝尘的 Star 数量，但它承担的真正功能也许只是作为厂商收集用户反馈的入口。



### 技术领域的趋势
从今年的技术领域发展趋势来看，**AI Coding、Model Serving **和** LLMOps** 整体处于增长的态势，尤其是 AI Coding 的增长斜率在近两个月还在持续攀升，再次印证了 AI 研发提效是 2025 年真正被验证和落地的应用场景；**Agent Framework **和** AI Data** 是下跌比较明显的两个领域，Agent 开发框架的下跌和曾经在头部的 LangChain、LlamaIndex、AutoGen 等项目在社区投入上的显著收缩有很大关系，而 AI Data 在向量存储、数据集成及数据治理等维度上，也表现出在平稳中逐步下降的趋势。



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757151270548-24e04176-2f7b-4917-8eb4-023706299dee.png)

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757151316205-2ba58bbe-ab91-4324-8aee-f3956209eedb.png)



### 边缘地带的项目们
如下是本次没有出现在全景图上，但是依旧被认为是很有潜力的开源项目们，我们会持续保持关注。继续加油！

| **Project** | **OpenRank** | **Star** | **OpenRank Trend** | **Language** | **Created** | **Comment** |
| --- | :---: | :---: | :---: | :---: | :---: | --- |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039312318-d24be49a-cc85-4d3a-bd57-ed085b9c09e7.png) | **48** | **25630** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039132296-b79665c9-820c-442b-8a88-e65115424d4e.png) | TypeScript | 2022-08-17 | 为 Stable Diffusion 模型提供的 WebUI 创作引擎。类似的项目还有 ComfyUI、stable-diffusion-webui，都拥有更加可观的 Star 数量和更为陡峭的 OpenRank 下降曲线。 |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039285683-4e7db60d-3b45-4a37-8912-b1916af94121.png) | **46** | **13254** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039146093-e8487219-61d0-4d22-bb73-fc0d875223b0.png) | Python | 2023-04-27 | 一种锚定了团队协作场景的 Chatbot，基于 GenAI 的 Teams 聊天工具 - 把你团队的专有知识喂给大模型。 |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039324633-41038448-0c06-4a46-af52-7644803806e9.png) | **37** | **15954** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039151570-35ab93c5-fb38-4ccb-a9e1-2d8a5edba797.png) | Python | 2025-05-07 | 字节推出的 Deep Research 框架，在模型之上集成了 Web 搜索，数据抓取和脚本执行的能力，一经推出即受到关注，但近两个月维护度下降，社区数据逐渐跌落。 |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039276733-930cb1d4-7994-4a7c-b1e2-736cb5c32e99.png) | **36** | **3704** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039163009-77054d73-a52c-49f0-afd9-88beade26831.png) | C++ | 2024-06-25 | 清华大学 KVCache.AI 团队提出的模型服务平台，虽然关注度和社区指标都不算高，但能够看到明显的攀升走势。 |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039268911-25a37913-f166-4f37-b010-ef2d42e2af44.png) | **34** | **14782** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039167076-e0f13feb-5de1-4e32-94b7-92c4c7cf38ad.png) | Python | 2024-07-26 | 同为 KVCache.AI 提出的推理优化框架，在今年 2 月实现了本地单机部署千亿参数满血版的 DeepSeek 模型之后迅速爆火，随后持续回落。 |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039263566-dbb192f2-ea35-45fa-8e59-5e4b13a03561.png) | **32** | **15548** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039170796-512b976e-d550-4456-86ec-4c8adc24a46d.png) | Python | 2024-07-03 | 多语言语音生成大模型，模型开源的同时，也开源了推理，训练和部署的全栈工具链。近几个月数据稍见颓势，还需继续观望。 |
| ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039258654-92d36456-2d7e-4b12-8c96-ecaf9cec8d17.png) | **29** | **18825** | ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039175074-6ac57da8-96be-4590-a0e3-613040112049.png) | TypeScript | 2025-03-25 | A2A 协议在今年 MCP 最火热的时候由 Google 提出，并随后在 6 月份官宣捐赠给 Linux 基金会。作为大厂占据生态位的战略布局，A2A 无论是社区化还是被接纳的程度，都需要等待时间验证。 |




## 从 1.0 到 2.0，100 天中的变与不变
和 3 个月前的第一个版本相比，除了最明显的项目更替之外，我们也对整体的生态结构和领域做了合并、拆分和描述的调整，例如，将笼统的 “Infrastructure” 和 “Application” 的一级分类描述修改为更加具体的、也已经在逐渐发展出清晰技术边界的 **“AI Infra”、“AI Agent” 和 “AI Data”**。技术仍在高速的发展，尤其在 Agent 领域，项目之间的定位和边界必然会随着技术发展而动态演化，我们可以通过 Landscape 的变化，观察到一个新的技术生态从混乱逐渐归为有序的过程。



### 哪些领域和项目出局了
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758037615068-d08f0a12-68ea-49c2-b6ea-2e1a9fc4a27b.png)



无论 Manus、Perplexity 这些商业产品发展和普及程度如何，在开源生态里，相关领域下的开源项目都并没有得到很好的发展。



#### 出局的项目中，有不少可能正在步入“AI 墓园”的路上
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758039817735-685ef7e8-20fa-47be-be64-29229b809c8b.png)

+ 3 月份 Manus 一时爆火，多智能体框架 MetaGPT 和 Camel AI 紧随其后推出了开源版本的 **OpenManus** 和 **OWL**，但也仅仅只是昙花一现；
+ **NextChat** 是最早一批流行的大模型客户端应用的项目，但后续的迭代和新特性接入速度远远比不上 Cherry Studio、LobeChat 等后起之秀，渐渐无人维护；
+ **Bolt.new** 作为流行的全栈 Web 开发工具，以开放模板的方式被开源出来，且很少合入外部的代码。模板仓库中没有开发 Issue 的功能，仓库的活跃度也在逐渐趋向于零。

![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758271709726-d297b414-3db0-409f-9e52-f4c07ed276e7.png)

+ 一度非常流行的两个端侧模型部署的工具：**MLC-LLM 和 GPT4All**，前者绑定了自家的推理引擎 MLCEngine，后者和 Ollama 同样使用了端侧推理引擎 llama.cpp，然而最终这个生态位还是被 Ollama 拔得头筹；
+ **FastChat** 是 LMSYS 在模型训练、推理和评测等环节的早期尝试，如今他们已经有了更成功的 SGLang 和 LMArena 平台；
+ 而更早出现的面向大模型 GPU 推理的 **Text Generation Inference（TGI）**，由于性能落后于 vLLM 和 SGLang 等引擎，也渐渐被 HuggingFace 所放弃。



#### 昔日巨星 TensorFlow 的十年消亡之路
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757084053627-682ee0b9-815e-4508-b2ee-0f8173b0ec2f.png)



**2015 年 11 月**，谷歌将 TensorFlow 以 Apache 2.0 开源，很快发展为深度学习领域的主导框架。从诞生之初，TensorFlow 就为生产环境而设计，这与后来发布的 PyTorch 采取的 “Pythonic”和“研究人员优先” 构建理念截然不同。作为开发下一代模型的创新者，研究人员倾向于选择 PyTorch，因为它灵活、易用。



**2019 年 10 月**，TensorFlow 发布了 2.0 版本，借鉴了 PyTorch 的核心理念，简化了模型构建。然而，这种技术上的合理转变却付出了巨大的代价：由于缺乏无缝的向后兼容性，以及复杂的迁移工具，许多已经转向 PyTorch 的开发者不愿意承担迁移遗留的 1.x 代码和学习新 API 的负担，从而对 PyTorch 的忠诚度更加坚定。正是在这个时间点，PyTorch 社区正式超过了 TensorFlow，**两个项目也从此走向了分化的发展曲线**。



### 哪些领域和项目第一次进入视野
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757169346179-fea18c6f-a266-422c-8ca9-9bb708155dcc.png)



领域的变化主要体现在 Agent 层面，以 AI Coding、Chatbot 和开发框架为主的领域出现了不少新的高热度项目。在其中，还发现了两个和具身智能应用场景相关的有趣项目：

+ [小智 AI 聊天机器人](https://github.com/78/xiaozhi-esp32)：构建一个基于 **ESP32 微控制器** 的 AI 语音交互设备——“AI 小智”，让大语言模型（如 Qwen、DeepSeek）能运行在硬件中。
+ [Genesis](https://github.com/Genesis-Embodied-AI/Genesis)：面向通用机器人与具身的物理仿真平台，用途包括机器人学习、物理模拟、渲染与数据生成，具备极高的科研与应用价值。

Infra 层面在领域的变化主要体现在对“模型运维”这一概念的整合，我们将原先涉及到模型评测和传统机器学习运维的领域合并在一起，成为纵穿模型全生命周期的** LLMOps**，它本质上是 **MLOps 在大语言模型时代的延伸**，解决的是如何在真实生产环境下高效、可靠、可控地使用 LLM。当前 LLMOps 领域下的这些项目覆盖了模型与应用的可观测性（Langfuse、Phoenix）、模型评测与基准测试（Promptfoo）、Agentic Workflow 的运行时环境管理（1Panel、Dagger）等环节。



#### 新进项目中的最活跃开源项目 Top 10
我们梳理了这次新进的项目中，OpenRank 位列前 10 的项目。其中，终端 AI 编程助手 Gemini CLI 和模型客户端交互聊天工具 Cherry Studio 还在本次大模型全景图的所有项目中位列第 3 和第 7。



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757678791937-f0bbcecd-a159-4414-9e29-6248034ee0ef.png)

_<font style="color:#7f7f7f;">注：以上数据截止 2025 年 8 月 1 日</font>_



### 没变的是：此消彼长，前浪后浪，增长与衰落，一如既往
在这张全景图上，我们分别标注了 2025 年新进被创建的项目、和半年前相比增长最明显的项目、和同理和半年前相比下跌最明显的项目。



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757170355050-17ea0fc0-fd2d-4752-b5c3-59b16c5537f6.png)



#### 全景图上的「the new wave」
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757648282322-a0345a3a-6355-4c85-8987-b9caba8eb87f.png)

_<font style="color:#7f7f7f;">注：以上数据截止 2025 年 8 月 1 日</font>_


在这些 2025 发起的新势力项目中，OpenCode 来自于创业公司 **<font style="color:rgb(253, 58, 184);">Anomaly Innovations</font>**，并且在发起之日就定位为是 **<font style="color:rgb(253, 58, 184);">Claude Code 的 100% 开源替代</font>**。在剩下的几个项目中，我们可以看出大公司们在模型服务、Agent 开发工具链和 AI Coding 上的开源布局：

+ **<font style="color:rgb(253, 58, 184);">Dynamo</font>** 在支持 vLLM、SGLang 和自家的 TensorRT-LLM 等主流推理后端的同时，也完美适配 NVIDIA GPU 的硬件特性，在成为高吞吐、多模型部署的行业级工具之后，会进一步促使企业倾向选择 NVIDIA 硬件以最大化性能收益；
+ **<font style="color:rgb(253, 58, 184);">adk-python</font>** 和 **<font style="color:rgb(253, 58, 184);">openai-agents-python</font>** 分别是专为 Gemini 和 OpenAI 模型封装的 Agent 系统构建工具，前者甚至做了云服务的生态优化，支持在 Google Cloud 上优先部署编排好的智能体；
+ **<font style="color:rgb(253, 58, 184);">Gemini CLI</font>** 和 **<font style="color:rgb(253, 58, 184);">Codex CLI</font>** 同样效仿了 Claude Code 这种在终端实现高度自治的代码理解与修改的形态，把大模型直接带到开发者最熟悉的命令行里，前者深度绑定 Gemini，后者兼容 OpenAI 并开放 MCP 接口。

在接下来的一段时间，我们可以拭目以待，看看这些项目是否达到了它们被寄予的战略使命。



#### 全景图上的「up and down」
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758088415504-68ee6cdd-6ba5-4c50-9a5f-6568d96c83d4.png)



上述十个项目，分别在近半年内 OpenRank 的增长和下降绝对值与比例都位列前茅，图上我们展示的是他们从 2 月到 8 月的 OpenRank 绝对值变化。



增长较明显的五个项目，分别是：NVIDIA 推出的企业级推理引擎后端 **<font style="color:#7E45E8;">TensorRT-LLM</font>** 和多租户推理编排工具 **<font style="color:#7E45E8;">Dynamo</font>**、字节推出 LLM 强化学习框架 **<font style="color:#7E45E8;">verl</font>**、对标 Claude Code 的开源命令行 Coding 工具 **<font style="color:#7E45E8;">OpenCode</font>**、面向 TypeScript/JavaScript 开发者的 Agent 编排框架 **<font style="color:#7E45E8;">Mastra</font>**。



下降较明显的五个项目，有四个都是 Agent 编排框架：**<font style="color:#8A8F8D;">Eliza、LangChain、LlamaIndex</font>** 和 **<font style="color:#8A8F8D;">AutoGen</font>**。剩下的一个项目，是 OpenAI 在 4 月新推出的命令行 Coding 工具 **<font style="color:#8A8F8D;">Codex</font>**，相较于 Gemini CLI 的快速增长，它的起步看起来有一些出师不利。



## 三大技术趋势：Serving、Coding 和 Agent


![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1756822293176-b3e01d10-d49e-415b-ae8f-7ff30a17c7f3.png)



### 第一篇：Model Serving
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757507604194-4db6f461-e349-4ee1-960b-62536c89f0aa.png)

## ![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757507564594-b94377c5-3b99-43b4-a033-d901ab66261f.png)![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757507570523-79bd997e-f50a-45d8-ac59-baee8512c912.png)


模型服务的本质，是把**训练完成的大模型以一种可被应用层稳定调用的方式运行起来。** 它需要解决的不仅仅是“能不能跑”，更是“能不能高效、可控地跑”。在场景上，**大规模在线推理**是模型服务的主战场，数据中心级的部署支撑了数以千万计的请求；与此同时，企业内部也常常出于安全与合规的考量，搭建私有化的推理服务；而在端侧，像 llama.cpp 或 Ollama 这样的项目，让模型能在个人电脑、手机甚至嵌入式设备上运行，满足离线和隐私需求；还有越来越多的混合模式，部分处理在端侧完成，复杂推理则交给集群完成。



2023 年以来的快速演进已经让模型服务成为连接 AI 基础设施与应用层的关键中间件。一方面，**vLLM、SGLang** 等代表性的推理引擎项目不断在高吞吐、长上下文、多用户并发的场景里打磨出极致性能，另一方面，**Ollama、llama.cpp** 等则推动了本地可用性和生态扩散，让大模型“跑在你手边”成为现实。同时，**NVIDIA Dynamo** 这样的编排框架正在把单机高效推理扩展到多节点、多模型、多租户的集群层面。



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757648620857-21078cea-26a0-4ff5-ae6c-f3964f56b95e.png)





### 第二篇：AI Coding
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757507625071-7914c2dc-1ad2-4fca-87c2-dfcffc9c8d3b.png)



从最初的单一代码补全功能发展到如今的多模态支持、上下文感知与协同工作流，AI Coding 的核心技术在不断进化。CLI 工具如 **Gemini CLI** 和 **OpenCode** 利用 AI 模型的强大推理能力，将开发者的需求转化为更高效的编程体验；与此同时，插件形态的工具，如 **Cline** 和 **Continue**，通过无缝集成到现有开发平台中，让开发者在保持现有工作流的基础上享受 AI 提供的各种智能服务，极大地提升了开发效率。**Goose** 和 **OpenHands** 等协作开发平台，将 AI 能力融入团队项目管理、代码审查、任务分配等各个环节，推动了跨地域、跨职能的团队协作。而**Claude Code**、**Cursor** 和 **Windsurf** 等闭源的商业化项目，也吸引了大量个人开发者和企业客户。随着市场需求的提升，AI Coding 的商业化潜力巨大，付费订阅、SaaS 服务、增值功能等将成为未来的主要盈利模式。



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757648521146-814285e9-bd0d-409f-b50f-8a5656d54269.png)





### 第三篇：AI Agent
![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1757507891940-e09ed4e2-29b8-42e0-b902-16db46555abe.png)



人们常说 2025 年会是 AI 应用真正落地的一年。最初，是 LangChain、LlamaIndex 等框架提供了基础的 Agent 搭建方式；随后，开源生态中出现了专注于不同环节的项目，如 **Mem0**（记忆）、**Browser-Use**（工具调用）、**Dify**（工作流执行）、**LobeChat**（交互界面），开源社区正在构建完整的拼图，为更强大的自治 AI 系统打下基础。每个项目聚焦的方向不同，但目标一致：让 AI 更加智能地理解、记忆、行动和交互，从而真正解放生产力。



![](https://intranetproxy.alipay.com/skylark/lark/0/2025/png/85156528/1758208697137-47a450ad-a936-4822-9e2b-799882561d30.png)








