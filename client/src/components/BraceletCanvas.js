import React, { useState, useRef } from 'react';
import { useDrop, useDrag } from 'react-dnd';

const ItemTypes = {
  BEAD: 'bead',
};

function DraggablePaletteBead({ bead, onSelect }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BEAD,
    item: { color: bead.color, fromSelector: true },
    canDrag: true,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [bead]);

  return bead.img ? (
    <img
      ref={drag}
      src={bead.img}
      alt="bead"
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1px solid #aaa',
        background: '#eee',
        objectFit: 'cover',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        marginBottom: 4,
      }}
      onClick={() => onSelect(bead.color)}
      onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
    />
  ) : (
    <div
      ref={drag}
      onClick={() => onSelect(bead.color)}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1px solid #aaa',
        background: bead.color || '#eee',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        marginBottom: 4,
      }}
    />
  );
}

function SidePalette({ beads, visible, x, y, onMouseEnter, onMouseLeave, onSelect }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'center',
        minWidth: 50,
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {beads.map((bead, idx) => (
        <DraggablePaletteBead key={bead.id || idx} bead={bead} onSelect={onSelect} />
      ))}
    </div>
  );
}

function Bead({ bead, index, cx, cy, onBeadDrop, onHover, onUnhover, dropRef }) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.BEAD,
    drop: (item) => {
      if (item.fromSelector) {
        onBeadDrop(item.color, index, true);
      } else {
        onBeadDrop(item.index, index, false);
      }
    },
    canDrop: () => true,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  // Animation for drop target
  let dropGlow = '';
  if (isOver && canDrop) {
    dropGlow = `0 0 18px 8px ${bead.color !== '#ccc' ? bead.color : '#aaa'}`;
  }

  return (
    <circle
      ref={node => {
        drop(node);
        dropRef.current = node;
      }}
      cx={cx}
      cy={cy}
      r="28"
      fill={bead.color}
      stroke="#444"
      strokeWidth="2.5"
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
      style={{
        cursor: 'pointer',
        filter: dropGlow ? `drop-shadow(${dropGlow})` : undefined,
        transition: 'filter 0.2s, fill 0.2s',
      }}
    />
  );
}

function BraceletCanvas({ bracelet, onBeadClick, onBeadDrop, paletteBeads }) {
  const width = 600;
  const height = 600;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 210;

  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteAnchor, setPaletteAnchor] = useState({ x: 0, y: 0 });
  const closeTimeout = useRef(null);
  const beadDomRef = useRef(null);

  // Open palette when bead is hovered
  const handleBeadHover = (index, cx, cy) => {
    setHoveredIndex(index);
    setPaletteOpen(true);
    // Convert SVG (cx, cy) to screen coordinates
    const svg = document.querySelector('svg');
    if (svg) {
      const pt = svg.createSVGPoint();
      pt.x = cx + 32; // offset to the right of the bead
      pt.y = cy;
      const screenCTM = svg.getScreenCTM();
      if (screenCTM) {
        const transformed = pt.matrixTransform(screenCTM);
        setPaletteAnchor({ x: transformed.x, y: transformed.y - 40 });
      }
    }
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  };
  // Close palette with delay
  const handleBeadUnhover = () => {
    closeTimeout.current = setTimeout(() => {
      setPaletteOpen(false);
      setHoveredIndex(null);
    }, 180);
  };
  const handlePaletteEnter = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setPaletteOpen(true);
  };
  const handlePaletteLeave = () => {
    closeTimeout.current = setTimeout(() => {
      setPaletteOpen(false);
      setHoveredIndex(null);
    }, 180);
  };
  // Click to set color directly
  const handlePaletteSelect = (color) => {
    if (hoveredIndex !== null) {
      onBeadDrop(color, hoveredIndex, true);
      setPaletteOpen(false);
      setHoveredIndex(null);
    }
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} style={{ border: '1px solid #ccc', background: '#f7fafc', borderRadius: '50%' }}>
        {bracelet.map((bead, index) => {
          const angle = (2 * Math.PI * index) / bracelet.length;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          return (
            <Bead
              key={index}
              bead={bead}
              index={index}
              cx={x}
              cy={y}
              onBeadDrop={onBeadDrop}
              onHover={() => handleBeadHover(index, x, y)}
              onUnhover={handleBeadUnhover}
              dropRef={beadDomRef}
            />
          );
        })}
      </svg>
      <SidePalette
        beads={paletteBeads}
        visible={paletteOpen && hoveredIndex !== null}
        x={paletteAnchor.x}
        y={paletteAnchor.y}
        onMouseEnter={handlePaletteEnter}
        onMouseLeave={handlePaletteLeave}
        onSelect={handlePaletteSelect}
      />
    </div>
  );
}

export default BraceletCanvas;
