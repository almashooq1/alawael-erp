import React, { useState } from 'react';

export default function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, maxWidth: 480 }}
      >
        <button
          onClick={onClose}
          style={{
            float: 'right',
            fontSize: 18,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
        <div style={{ clear: 'both' }} />
        {children}
      </div>
    </div>
  );
}
