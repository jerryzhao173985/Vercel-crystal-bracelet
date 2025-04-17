import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BraceletCanvas from './components/BraceletCanvas';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
  // List of available beads from the server
  const [beads, setBeads] = useState([]);
  // The user's bracelet: each item in the array is { color: ... }
  const [bracelet, setBracelet] = useState([]);
  // How many beads do we want initially?
  const [numBeads, setNumBeads] = useState(10);

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
      </div>
    </DndProvider>
  );
}

export default App;
