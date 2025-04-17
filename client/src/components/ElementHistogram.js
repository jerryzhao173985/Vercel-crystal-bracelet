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
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12, fontSize: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ccc', borderRadius: 3 }}></span> 当前
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: '#000', opacity: 0.2, borderRadius: 3 }}></span> 目标
        </span>
      </div>
      {['metal', 'wood', 'water', 'fire', 'earth'].map((key) => {
        const curr = current[key] || 0;
        const go = goal[key] || 0;
        const color = ELEMENT_COLORS[key] || '#888';
        return (
          <div key={key} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, fontWeight: 600, textTransform: 'capitalize' }}>
              {key} — 当前: {curr}% ／ 目标: {go}%
            </div>
            <div style={{ position: 'relative', background: '#eee', height: 16, borderRadius: 8, overflow: 'hidden' }}>
              {/* current bar */}
              <div
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: `${curr}%`, height: '100%',
                  background: '#ccc'
                }}
              />
              {/* goal bar overlay */}
              <div
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: `${go}%`, height: '100%',
                  background: color, opacity: 0.8
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