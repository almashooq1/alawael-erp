import React from 'react';

function Notification({ message, type = 'info', onClose }) {
  if (!message) return null;
  let color = '#2196f3';
  if (type === 'success') color = '#4caf50';
  if (type === 'error') color = '#f44336';
  if (type === 'warning') color = '#ff9800';

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        background: color,
        color: '#fff',
        padding: '14px 28px',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        minWidth: 220,
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 18,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  );
}

export default Notification;
