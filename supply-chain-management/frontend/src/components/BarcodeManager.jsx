import React, { useState } from 'react';
import useBarcodeGeneration from '../hooks/useBarcodeGeneration';
import './BarcodeManager.css';

const BarcodeManager = () => {
  const {
    generatedCode,
    loading,
    error,
    batchProgress,
    generateQRCode,
    generateBarcode,
    generateBatch,
    downloadCode,
    clear,
  } = useBarcodeGeneration();

  const [activeMode, setActiveMode] = useState('qr'); // 'qr', 'barcode', 'batch'
  const [qrData, setQrData] = useState('');
  const [qrErrorLevel, setQrErrorLevel] = useState('M');
  const [barcodeData, setBarcodeData] = useState('');
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128');
  const [batchItems, setBatchItems] = useState([{ data: '', type: 'QR', format: 'CODE128' }]);

  // QR Code Handler
  const handleGenerateQR = async (e) => {
    e.preventDefault();
    if (!qrData.trim()) {
      alert('Please enter data for QR code');
      return;
    }
    await generateQRCode(qrData, qrErrorLevel);
  };

  // Barcode Handler
  const handleGenerateBarcode = async (e) => {
    e.preventDefault();
    if (!barcodeData.trim()) {
      alert('Please enter data for barcode');
      return;
    }
    await generateBarcode(barcodeData, barcodeFormat);
  };

  // Batch Handler
  const handleGenerateBatch = async (e) => {
    e.preventDefault();
    const validItems = batchItems.filter(item => item.data.trim());
    if (validItems.length === 0) {
      alert('Please enter at least one item');
      return;
    }
    await generateBatch(validItems);
  };

  const addBatchItem = () => {
    setBatchItems([...batchItems, { data: '', type: 'QR', format: 'CODE128' }]);
  };

  const removeBatchItem = (index) => {
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };

  const updateBatchItem = (index, field, value) => {
    const newItems = [...batchItems];
    newItems[index][field] = value;
    setBatchItems(newItems);
  };

  const handleDownload = () => {
    const filename = `${activeMode}-${Date.now()}.png`;
    downloadCode(filename);
  };

  return (
    <div className="barcode-manager">
      <header className="barcode-header">
        <h1>🎯 Barcode & QR Code Generator</h1>
        <p>Generate professional QR codes and barcodes for your supply chain</p>
      </header>

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeMode === 'qr' ? 'active' : ''}`}
          onClick={() => {
            setActiveMode('qr');
            clear();
          }}
        >
          <span className="icon">📱</span> QR Code
        </button>
        <button
          className={`tab ${activeMode === 'barcode' ? 'active' : ''}`}
          onClick={() => {
            setActiveMode('barcode');
            clear();
          }}
        >
          <span className="icon">📊</span> Barcode
        </button>
        <button
          className={`tab ${activeMode === 'batch' ? 'active' : ''}`}
          onClick={() => {
            setActiveMode('batch');
            clear();
          }}
        >
          <span className="icon">📦</span> Batch
        </button>
      </div>

      {/* Error Display */}
      {error && <div className="error-message">❌ Error: {error}</div>}

      {/* QR Code Mode */}
      {activeMode === 'qr' && (
        <div className="mode-content">
          <form onSubmit={handleGenerateQR}>
            <div className="form-group">
              <label>Data to encode:</label>
              <input
                type="text"
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="Enter text, URL, or product ID"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>Error Correction Level:</label>
              <select
                value={qrErrorLevel}
                onChange={(e) => setQrErrorLevel(e.target.value)}
                className="input-field"
              >
                <option value="L">L (7% recovery)</option>
                <option value="M">M (15% recovery)</option>
                <option value="Q">Q (25% recovery)</option>
                <option value="H">H (30% recovery)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '⏳ Generating...' : '✨ Generate QR Code'}
            </button>
          </form>
        </div>
      )}

      {/* Barcode Mode */}
      {activeMode === 'barcode' && (
        <div className="mode-content">
          <form onSubmit={handleGenerateBarcode}>
            <div className="form-group">
              <label>Data to encode:</label>
              <input
                type="text"
                value={barcodeData}
                onChange={(e) => setBarcodeData(e.target.value)}
                placeholder="Enter product code, SKU, or ID"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>Barcode Format:</label>
              <select
                value={barcodeFormat}
                onChange={(e) => setBarcodeFormat(e.target.value)}
                className="input-field"
              >
                <option value="CODE128">CODE128</option>
                <option value="CODE39">CODE39</option>
                <option value="EAN13">EAN13</option>
                <option value="UPC">UPC</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '⏳ Generating...' : '✨ Generate Barcode'}
            </button>
          </form>
        </div>
      )}

      {/* Batch Mode */}
      {activeMode === 'batch' && (
        <div className="mode-content">
          <form onSubmit={handleGenerateBatch}>
            <div className="batch-items">
              {batchItems.map((item, index) => (
                <div key={index} className="batch-item">
                  <input
                    type="text"
                    value={item.data}
                    onChange={(e) => updateBatchItem(index, 'data', e.target.value)}
                    placeholder="Enter data"
                    className="input-field"
                  />
                  <select
                    value={item.type}
                    onChange={(e) => updateBatchItem(index, 'type', e.target.value)}
                    className="input-field"
                  >
                    <option value="QR">QR</option>
                    <option value="BARCODE">Barcode</option>
                  </select>
                  <select
                    value={item.format}
                    onChange={(e) => updateBatchItem(index, 'format', e.target.value)}
                    className="input-field"
                    disabled={item.type === 'QR'}
                  >
                    <option value="CODE128">CODE128</option>
                    <option value="CODE39">CODE39</option>
                    <option value="EAN13">EAN13</option>
                    <option value="UPC">UPC</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeBatchItem(index)}
                    className="btn btn-danger"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addBatchItem}
              className="btn btn-secondary"
            >
              ➕ Add Item
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? `⏳ Progress ${batchProgress}%` : '✨ Generate Batch'}
            </button>
          </form>
        </div>
      )}

      {/* Generated Code Preview */}
      {generatedCode && (
        <div className="code-preview">
          <h3>✅ Generated Successfully!</h3>
          {generatedCode.type === 'BATCH' ? (
            <div className="batch-result">
              <p>Total: {generatedCode.totalItems} | Success: {generatedCode.successCount} | Errors: {generatedCode.errorCount}</p>
              <div className="batch-codes">
                {generatedCode.results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`batch-code ${result.status}`}
                  >
                    <p>Item {result.index}: {result.data}</p>
                    {result.status === 'success' && (
                      <img src={result.code} alt={`Code ${idx}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="single-code">
              <img src={generatedCode.code} alt="Generated Code" />
              <p className="code-data">{generatedCode.data}</p>
            </div>
          )}

          <div className="action-buttons">
            <button onClick={handleDownload} className="btn btn-success">
              ⬇️ Download
            </button>
            <button onClick={clear} className="btn btn-secondary">
              🔄 Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeManager;
