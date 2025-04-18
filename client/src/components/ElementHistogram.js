import React from 'react';

// Histogram showing current vs goal percentages for five elements
const ELEMENT_COLORS = {
  metal: '#FFD700',  // 金: gold
  wood:  '#228B22',  // 木: forest green
  water: '#1E90FF',  // 水: dodger blue
  fire:  '#FF4500',  // 火: orange red
  earth: '#DEB887'   // 土: burlywood
};

function ElementHistogram({ current, goal, colors }) {
  // current & goal: { metal, wood, water, fire, earth } percentages
  const barHeight = 24;
  const baseColor = '#eee';
  return (
    <div style={{ maxWidth: 600, margin: '24px auto' }}>
      {['metal', 'wood', 'water', 'fire', 'earth'].map((key) => {
        const curr = Math.max(0, Math.min(current[key] || 0, 100));
        const go   = Math.max(0, Math.min(goal[key] || 0, 100));
        const color = (colors && colors[key]) || ELEMENT_COLORS[key] || '#888';
        // const baseColor = '#eee'; // defined above
        return (
          <div key={key} style={{ marginBottom: 20 }}>
            {/* Element name */}
            <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize', marginBottom: 6 }}>{key}</div>
            {/* Bar container */}
            <div style={{ position: 'relative', width: '100%', height: barHeight, background: baseColor, borderRadius: barHeight/2, overflow: 'visible' }}>
              {/* Current portion (full opacity) */}
              <div
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: `${curr}%`, height: '100%',
                  background: color,
                  opacity: 1,
                  borderRadius: barHeight/2,
                  transition: 'width 0.3s ease'
                }}
              />
              {/* Increment needed (opacity) */}
              {go > curr && (
                <div
                  style={{
                    position: 'absolute', top: 0, left: `${curr}%`,
                    width: `${go - curr}%`, height: '100%',
                    background: color,
                    opacity: 0.4,
                    transition: 'width 0.3s ease'
                  }}
                />
              )}
              {/* Target marker line for both go < curr and go >= curr */}
              <div
                style={{
                  position: 'absolute', top: -4, left: `${go}%`, transform: 'translateX(-50%)',
                  width: 2, height: barHeight + 8,
                  background: color,
                  opacity: 0.8
                }}
              />
              {/* Percent labels */}
              <span
                style={{
                  position: 'absolute', top: -20,
                  left: `${curr}%`, transform: 'translateX(-50%)',
                  fontSize: 12, color: '#333',
                  background: '#fff', padding: '2px 4px', borderRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}
              >{curr}%</span>
              <span
                style={{
                  position: 'absolute', top: -20,
                  left: `${go}%`, transform: 'translateX(-50%)',
                  fontSize: 12, fontWeight: 600, color: '#fff',
                  background: color, padding: '2px 4px', borderRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
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