// Serverless function for Vercel: Astrology analysis with DeepSeek + OpenAI
const fetch = global.fetch || require('node-fetch');
const OpenAI = require('openai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { dob, gender, deepseekKey, openaiKey } = req.body;
  if (!dob || !gender || !deepseekKey || !openaiKey) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }
  // Build Chinese prompt for DeepSeek API
  const prompt = `你是一位精通五行调节的命理大师，性格开放、灵活可变，不做传统算命，只专注于根据八字分析五行偏颇，给出针对性的调节方案。

接收用户输入的以下八字信息：
- 性别：${gender === 'male' ? '男' : '女'}
- 出生日期：${dob}

请按以下流程输出结果：

- 年柱、月柱、日柱、时柱（由你计算得出）

1. 日主确认：
结合《滴天髓》《穷通宝鉴》等经典，确定日主五行及其强弱，判断五行偏颇。

2. 用神判定：
依据调候、扶抑、病药、通关等理论，找出需要补益或制约的五行。

3. 五行比例：
结合上一步结果，计算出金、木、水、火、土的最佳调节比例（例如：金10%、木25%、水15%、火30%、土20%）。

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
  // Use OpenAI to parse JSON for five-element ratios
  let ratios;
  try {
    const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: '你是一个JSON解析器，只输出包含金、木、水、火、土的百分比对象，不要额外文字。' },
          { role: 'user', content: `请从以下内容中抽取五行比例并以纯JSON输出：\n\n${analysisText}` }
        ],
        temperature: 0
      })
    });
    const oaData = await oaRes.json();
    const text = oaData.choices?.[0]?.message?.content || '';
    ratios = JSON.parse(text);
  } catch (err) {
    res.status(500).json({ error: 'OpenAI API error or JSON parsing error', details: err.message });
    return;
  }
  // Return both full analysis text and structured ratios
  res.status(200).json({ analysis: analysisText, ratios });
};