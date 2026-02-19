/**
 * FileUpload.js
 * مكون React احترافي وقابل لإعادة الاستخدام لرفع الملفات مع دعم السحب والإفلات، معاينة الصور، حذف الملفات، إعادة رفع الملفات الفاشلة، مؤشرات تقدم وتحميل، رسائل نجاح/خطأ موحدة، والتحقق من نوع/حجم الملف.
 *
 * الميزات:
 * - سحب وإفلات أو اختيار الملفات من الجهاز
 * - معاينة فورية للصور (thumbnails)
 * - حذف أي ملف من القائمة قبل الرفع
 * - إعادة رفع الملفات الفاشلة بنقرة واحدة
 * - مؤشرات تقدم لكل ملف ومؤشر تحميل عام
 * - رسائل نجاح/خطأ موحدة وصديقة للمستخدم
 * - التحقق من نوع وحجم الملف مع رسائل خطأ واضحة
 *
 * الخصائص (Props):
 *   - url: رابط API لرفع الملفات (إجباري)
 *   - multiple: هل يسمح برفع عدة ملفات؟ (افتراضي: false)
 *   - accept: أنواع الملفات المسموحة (افتراضي: جميع الأنواع)
 *   - maxSizeMB: الحد الأقصى لحجم الملف بالميغابايت (افتراضي: 5)
 *   - maxFiles: الحد الأقصى لعدد الملفات (افتراضي: 5)
 *   - label: نص التسمية (افتراضي: 'اختر الملفات')
 *   - onSuccess: دالة تستدعى عند نجاح رفع ملف (اختياري)
 *   - onError: دالة تستدعى عند فشل رفع ملف (اختياري)

 * مثال الاستخدام:
 *   // راجع التوثيق أو README لاستخدام المكون في JSX
 */
// FileUpload.js - Reusable file upload with progress for SCM
import React, { useState, useRef, useId } from 'react';
import axios from 'axios';

export default function FileUpload({
  url,
  multiple = false,
  accept = '*/*',
  maxSizeMB = 5,
  onSuccess,
  onError,
  label = 'اختر الملفات',
  maxFiles = 5,
}) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [progress, setProgress] = useState({});
  const [status, setStatus] = useState({});
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef();
  const inputId = useId();

  const validateFiles = selected => {
    if (multiple && selected.length > maxFiles) {
      setError(`الحد الأقصى ${maxFiles} ملفات.`);
      return false;
    }
    for (let file of selected) {
      if (accept !== '*/*' && !file.type.match(accept.replace('*', '.*'))) {
        setError(`نوع الملف غير مدعوم: ${file.name}`);
        return false;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`الملف ${file.name} يتجاوز الحجم المسموح (${maxSizeMB}MB)`);
        return false;
      }
    }
    return true;
  };

  const handleSelect = e => {
    let selected = Array.from(e.target.files);
    if (!validateFiles(selected)) return;
    setFiles(selected);
    setError(null);
    setSuccessMsg('');
    setProgress({});
    setStatus({});
    // معاينة الصور
    const imgPreviews = selected.map(f => {
      const isImage =
        (f.type && f.type.startsWith('image/')) ||
        /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name || '');
      if (!isImage) return null;
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(f);
        return url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
      }
      return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    });
    setPreviews(imgPreviews);
  };

  // حذف ملف من القائمة
  const handleRemove = idx => {
    setFiles(f => f.filter((_, i) => i !== idx));
    setPreviews(p => p.filter((_, i) => i !== idx));
    setProgress(pr => {
      const copy = { ...pr };
      delete copy[idx];
      return copy;
    });
    setStatus(st => {
      const copy = { ...st };
      delete copy[idx];
      return copy;
    });
  };

  // Drag & Drop handlers
  const handleDrag = e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    let dropped = Array.from(e.dataTransfer.files);
    if (!validateFiles(dropped)) return;
    setFiles(dropped);
    setError(null);
    setSuccessMsg('');
    setProgress({});
    setStatus({});
    // معاينة الصور
    const imgPreviews = dropped.map(f => {
      const isImage =
        (f.type && f.type.startsWith('image/')) ||
        /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name || '');
      if (!isImage) return null;
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(f);
        return url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
      }
      return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    });
    setPreviews(imgPreviews);
  };

  const openFileDialog = () => {
    inputRef.current && inputRef.current.click();
  };

  const upload = async (onlyIdx = null) => {
    if (!files.length) return;
    setError(null);
    setSuccessMsg('');
    setLoading(true);
    const results = [];
    let allSuccess = true;
    const indices = onlyIdx !== null ? [onlyIdx] : files.map((_, i) => i);
    for (let i of indices) {
      const formData = new FormData();
      formData.append(multiple ? 'attachments' : 'image', files[i]);
      try {
        setStatus(s => ({ ...s, [i]: 'uploading' }));
        const res = await axios.post(url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: e =>
            setProgress(p => ({ ...p, [i]: Math.round((e.loaded * 100) / e.total) })),
        });
        setStatus(s => ({ ...s, [i]: 'success' }));
        results.push(res.data);
        onSuccess && onSuccess(res.data, i);
      } catch (err) {
        setStatus(s => ({ ...s, [i]: 'error' }));
        setError(err.response?.data?.error || 'فشل رفع بعض الملفات');
        onError && onError(err, i);
        allSuccess = false;
      }
    }
    setLoading(false);
    if (allSuccess && onlyIdx === null) setSuccessMsg('تم رفع جميع الملفات بنجاح ✅');
    else if (results.length && onlyIdx === null) setSuccessMsg('تم رفع بعض الملفات بنجاح');
  };

  return (
    <div style={{ margin: '8px 0', position: 'relative' }}>
      <label htmlFor={inputId} style={{ fontWeight: 500 }}>
        {label}
      </label>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        style={{
          border: dragActive ? '2px solid #1976d2' : '2px dashed #aaa',
          background: dragActive ? '#e3f2fd' : '#fafafa',
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          cursor: 'pointer',
          margin: '8px 0',
          transition: 'border 0.2s, background 0.2s',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleSelect}
          aria-label={label}
          style={{ display: 'none' }}
        />
        {dragActive ? 'إسحب الملفات هنا' : 'انقر أو اسحب الملفات هنا للرفع'}
      </div>
      {files.length > 0 && (
        <>
          {/* معاينة الصور */}
          {previews.some(Boolean) && (
            <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
              {previews.map((src, i) =>
                src ? (
                  <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={src}
                      alt={files[i]?.name || 'preview'}
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 6,
                        border: '1px solid #ccc',
                      }}
                    />
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemove(i);
                      }}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        background: '#fff',
                        border: '1px solid #aaa',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        cursor: 'pointer',
                        color: '#d32f2f',
                        fontWeight: 'bold',
                        padding: 0,
                        lineHeight: '18px',
                        textAlign: 'center',
                        zIndex: 2,
                      }}
                      title="حذف الصورة"
                    >
                      ×
                    </button>
                  </div>
                ) : null
              )}
            </div>
          )}
          <ul style={{ padding: 0, margin: 0 }}>
            {files.map((f, i) => (
              <li
                key={i}
                style={{
                  marginBottom: 4,
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span>
                  {f.name} - {Math.round(f.size / 1024)} KB
                </span>
                {status[i] === 'uploading' && (
                  <span style={{ marginLeft: 8 }}>{progress[i] || 0}%</span>
                )}
                {status[i] === 'success' && (
                  <span style={{ color: 'green', marginLeft: 8 }}>✔️</span>
                )}
                {status[i] === 'error' && (
                  <>
                    <span style={{ color: 'red', marginLeft: 8 }}>❌</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        upload(i);
                      }}
                      style={{
                        marginLeft: 8,
                        background: '#fff',
                        border: '1px solid #1976d2',
                        borderRadius: 4,
                        color: '#1976d2',
                        cursor: 'pointer',
                        fontSize: 12,
                        padding: '0 8px',
                        height: 24,
                      }}
                      title="إعادة الرفع"
                      disabled={loading}
                    >
                      إعادة الرفع
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleRemove(i);
                  }}
                  style={{
                    marginLeft: 8,
                    background: '#fff',
                    border: '1px solid #aaa',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    cursor: 'pointer',
                    color: '#d32f2f',
                    fontWeight: 'bold',
                    padding: 0,
                    lineHeight: '18px',
                    textAlign: 'center',
                  }}
                  title="حذف الملف"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {error && <div style={{ color: 'red', margin: '4px 0' }}>{error}</div>}
      {successMsg && <div style={{ color: 'green', margin: '4px 0' }}>{successMsg}</div>}
      <button
        type="button"
        onClick={upload}
        disabled={!files.length || loading}
        style={{ marginTop: 8 }}
      >
        {loading ? 'جاري الرفع...' : 'رفع'}
      </button>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 18, color: '#1976d2' }}>جاري رفع الملفات...</span>
        </div>
      )}
    </div>
  );
}
