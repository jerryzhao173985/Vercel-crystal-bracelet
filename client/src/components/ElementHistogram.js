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
            <div style={{ position: 'relative', flex: 1, background: '#eee', height: 16, borderRadius: 8, overflow: 'hidden' }}>
              {/* Percentage labels */}
              <span
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left: curr > 0 ? `${curr}%` : '0',
                  transform: 'translateX(-50%)',
                  fontSize: 12,
                  color: '#333'
                }}
              >
                {curr}%
              </span>
              <span
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left: `${go}%`,
                  transform: 'translateX(-50%)',
                  fontSize: 12,
                  color: '#000',
                  fontWeight: 600
                }}
              >
                {go}%
              </span>
              {/* Current bar: lighter color */}
              <div
                style={{
                  width: curr > 0 ? `${curr}%` : '2px',
                  height: '100%',
                  background: color,
                  opacity: 0.6,
                  transition: 'width 0.3s ease'
                }}
              />
              {/* Goal bar: full color overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${go}%`,
                  height: '100%',
                  background: color,
                  opacity: 1,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ElementHistogram;