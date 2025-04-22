import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BraceletCanvas from './components/BraceletCanvas';
import ElementHistogram from './components/ElementHistogram';
import ReactMarkdown from 'react-markdown';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
  // Maximum beads allowed (matches input max attribute)
  const MAX_BEADS = Number(20); // can update here or sync with input max
  // List of available beads from the server
  const [beads, setBeads] = useState([]);
  // The user's bracelet: each item in the array is { color: ... }
  const [bracelet, setBracelet] = useState([]);
  // How many beads do we want initially?
  const [numBeads, setNumBeads] = useState(10);
  // Astrology analysis inputs & results
  const [dob, setDob] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  // Prompt settings: built-in or custom prompt
  const [promptOption, setPromptOption] = useState('default');
  const [promptType, setPromptType] = useState('basic');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState({});
  const [analysis, setAnalysis] = useState('');
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const [ratios, setRatios] = useState(null);
  const [loading, setLoading] = useState(false);
  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [growthAnimating, setGrowthAnimating] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const speedRef = React.useRef(speedMultiplier);
  // Fetch prompt templates for built-in prompts
  useEffect(() => {
    async function fetchPrompts() {
      try {
        const res = await axios.get('/api/prompt');
        setPromptTemplates(res.data);
      } catch (err) {
        console.error('Error fetching prompt templates:', err);
      }
    }
    fetchPrompts();
  }, []);

  // Fetch the bead catalog from the server
  useEffect(() => {
    async function fetchBeads() {
      try {
        const res = await axios.get('/api/beads');
        setBeads(res.data);
      } catch (err) {
        console.error('Error fetching bead data:', err);
      }
    }
    fetchBeads();
  }, []);

  // Initialize the user's bracelet whenever numBeads changes
  useEffect(() => {
    // Fill array with placeholder color objects
    const initialBracelet = Array(numBeads).fill({ color: '#ccc' });
    setBracelet(initialBracelet);
  }, [numBeads]);

  // Drag/drop handler for bracelet beads and palette beads
  const handleBeadDrop = (from, toIndex, fromPalette) => {
    const newBracelet = [...bracelet];
    if (fromPalette) {
      // Drag from palette: fill or replace bead
      newBracelet[toIndex] = { color: from };
      setBracelet(newBracelet);
    } else {
      // Drag from bracelet: move color (swap)
      if (from === toIndex) return;
      // Swap colors
      const temp = newBracelet[toIndex];
      newBracelet[toIndex] = { ...newBracelet[from] };
      newBracelet[from] = temp;
      setBracelet(newBracelet);
    }
  };

  // Prepare beads for SidePalette: use dynamic colors if available, otherwise default beads
  const paletteBeads = ratios && ratios.colors
    ? Object.entries(ratios.colors).map(([key, color]) => ({ id: key, color }))
    : beads.map((b) => ({ id: b.id, img: b.img || b.image || b.url || '', color: b.color }));

  // Default colors in case API colors missing
  const defaultElementColors = {
    metal: '#FFD700', wood: '#228B22', water: '#1E90FF', fire: '#FF4500', earth: '#DEB887'
  };
  // Generate a randomized bead list of length n based on ratios.goal and ratios.colors
  const generateBeadsList = (n) => {
    if (!ratios?.goal) return Array(n).fill({ color: '#ccc' });
    const elements = ['metal','wood','water','fire','earth'];
    // compute float counts
    const floats = elements.map(key => ({
      key,
      floatCount: (ratios.goal[key] || 0) * n / 100
    }));
    // floor counts & remainders
    const counts = floats.map(({ key, floatCount }) => ({
      key,
      count: Math.floor(floatCount),
      rem: floatCount - Math.floor(floatCount)
    }));
    // adjust to total n
    let total = counts.reduce((sum, e) => sum + e.count, 0);
    let diff = n - total;
    if (diff > 0) {
      counts.sort((a,b) => b.rem - a.rem);
      for (let i = 0; i < diff; i++) counts[i].count++;
    } else if (diff < 0) {
      counts.sort((a,b) => a.rem - b.rem);
      for (let i = 0; i < -diff; i++) counts[i].count = Math.max(0, counts[i].count - 1);
    }
    // build list
    const beadsList = [];
    counts.forEach(({ key, count }) => {
      const color = ratios.colors?.[key] || defaultElementColors[key];
      for (let i = 0; i < count; i++) beadsList.push({ color });
    });
    // shuffle
    for (let i = beadsList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [beadsList[i], beadsList[j]] = [beadsList[j], beadsList[i]];
    }
    // pad
    while (beadsList.length < n) beadsList.push({ color: '#ccc' });
    return beadsList;
  };
  // Randomize bracelet to match goal distribution with colors
  const randomizeBracelet = () => setBracelet(generateBeadsList(numBeads));
  // Auto-randomize on result or bead count change
  useEffect(() => {
    if (ratios?.goal) randomizeBracelet();
  }, [ratios, numBeads]);

  // Animate randomization: flash randomize for 5 seconds
  // timing dynamically responds to speedRef.current
  React.useEffect(() => { speedRef.current = speedMultiplier; }, [speedMultiplier]);
  const animateRandomize = () => {
    if (!ratios?.goal || isAnimating) return;
    setIsAnimating(true);
    let count = 0;
    // recursive timeout to adapt to speedMultiplier changes
    const run = () => {
      if (count >= 25) {
        setIsAnimating(false);
        return;
      }
      randomizeBracelet();
      count++;
      setTimeout(run, 200 / speedRef.current);
    };
    run();
  };
  // Animate growth: beads count from 1 to maximum (MAX_BEADS) in 5s
  // timing dynamically responds to speedRef.current
  const animateGrow = () => {
    if (!ratios?.goal || growthAnimating) return;
    setGrowthAnimating(true);
    const target = MAX_BEADS;
    let step = 1;
    setBracelet(generateBeadsList(step));
    const baseTime = 5000; // ms for full grow
    const runGrow = () => {
      if (step >= target) {
        setGrowthAnimating(false);
        return;
      }
      step++;
      setBracelet(generateBeadsList(step));
      setTimeout(runGrow, baseTime / (target - 1) / speedRef.current);
    };
    runGrow();
  };
  
  // Render
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App" style={{ textAlign: 'center', minHeight: '100vh', background: 'linear-gradient(135deg,#e3e8f0 0%,#f7fafc 100%)' }}>
        <h1 style={{marginTop: 32, marginBottom: 12, letterSpacing: 2}}>水晶手串定制</h1>
        {/* Astrology Analysis Section */}
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 360, margin: '0 auto 24px' }}>
          <h2 style={{ marginTop: 0 }}>命理五行分析</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            <label>出生日期:
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ width: '100%', padding: 6, marginTop: 4, borderRadius: 4, border: '1px solid #ccc' }}/>
            </label>
            <label>出生时间:
              <input type="time" value={birthTime} onChange={e => setBirthTime(e.target.value)} style={{ width: '100%', padding: 6, marginTop: 4, borderRadius: 4, border: '1px solid #ccc' }}/>
            </label>
            <label>性别:
              <select value={gender} onChange={e => setGender(e.target.value)} style={{ width: '100%', padding: 6, marginTop: 4, borderRadius: 4, border: '1px solid #ccc' }}>
                <option value="">请选择</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </label>
            <label>DeepSeek API Key:
              <input type="password" value={deepseekKey} onChange={e => setDeepseekKey(e.target.value)} placeholder="输入 DeepSeek Key" style={{ width: '100%', padding: 6, marginTop: 4, borderRadius: 4, border: '1px solid #ccc' }}/>
            </label>
            <label>OpenAI API Key:
              <input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} placeholder="输入 OpenAI Key" style={{ width: '100%', padding: 6, marginTop: 4, borderRadius: 4, border: '1px solid #ccc' }}/>
            </label>
            {/* Prompt Settings Toggle */}
            <div style={{ marginTop: 8, textAlign: 'left' }}>
              <button
                onClick={() => setShowPromptSettings(!showPromptSettings)}
                style={{ background: 'none', border: 'none', padding: 0, color: '#4a90e2', cursor: 'pointer', fontSize: 14 }}
              >
                ⚙️ 提示设置 {showPromptSettings ? '▲' : '▼'}
              </button>
            </div>
            {showPromptSettings && (
              <div style={{ background: '#f9f9f9', padding: 12, border: '1px solid #ccc', borderRadius: 6, marginTop: 8, textAlign: 'left' }}>
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="radio"
                    id="defaultPrompt"
                    name="promptOption"
                    value="default"
                    checked={promptOption === 'default'}
                    onChange={() => setPromptOption('default')}
                  />
                  <label htmlFor="defaultPrompt" style={{ marginLeft: 4 }}>内置提示</label>
                </div>
                {promptOption === 'default' && (
                  <div style={{ marginLeft: 16, marginBottom: 8 }}>
                    <label>选择提示类型:
                      <select
                        value={promptType}
                        onChange={e => setPromptType(e.target.value)}
                        style={{ marginLeft: 4, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                      >
                        {Object.keys(promptTemplates).map(key => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="radio"
                    id="customPrompt"
                    name="promptOption"
                    value="custom"
                    checked={promptOption === 'custom'}
                    onChange={() => setPromptOption('custom')}
                  />
                  <label htmlFor="customPrompt" style={{ marginLeft: 4 }}>自定义提示</label>
                </div>
                {promptOption === 'custom' && (
                  <textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    rows={4}
                    placeholder="输入自定义提示..."
                    style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                )}
              </div>
            )}
            <button onClick={async () => {
                setLoading(true);
                try {
                  const res = await axios.post('/api/astro', { dob, birthTime, gender, deepseekKey, openaiKey, customPrompt, promptType });
                  setAnalysis(res.data.analysis);
                  setRatios(res.data.ratios);
                } catch (err) {
                  console.error(err);
                  alert('分析失败，请检查输入和 API Key');
                }
                setLoading(false);
              }}
              disabled={!dob || !birthTime || !gender || !deepseekKey || !openaiKey || loading}
              style={{ padding: '10px', fontSize: 16, borderRadius: 6, border: 'none', background: '#4a90e2', color: '#fff', cursor: 'pointer' }}>
              {loading ? '分析中...' : '开始分析'}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="numBeads">Number of Beads: </label>
          <input
            type="number"
            id="numBeads"
            min={1}
            max={MAX_BEADS}
            value={numBeads}
            onChange={(e) => setNumBeads(Number(e.target.value))}
            disabled={isAnimating || growthAnimating}
            style={{fontSize: 18, width: 60, marginLeft: 8, borderRadius: 6, border: '1px solid #bbb', padding: '2px 8px', background: (isAnimating||growthAnimating) ? '#eee' : '#fff'}}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 36 }}>
          <BraceletCanvas
            bracelet={bracelet}
            onBeadClick={() => {}}
            onBeadDrop={handleBeadDrop}
            paletteBeads={paletteBeads}
          />
        </div>
        {/* Randomize, Flash Animate & Growth Animate Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          <button
            onClick={randomizeBracelet}
            disabled={!ratios?.goal || isAnimating || growthAnimating}
            style={{ padding: '8px 16px', fontSize: 14, borderRadius: 6, border: 'none', background: !ratios?.goal || isAnimating || growthAnimating ? '#ccc' : '#4a90e2', color: '#fff', cursor: !ratios?.goal || isAnimating || growthAnimating ? 'not-allowed' : 'pointer' }}
          >随机排珠</button>
          <button
            onClick={animateRandomize}
            disabled={!ratios?.goal || isAnimating || growthAnimating}
            style={{ padding: '8px 16px', fontSize: 14, borderRadius: 6, border: 'none', background: !ratios?.goal || isAnimating || growthAnimating ? '#ccc' : '#4a90e2', color: '#fff', cursor: !ratios?.goal || isAnimating || growthAnimating ? 'not-allowed' : 'pointer' }}
          >{isAnimating ? '动画中...' : '动画'}</button>
          <button
            onClick={animateGrow}
            disabled={!ratios?.goal || isAnimating || growthAnimating}
            style={{ padding: '8px 16px', fontSize: 14, borderRadius: 6, border: 'none', background: !ratios?.goal || isAnimating || growthAnimating ? '#ccc' : '#4a90e2', color: '#fff', cursor: !ratios?.goal || isAnimating || growthAnimating ? 'not-allowed' : 'pointer' }}
          >{growthAnimating ? '增长中...' : '增长动画'}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
            <label style={{ fontSize: 14 }}>速度:</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speedMultiplier}
              onChange={e => setSpeedMultiplier(Number(e.target.value))}
              style={{ width: 120 }}
            />
            <span style={{ fontSize: 14, width: 36, textAlign: 'center' }}>{speedMultiplier.toFixed(1)}x</span>
          </div>
        </div>
        {/* Display analysis and histogram */}
        {analysis && (
          <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 600, margin: '24px auto', position: 'relative' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', cursor: 'pointer' }} onClick={() => setAnalysisExpanded(!analysisExpanded)}>
              命理分析结果 {analysisExpanded ? '🔽' : '🔼'}
            </h3>
            <div
              className="markdown-body"
              style={{
                textAlign: 'left',
                maxHeight: analysisExpanded ? 'none' : 200,
                overflowY: analysisExpanded ? 'visible' : 'auto',
                marginBottom: 16,
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={() => setAnalysisExpanded(!analysisExpanded)}
            >
              {!analysisExpanded && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 30,
                  background: 'linear-gradient(rgba(255,255,255,0), rgba(255,255,255,1))'
                }} />
              )}
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
            {ratios && <ElementHistogram current={ratios.current} goal={ratios.goal} colors={ratios.colors} />}
            {/* Copy report button */}
            <button
              onClick={() => {
                const report = JSON.stringify({ analysis, ratios }, null, 2);
                navigator.clipboard.writeText(report)
                  .then(() => alert('报告已复制到剪贴板'))
                  .catch(() => alert('复制失败'));
              }}
              style={{ marginTop: 12, padding: '6px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #4a90e2', background: '#fff', color: '#4a90e2', cursor: 'pointer' }}
            >复制报告</button>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

export default App;
