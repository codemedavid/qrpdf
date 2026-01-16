import { useState, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import {
  Grid3X3,
  Upload,
  Download,
  Image as ImageIcon,
  X,
  Settings2,
  FileText,
  Rows3,
  Columns3,
  Maximize,
  Scissors,
  FileDown,
  FileImage,
  ZoomIn,
} from 'lucide-react';
import './App.css';

// Page size presets (width x height in mm)
const PAGE_SIZES = {
  a4: { name: 'A4', width: 210, height: 297 },
  letter: { name: 'Letter', width: 216, height: 279 },
  legal: { name: 'Legal', width: 216, height: 356 },
  a5: { name: 'A5', width: 148, height: 210 },
  a3: { name: 'A3', width: 297, height: 420 },
  custom: { name: 'Custom', width: 210, height: 297 },
};

function App() {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState({
    columns: 4,
    rows: 5,
    margin: 10, // mm
    imageScale: 95, // percentage of cell size (1-100)
    pageSize: 'a4',
    pageWidth: 210,
    pageHeight: 297,
  });

  const fileInputRef = useRef(null);

  const totalImages = config.columns * config.rows;
  const usableWidth = config.pageWidth - 2 * config.margin;
  const usableHeight = config.pageHeight - 2 * config.margin;
  const cellWidth = (usableWidth / config.columns).toFixed(1);
  const cellHeight = (usableHeight / config.rows).toFixed(1);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImage(file);
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      loadImage(file);
    }
  };

  const loadImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target.result);
      const img = new Image();
      img.onload = () => {
        setImage({
          element: img,
          width: img.width,
          height: img.height,
          name: file.name,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfigChange = (key, value) => {
    if (key === 'pageSize') {
      const preset = PAGE_SIZES[value];
      setConfig((prev) => ({
        ...prev,
        pageSize: value,
        pageWidth: preset.width,
        pageHeight: preset.height,
      }));
    } else if (key === 'pageWidth' || key === 'pageHeight') {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue > 0) {
        setConfig((prev) => ({
          ...prev,
          [key]: numValue,
          pageSize: 'custom',
        }));
      }
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setConfig((prev) => ({ ...prev, [key]: numValue }));
      }
    }
  };

  const generatePDF = async () => {
    if (!image) return;

    setIsGenerating(true);

    try {
      // Create PDF with custom dimensions
      const pdf = new jsPDF({
        orientation: config.pageHeight > config.pageWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [config.pageWidth, config.pageHeight],
      });

      const { columns, rows, margin, pageWidth, pageHeight, imageScale } = config;
      const scaleFactor = imageScale / 100; // Convert percentage to decimal

      const usableW = pageWidth - 2 * margin;
      const usableH = pageHeight - 2 * margin;
      const cellW = usableW / columns;
      const cellH = usableH / rows;

      // Calculate scale to fit cell (maintaining aspect ratio)
      const imgAspect = image.width / image.height;
      const cellAspect = cellW / cellH;

      let drawW, drawH;
      if (imgAspect > cellAspect) {
        // Image is wider than cell
        drawW = cellW * scaleFactor;
        drawH = drawW / imgAspect;
      } else {
        // Image is taller than cell
        drawH = cellH * scaleFactor;
        drawW = drawH * imgAspect;
      }

      // Draw images in grid
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const cellX = margin + col * cellW;
          const cellY = margin + row * cellH;

          // Center image in cell
          const x = cellX + (cellW - drawW) / 2;
          const y = cellY + (cellH - drawH) / 2;

          pdf.addImage(imageUrl, 'JPEG', x, y, drawW, drawH);
        }
      }

      // Draw dashed cut lines
      pdf.setLineWidth(0.2);
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineDashPattern([2, 2], 0);

      // Vertical inner lines
      for (let col = 1; col < columns; col++) {
        const x = margin + col * cellW;
        pdf.line(x, margin, x, margin + usableH);
      }

      // Horizontal inner lines
      for (let row = 1; row < rows; row++) {
        const y = margin + row * cellH;
        pdf.line(margin, y, margin + usableW, y);
      }

      // Download PDF
      pdf.save(`grid_${columns}x${rows}_${totalImages}pcs.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate preview margin percentage
  const previewMargin = ((config.margin / config.pageHeight) * 100).toFixed(1);
  const previewAspectRatio = config.pageWidth / config.pageHeight;

  return (
    <div className="app">
      <header className="header">
        <div className="logo-wrapper">
          <div className="logo-icon">
            <Grid3X3 size={28} />
          </div>
          <h1>Grid PDF Generator</h1>
        </div>
        <p>Create printable PDF grids with your images</p>
      </header>

      <main className="main-container">
        {/* Left Panel - Upload & Controls */}
        <div className="left-panel">
          <section className="glass-card">
            <h2 className="card-title">
              <Upload size={20} />
              Upload Image
            </h2>

            <div
              className={`upload-zone ${isDragging ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">
                <ImageIcon size={32} />
              </div>
              <p className="upload-text">
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="upload-hint">PNG, JPG, JPEG, GIF, WEBP</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="file-input"
                onChange={handleFileSelect}
              />
            </div>

            {image && (
              <div className="image-preview-container">
                <img src={imageUrl} alt="Preview" className="image-preview" />
                <button className="remove-image" onClick={removeImage}>
                  <X size={16} />
                </button>
              </div>
            )}
          </section>

          <section className="glass-card" style={{ marginTop: '1.5rem' }}>
            <h2 className="card-title">
              <Settings2 size={20} />
              Grid Settings
            </h2>

            <div className="controls-grid">
              <div className="control-group full-width">
                <label className="control-label">
                  <FileImage size={16} />
                  Page Size
                </label>
                <select
                  value={config.pageSize}
                  onChange={(e) => handleConfigChange('pageSize', e.target.value)}
                  className="control-input control-select"
                >
                  {Object.entries(PAGE_SIZES).map(([key, { name, width, height }]) => (
                    <option key={key} value={key}>
                      {name} {key !== 'custom' ? `(${width}×${height}mm)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {config.pageSize === 'custom' && (
                <>
                  <div className="control-group">
                    <label className="control-label">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="1000"
                      value={config.pageWidth}
                      onChange={(e) => handleConfigChange('pageWidth', e.target.value)}
                      className="control-input"
                    />
                  </div>

                  <div className="control-group">
                    <label className="control-label">
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="1000"
                      value={config.pageHeight}
                      onChange={(e) => handleConfigChange('pageHeight', e.target.value)}
                      className="control-input"
                    />
                  </div>
                </>
              )}

              <div className="control-group">
                <label className="control-label">
                  <Columns3 size={16} />
                  Columns
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.columns}
                  onChange={(e) => handleConfigChange('columns', e.target.value)}
                  className="control-input"
                />
              </div>

              <div className="control-group">
                <label className="control-label">
                  <Rows3 size={16} />
                  Rows
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.rows}
                  onChange={(e) => handleConfigChange('rows', e.target.value)}
                  className="control-input"
                />
              </div>

              <div className="control-group full-width">
                <label className="control-label">
                  <Maximize size={16} />
                  Margin (mm)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={config.margin}
                  onChange={(e) => handleConfigChange('margin', e.target.value)}
                  className="control-input"
                />
              </div>

              <div className="control-group full-width">
                <label className="control-label">
                  <ZoomIn size={16} />
                  Image Size: {config.imageScale}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={config.imageScale}
                  onChange={(e) => handleConfigChange('imageScale', e.target.value)}
                  className="control-input control-range"
                />
              </div>
            </div>

            <button
              className="generate-btn"
              onClick={generatePDF}
              disabled={!image || isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="pulse">Generating...</div>
                </>
              ) : (
                <>
                  <Download size={20} />
                  Generate PDF
                </>
              )}
            </button>
          </section>
        </div>

        {/* Right Panel - Preview */}
        <section className="glass-card">
          <h2 className="card-title">
            <FileText size={20} />
            Preview
          </h2>

          <div
            className="preview-wrapper"
            style={{
              '--preview-margin': `${previewMargin}%`,
              aspectRatio: `${config.pageWidth} / ${config.pageHeight}`,
            }}
          >
            {image ? (
              <div className="preview-page">
                <div
                  className="preview-grid"
                  style={{
                    gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
                    gridTemplateRows: `repeat(${config.rows}, 1fr)`,
                  }}
                >
                  {Array.from({ length: totalImages }).map((_, i) => (
                    <div key={i} className="preview-cell">
                      <img
                        src={imageUrl}
                        alt=""
                        style={{
                          maxWidth: `${config.imageScale}%`,
                          maxHeight: `${config.imageScale}%`
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Cut Lines */}
                <div className="cut-lines">
                  {Array.from({ length: config.rows - 1 }).map((_, i) => (
                    <div
                      key={`h-${i}`}
                      className="cut-line horizontal"
                      style={{
                        top: `calc(${previewMargin}% + ${((i + 1) / config.rows) * (100 - 2 * parseFloat(previewMargin))}%)`,
                      }}
                    />
                  ))}
                  {Array.from({ length: config.columns - 1 }).map((_, i) => (
                    <div
                      key={`v-${i}`}
                      className="cut-line vertical"
                      style={{
                        left: `calc(${previewMargin}% + ${((i + 1) / config.columns) * (100 - 2 * parseFloat(previewMargin))}%)`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-preview">
                <ImageIcon size={48} />
                <p>Upload an image to see preview</p>
              </div>
            )}
          </div>

          <div className="stats">
            <div className="stat">
              <Grid3X3 size={16} />
              <span className="stat-value">{totalImages}</span> images
            </div>
            <div className="stat">
              <Scissors size={16} />
              <span className="stat-value">
                {cellWidth} × {cellHeight}
              </span>{' '}
              mm each
            </div>
            <div className="stat">
              <FileDown size={16} />
              {PAGE_SIZES[config.pageSize].name} ({config.pageWidth} × {config.pageHeight} mm)
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          Built with React & jsPDF • Generates print-ready PDFs with dashed
          cut lines
        </p>
      </footer>
    </div>
  );
}

export default App;
