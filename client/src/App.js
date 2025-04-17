import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BraceletCanvas from './components/BraceletCanvas';
import ElementHistogram from './components/ElementHistogram';
import ReactMarkdown from 'react-markdown';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
  // List of available beads from the server
  const [beads, setBeads] = useState([]);
  // The user's bracelet: each item in the array is { color: ... }
  const [bracelet, setBracelet] = useState([]);
  // How many beads do we want initially?
  const [numBeads, setNumBeads] = useState(10);
  // Astrology analysis inputs & results
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [ratios, setRatios] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Prepare beads for SidePalette (with img)
  const paletteBeads = beads.map((b) => ({ ...b, img: b.img || b.image || b.url || '', color: b.color }));

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
            <button onClick={async () => {
                setLoading(true);
                try {
                  const res = await axios.post('/api/astro', { dob, gender, deepseekKey, openaiKey });
                  setAnalysis(res.data.analysis);
                  setRatios(res.data.ratios);
                } catch (err) {
                  console.error(err);
                  alert('分析失败，请检查输入和 API Key');
                }
                setLoading(false);
              }}
              disabled={!dob || !gender || !deepseekKey || !openaiKey || loading}
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
            min="1"
            max="20"
            value={numBeads}
            onChange={(e) => setNumBeads(Number(e.target.value))}
            style={{fontSize: 18, width: 60, marginLeft: 8, borderRadius: 6, border: '1px solid #bbb', padding: '2px 8px'}}
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
        {/* Display analysis and histogram */}
        {analysis && (
          <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 600, margin: '24px auto' }}>
            <h3 style={{ marginTop: 0, textAlign: 'center' }}>命理分析结果</h3>
            <div className="markdown-body" style={{ textAlign: 'left', maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
            {ratios && <ElementHistogram current={ratios.current} goal={ratios.goal} />}
          </div>
        )}
      </div>
    </DndProvider>
  );
}

export default App;
