import React from 'react';
// Histogram showing current vs goal percentages for five elements

const ELEMENT_COLORS = {
  metal: '#FFD700',  // 金: gold
  wood: '#228B22',   // 木: forest green
  water: '#1E90FF',  // 水: dodger blue
  fire: '#FF4500',   // 火: orange red
  earth: '#DEB887'   // 土: burlywood
};

function ElementHistogram({ current, goal }) {
  // current & goal: { metal, wood, water, fire, earth } percentages
  return (
    <div style={{ maxWidth: 400, margin: '16px auto' }}>
      {['metal', 'wood', 'water', 'fire', 'earth'].map((key) => {
        const curr = current[key] || 0;
        const go = goal[key] || 0;
        const color = ELEMENT_COLORS[key] || '#888';
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ width: 80, textTransform: 'capitalize', fontWeight: 600, marginRight: 12 }}>
              {key}
            </span>
            <div style={{ position: 'relative', flex: 1, height: 16, marginRight: 12 }}>
              {/* Current bar background */}
              <div
                style={{
                  width: `${curr}%`,
                  height: '100%',
                  background: '#ccc',
                  borderRadius: 8,
                  transition: 'width 0.3s ease'
                }}
              />
              {/* Goal marker line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${go}%`,
                  transform: 'translateX(-50%)',
                  width: 2,
                  height: '100%',
                  background: color
                }}
              />
            </div>
            {/* Percentage labels */}
            <span style={{ width: 40, textAlign: 'right', fontSize: 12, color: '#333', marginRight: 8 }}>
              {curr}%
            </span>
            <span style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 600, color: color }}>
              {go}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default ElementHistogram;