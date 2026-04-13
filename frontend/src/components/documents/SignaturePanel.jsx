/**
 * SignaturePanel — لوحة التوقيع الرقمي
 * ═══════════════════════════════════════════
 * مكون شامل للتوقيع الإلكتروني مع دعم الرسم والطباعة
 */

import { useState, useRef, useCallback } from 'react';





// ── التوقيع بالرسم ──────────────────────────────

function DrawingCanvas({ onSave, width = 400, height = 160 }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const getCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const startDraw = useCallback(
    (e) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const { x, y } = getCoords(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    },
    [getCoords]
  );

  const draw = useCallback(
    (e) => {
      e.preventDefault();
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const { x, y } = getCoords(e);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a237e';
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasContent(true);
    },
    [isDrawing, getCoords]
  );

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  }, []);

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    const data = canvas.toDataURL('image/png');
    onSave(data);
  }, [onSave]);

  return (
    <Box>
      <Box
        sx={{
          border: '2px dashed',
          borderColor: isDrawing ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          overflow: 'hidden',
          cursor: 'crosshair',
          bgcolor: '#FAFAFA',
          transition: 'border-color 0.2s',
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<UndoIcon />}
          onClick={clear}
          disabled={!hasContent}
        >
          مسح
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<CheckIcon />}
          onClick={save}
          disabled={!hasContent}
        >
          حفظ التوقيع
        </Button>
      </Stack>
    </Box>
  );
}

// ── التوقيع بالكتابة ──────────────────────────────

function TypedSignature({ onSave, signerName = '' }) {
  const [text, setText] = useState(signerName);
  const [font, setFont] = useState(0);

  const fonts = [
    '"Noto Naskh Arabic", serif',
    '"Amiri", serif',
    'cursive',
    '"Cairo", sans-serif',
  ];

  return (
    <Box>
      <TextField
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اكتب توقيعك هنا..."
        variant="outlined"
        sx={{ mb: 2 }}
        inputProps={{ dir: 'rtl' }}
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {fonts.map((f, i) => (
          <Chip
            key={i}
            label={
              <span style={{ fontFamily: f, fontSize: 16 }}>{text || 'نموذج'}</span>
            }
            variant={font === i ? 'filled' : 'outlined'}
            color={font === i ? 'primary' : 'default'}
            onClick={() => setFont(i)}
            sx={{ height: 40 }}
          />
        ))}
      </Stack>

      <Box
        sx={{
          border: '2px solid',
          borderColor: 'grey.300',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          bgcolor: '#FAFAFA',
          minHeight: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: fonts[font],
            fontSize: 28,
            color: '#1a237e',
            userSelect: 'none',
          }}
        >
          {text || '...'}
        </Typography>
      </Box>

      <Box sx={{ mt: 1, textAlign: 'left' }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<CheckIcon />}
          onClick={() => onSave({ type: 'typed', text, font: fonts[font] })}
          disabled={!text.trim()}
        >
          حفظ التوقيع
        </Button>
      </Box>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════
//  المكون الرئيسي — SignaturePanel
// ══════════════════════════════════════════════════════════

export default function SignaturePanel({
  documentId,
  documentTitle,
  signatures = [],
  pendingSigners = [],
  onSign,
  onVerify,
  onRequestSignature,
  loading = false,
  canSign = true,
}) {
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [signTab, setSignTab] = useState(0);
  const [signatureData, setSignatureData] = useState(null);
  const [signingLoading, setSigning] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  // التوقيع
  const handleSign = async () => {
    if (!signatureData) return;
    setSigning(true);
    try {
      if (onSign) await onSign({ documentId, signatureData, signatureType: signTab === 0 ? 'drawn' : 'electronic' });
      setSignDialogOpen(false);
      setSignatureData(null);
    } catch (err) {
      console.error('خطأ في التوقيع:', err);
    } finally {
      setSigning(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        direction: 'rtl',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {/* العنوان */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          ✍️ التوقيعات الرقمية
        </Typography>
        <Stack direction="row" spacing={1}>
          {canSign && (
            <Button
              variant="contained"
              size="small"
              startIcon={<DrawIcon />}
              onClick={() => setSignDialogOpen(true)}
              disabled={loading}
            >
              وقّع المستند
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<SendIcon />}
            onClick={() => setRequestDialogOpen(true)}
            disabled={loading}
          >
            طلب توقيع
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* التوقيعات المكتملة */}
      {signatures.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            التوقيعات ({signatures.length})
          </Typography>
          <List dense disablePadding>
            {signatures.map((sig, i) => (
              <ListItem
                key={sig.id || i}
                sx={{
                  bgcolor: sig.isValid !== false ? '#E8F5E9' : '#FFEBEE',
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: sig.isValid !== false ? '#4CAF50' : '#F44336', width: 36, height: 36 }}>
                    {sig.isValid !== false ? <VerifiedIcon sx={{ fontSize: 20 }} /> : <WarningIcon sx={{ fontSize: 20 }} />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {sig.signerName || 'موقّع'}
                      </Typography>
                      <Chip
                        label={sig.signatureType === 'drawn' ? 'رسم' : 'إلكتروني'}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: 11 }}
                      />
                    </Box>
                  }
                  secondary={
                    sig.signedAt
                      ? new Date(sig.signedAt).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''
                  }
                />
                <ListItemSecondaryAction>
                  {onVerify && (
                    <Tooltip title="تحقق من التوقيع">
                      <IconButton size="small" onClick={() => onVerify(sig.id)}>
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          لا توجد توقيعات بعد على هذا المستند
        </Alert>
      )}

      {/* الموقّعون المنتظرون */}
      {pendingSigners.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'warning.main' }}>
            ⏳ بانتظار التوقيع ({pendingSigners.length})
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {pendingSigners.map((signer, i) => (
              <Chip
                key={i}
                avatar={<Avatar><PersonIcon /></Avatar>}
                label={signer.name || signer.email || 'موقّع'}
                variant="outlined"
                color="warning"
                size="small"
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* ── حوار التوقيع ── */}
      <Dialog
        open={signDialogOpen}
        onClose={() => setSignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { direction: 'rtl' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>توقيع المستند</DialogTitle>
        <DialogContent>
          {documentTitle && (
            <Alert severity="info" sx={{ mb: 2 }}>
              أنت على وشك التوقيع على: <strong>{documentTitle}</strong>
            </Alert>
          )}

          <Tabs
            value={signTab}
            onChange={(_, v) => {
              setSignTab(v);
              setSignatureData(null);
            }}
            sx={{ mb: 2 }}
          >
            <Tab icon={<DrawIcon />} label="رسم التوقيع" />
            <Tab icon={<TextIcon />} label="كتابة التوقيع" />
          </Tabs>

          {signTab === 0 && (
            <DrawingCanvas
              onSave={(data) => setSignatureData(data)}
            />
          )}

          {signTab === 1 && (
            <TypedSignature onSave={(data) => setSignatureData(data)} />
          )}

          {signatureData && (
            <Alert severity="success" sx={{ mt: 2 }}>
              ✅ تم حفظ التوقيع — اضغط "تأكيد التوقيع" للمتابعة
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignDialogOpen(false)} color="inherit">
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSign}
            disabled={!signatureData || signingLoading}
            startIcon={signingLoading ? <CircularProgress size={16} /> : <CheckIcon />}
          >
            تأكيد التوقيع
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── حوار طلب توقيع ── */}
      <Dialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { direction: 'rtl' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>طلب توقيع</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            أرسل طلب توقيع للمستخدمين المحددين
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="رسالة (اختياري)"
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder="أرجو التكرم بتوقيع المستند المرفق..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialogOpen(false)} color="inherit">
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => {
              if (onRequestSignature) onRequestSignature({ documentId, message: requestMessage });
              setRequestDialogOpen(false);
              setRequestMessage('');
            }}
          >
            إرسال الطلب
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
