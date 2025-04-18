import React from 'react';

// Histogram showing current vs goal percentages for five elements
const ELEMENT_COLORS = {
  metal: '#FFD700',  // 金: gold
  wood:  '#228B22',  // 木: forest green
  water: '#1E90FF',  // 水: dodger blue
  fire:  '#FF4500',  // 火: orange red
  earth: '#DEB887'   // 土: burlywood
};

function ElementHistogram({ current, goal }) {
  // current & goal: { metal, wood, water, fire, earth } percentages
  return (
    <div style={{ maxWidth: 600, margin: '24px auto' }}>
      {['metal', 'wood', 'water', 'fire', 'earth'].map((key) => {
        const curr = Math.max(0, Math.min(current[key] || 0, 100));
        const go   = Math.max(0, Math.min(goal[key] || 0, 100));
        const color = ELEMENT_COLORS[key] || '#888';
        const baseColor = '#eee';
        // Determine segments: 0..min(curr, go) full opacity, then delta to goal half opacity
        const firstSegment = Math.min(curr, go);
        const secondSegment = go > curr ? go - curr : 0;
        return (
          <div key={key} style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: 8 }}>{key}</div>
            <div style={{ position: 'relative', width: '100%', height: 20, background: baseColor, borderRadius: 10, overflow: 'hidden' }}>
              {/* Primary segment (up to current or goal, whichever is smaller) */}
              <div
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: `${firstSegment}%`, height: '100%',
                  background: color,
                  opacity: 1,
                  transition: 'width 0.3s ease'
                }}
              />
              {/* Secondary segment (delta to goal) */}
              {secondSegment > 0 && (
                <div
                  style={{
                    position: 'absolute', top: 0, left: `${firstSegment}%`,
                    width: `${secondSegment}%`, height: '100%',
                    background: color,
                    opacity: 0.4,
                    transition: 'width 0.3s ease'
                  }}
                />
              )}
              {/* Current label */}
              <span
                style={{
                  position: 'absolute', top: -22,
                  left: `${curr}%`, transform: 'translateX(-50%)',
                  fontSize: 12, color: '#333', whiteSpace: 'nowrap'
                }}
              >{curr}%</span>
              {/* Goal label */}
              <span
                style={{
                  position: 'absolute', top: -22,
                  left: `${go}%`, transform: 'translateX(-50%)',
                  fontSize: 12, fontWeight: 600, color: color, whiteSpace: 'nowrap'
                }}
              >{go}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ElementHistogram;