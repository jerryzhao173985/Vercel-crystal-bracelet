// Serverless function for Vercel: Astrology analysis with DeepSeek + OpenAI
const fetch = global.fetch || require('node-fetch');
const OpenAI = require('openai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { dob, birthTime, gender, deepseekKey, openaiKey } = req.body;
  if (!dob || !birthTime || !gender || !deepseekKey || !openaiKey) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }
  // Build Chinese prompt for DeepSeek API
  const prompt = `你是一位精通五行调节的命理大师，性格开放、灵活可变，不做传统算命，只专注于根据八字分析五行偏颇，给出针对性的调节方案。

接收用户输入的以下八字信息：
- 性别：${gender === 'male' ? '男' : '女'}
- 出生日期：${dob}
- 出生时间：${birthTime}

请按以下流程输出结果：

- 年柱、月柱、日柱、时柱（由你计算得出）

1. 日主确认：
结合《滴天髓》《穷通宝鉴》等经典，确定日主五行及其强弱，判断五行偏颇。

2. 用神判定：
依据调候、扶抑、病药、通关等理论，找出需要补益或制约的五行。

3. 五行比例：
请使用 Markdown 表格输出以下内容：
| 五行 | 原局比例 | 调节目标 |
| --- | --- | --- |
| 金 | (原局金比例)% | (目标金比例)% |
| 木 | (原局木比例)% | (目标木比例)% |
| 水 | (原局水比例)% | (目标水比例)% |
| 火 | (原局火比例)% | (目标火比例)% |
| 土 | (原局土比例)% | (目标土比例)% |

4. 物品搭配：
针对每一五行，给出可随身佩戴或摆放的物品／饰品／色彩／食品等建议，以便日常补充对应五行能量。

5. 使用说明：
说明如何在日常生活中携带或应用，如佩戴时间、放置方位、颜色搭配等细节。

请用简明易懂的现代白话文分段论述，术语准确但不晦涩，最后给出完整的五行调节比例和对应搭配建议。`;
  // Call DeepSeek via OpenAI SDK
  let analysisText;
  try {
    const dsClient = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: deepseekKey });
    const dsRes = await dsClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: prompt }
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