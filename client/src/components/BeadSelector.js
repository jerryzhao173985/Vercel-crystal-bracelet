import React from 'react';
import { useDrag } from 'react-dnd';

const ItemTypes = {
  BEAD: 'bead',
};

function DraggableBead({ bead, index }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BEAD,
    item: { color: bead.color, fromSelector: true },
    canDrag: true,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [bead]);

  return (
    <div
      ref={drag}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: bead.color,
        cursor: 'grab',
        border: '2px solid #000',
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? '0 0 16px 4px ' + bead.color : undefined,
        transition: 'box-shadow 0.2s, opacity 0.2s',
      }}
      title={bead.color}
    />
  );
}

function BeadSelector({ beads }) {
  return (
    <div
      style={{
        display: 'inline-block',
        verticalAlign: 'top',
        padding: '10px',
        border: '1px solid #aaa',
        marginTop: '20px',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <h2 style={{marginTop: 0}}>选择一个珠子颜色</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {beads.map((b, idx) => (
          <DraggableBead key={b.id} bead={b} index={idx} />
        ))}
      </div>
    </div>
  );
}

export default BeadSelector;
