// Serverless function for Vercel: Astrology analysis with DeepSeek + OpenAI
const fetch = global.fetch || require('node-fetch');
const OpenAI = require('openai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { dob, birthTime, gender, deepseekKey, openaiKey, customPrompt, promptType } = req.body;
  if (!dob || !birthTime || !gender || !deepseekKey || !openaiKey) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }
  // Build Chinese prompt for DeepSeek API with personalized resonance colors
  const systemPrompt  = `你是一位精通五行调节的命理大师，性格开放、灵活可变，不做传统算命，只专注于根据八字分析五行偏颇，并给出精准调节方案。`;
  const basicPrompt = `作为融合古典命理学与现代能量疗愈的大师，你精研天干地支能量算法，能基于用户信息深入分析五行短板/过亢问题，通过五行能量解析与视觉化调节，帮助用户建立与自然节律的深层共振。` +
                        `通过八字识别金木水火土能量偏差，指导运用方位、饮食、饰品进行自我调节，结合现代生活方式设计元素补给及执行方案。` +
                        `同时为了与用户八字共振，请为每个五行元素量身定制一个唯一的十六进制颜色(#RRGGBB)，该颜色需在视觉和能量层面显著辅助调节。`
    +`
接收用户输入的八字信息：
- 性别：${gender === 'male' ? '男' : '女'}
- 出生日期：${dob}
- 出生时间：${birthTime}

请直接按以下流程输出：

1. 年柱、月柱、日柱、时柱（请计算并列出）。

2. 日主与用神：结合《滴天髓》《穷通宝鉴》等经典，分析日主五行强弱，判定需补益或制约之五行。

3. 五行调节比例：请使用Markdown表格，包含“推荐颜色”列，其值为为用户定制的专属HEX代码：
| 五行 | 原局比例 | 调节目标 | 推荐颜色 |
| ---- | ---- | ---- | -------- |
| 金   | xx%   | yy%   | #RRGGBB |
| 木   | xx%   | yy%   | #RRGGBB |
| 水   | xx%   | yy%   | #RRGGBB |
| 火   | xx%   | yy%   | #RRGGBB |
| 土   | xx%   | yy%   | #RRGGBB |

4. 物品搭配：为每一元素推荐可佩戴或摆放的物品/色彩/食品等，以补充相应能量。

5. 使用说明：提供佩戴时间、放置方位、配色细节等实用建议。

请用现代白话文分段，格式简洁，术语准确。`;

  const advancedPrompt = `作为融合古典命理学（子平、盲派、调候论）与现代能量疗愈的顾问，您的任务并非预测命运，而是通过五行能量解析与视觉化调节，帮助用户建立与自然节律的深层共振。

---
接收用户输入的八字信息：
- 性别：${gender === 'male' ? '男' : '女'}
- 出生日期：${dob}
- 出生时间：${birthTime}
#### **核心分析路径**  
**1. 能量溯源（专业深度）**  
- 交叉验证《滴天髓》调候论与盲派做功论，当结论冲突时需标注矛盾点（例："传统旺衰认为需补水，但盲派见子未相害损水根，建议优先解害而非补水"）  
- 必须标注关键推理节点（例："判定甲木身弱因：①酉月死地 ②辛金透干贴身克 ③子水被未土穿害"）

**2. 矛盾揭示（启发思考）**  
- 明确列出命局中的三组核心矛盾（例："金旺需火制 vs 原局火绝 | 身弱需印 vs 财星坏印"），要求用户选择最想优先化解的矛盾  
- 通过提问引导认知（例："您认为近期困扰更多来自事业阻滞（金克木）还是情绪焦虑（火弱）？"）

**3. 动态调节（科学思维）**  
- 提供五行调节的「基础方案」与「激进方案」对比（例：补水可通过每日饮水量微调【基础】，或居住地向北迁移200公里【激进】）  
- 标注能量干预的滞后效应（例："色彩调节见效周期约21天，方位调整需3个月显效"）

---

#### **视觉化输出要求**  
**A. 能量图谱**  
```ascii
金 ████████ 35%  
水 █████ 20%  
木 ███ 15%    ← 用渐变色块展示当前与目标比例差
火 ▏5%  
土 ██████ 25%  
```

**B. 色彩处方**  
|| 基础色（日常穿戴） | 强化色（环境主色） | 禁忌色 |  
|-|-|-|-|  
|**木**|#98FB98（薄荷绿）|#006400（深松绿）|...|  
*注：给出五种金木水火土所有五行对应颜色，务必是最符合所有之前命理分析五行解析等过程的，深入思考颜色种类，明细区别，给出针对个体所有信息最对应的五行元素最适合的调节颜色，需简要说明色相选择依据（例："深松绿含黑色调可助甲木扎根"）*`;

  // Select system prompt: custom > advanced > basic
  const prompt = customPrompt && customPrompt.trim()
    ? customPrompt.trim()
    : (promptType === 'advanced' ? advancedPrompt : basicPrompt);
  
  // Call DeepSeek via OpenAI SDK
  let analysisText;
  try {
    const dsClient = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: deepseekKey });
    const dsRes = await dsClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: prompt }
      ]
    });
    analysisText = dsRes.choices?.[0]?.message?.content;
  } catch (err) {
    res.status(500).json({ error: 'DeepSeek API error', details: err.message });
    return;
  }
  // Use OpenAI Structured Response API to extract current and goal percentages
  let ratios;
  try {
    const oaClient = new OpenAI({ apiKey: openaiKey });
    const oaRes = await oaClient.responses.create({
      model: 'gpt-4.1',
      input: [
        {
          role: 'system',
          content: '你是一个JSON解析器，只输出包含 current（当前分布）、goal（最佳调节比例）和 colors（推荐颜色）三个对象，不要额外文字。' +
                   'current 和 goal 对象的属性金、木、水、火、土为数字百分比；colors 对象的属性金、木、水、火、土为十六进制颜色字符串。'
        },
        {
          role: 'user',
          content: `请从以下内容中抽取 current、goal 和 colors，并以纯JSON输出：\n\n${analysisText}`
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'five_element_distribution',
          schema: {
            type: 'object',
            properties: {
              current: {
                type: 'object',
                properties: {
                  metal:  { type: 'number' },
                  wood:   { type: 'number' },
                  water:  { type: 'number' },
                  fire:   { type: 'number' },
                  earth:  { type: 'number' }
                },
                required: ['metal','wood','water','fire','earth'],
                additionalProperties: false
              },
              goal: {
                type: 'object',
                properties: {
                  metal:  { type: 'number' },
                  wood:   { type: 'number' },
                  water:  { type: 'number' },
                  fire:   { type: 'number' },
                  earth:  { type: 'number' }
                },
                required: ['metal','wood','water','fire','earth'],
                additionalProperties: false
              },
              colors: {
                type: 'object',
                properties: {
                  metal:  { type: 'string' },
                  wood:   { type: 'string' },
                  water:  { type: 'string' },
                  fire:   { type: 'string' },
                  earth:  { type: 'string' }
                },
                required: ['metal','wood','water','fire','earth'],
                additionalProperties: false
              }
            },
            required: ['current','goal','colors'],
            additionalProperties: false
          }
        }
      }
    });
    // The structured output is in output_text
    const text = oaRes.output_text;
    ratios = JSON.parse(text);
  } catch (err) {
    res.status(500).json({ error: 'OpenAI Structured Response API error or JSON parsing error', details: err.message });
    return;
  }
  // Return both full analysis text and structured ratios
  res.status(200).json({ analysis: analysisText, ratios });
};
// Configure Vercel function max execution duration (in seconds)
module.exports.config = {
  maxDuration: 60
};