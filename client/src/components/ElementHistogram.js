import React from 'react';

// Color mapping for five elements
const ELEMENT_COLORS = {
  metal: '#A8B8D3',
  wood: '#8FBC8F',
  water: '#6495ED',
  fire: '#CD5C5C',
  earth: '#DEB887'
};

function ElementHistogram({ data }) {
  // data: { metal: number, wood: number, water: number, fire: number, earth: number }
  return (
    <div style={{ maxWidth: 400, margin: '16px auto' }}>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            <span>{value}%</span>
          </div>
          <div style={{ background: '#eee', height: 12, borderRadius: 6, overflow: 'hidden' }}>
            <div
              style={{
                width: `${value}%`,
                background: ELEMENT_COLORS[key] || '#888',
                height: '100%'
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ElementHistogram;