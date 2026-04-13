import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Avatar,
  IconButton,
  Button,
  TextField,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  Badge,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Comment as CommentIcon,
  Reply as ReplyIcon,
  ThumbUp,
  Favorite,
  EmojiEmotions,
  PushPin as PinIcon,
  CheckCircle,
  Cancel,
  Send as SendIcon,
  ExpandMore,
  ExpandLess,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert,
} from '@mui/icons-material';
import { commentsApi } from '../../services/documentProPhase3Service';
import logger from '../../utils/logger';

const REACTIONS = [
  { emoji: '👍', label: 'إعجاب' },
  { emoji: '❤️', label: 'حب' },
  { emoji: '😂', label: 'ضحك' },
  { emoji: '😮', label: 'دهشة' },
  { emoji: '😢', label: 'حزن' },
  { emoji: '😡', label: 'غضب' },
];

/* ═══════════════════════════════════════════════════
 *  Single Comment component
 * ═══════════════════════════════════════════════════ */
function CommentItem({ comment, onReply, onUpdate, onDelete, onReact, onResolve, onPin, depth = 0 }) {
  const [showReplies, setShowReplies] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [reactionAnchor, setReactionAnchor] = useState(null);

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    await onReply(comment._id, replyText);
    setReplyText('');
    setReplying(false);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await onUpdate(comment._id, { content: editText });
    setEditing(false);
  };

  const replies = comment.replies || [];
  const reactionCounts = {};
  (comment.reactions || []).forEach((r) => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  return (
    <Box sx={{ mr: depth * 4, mb: 1 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRight: comment.isPinned ? '3px solid #f59e0b' : comment.isResolved ? '3px solid #22c55e' : 'none',
          bgcolor: comment.isResolved ? 'rgba(34,197,94,0.04)' : 'transparent',
        }}
      >
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main' }}>
              {(comment.authorName || 'م')[0]}
            </Avatar>
            <Box>
              <Typography variant="subtitle2">{comment.authorName || 'مستخدم'}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(comment.createdAt).toLocaleString('ar-SA')}
                {comment.isEdited && ' (معدّل)'}
              </Typography>
            </Box>
            {comment.isPinned && (
              <Chip icon={<PinIcon />} label="مثبّت" size="small" color="warning" variant="outlined" />
            )}
            {comment.isResolved && (
              <Chip icon={<CheckCircle />} label="محلول" size="small" color="success" variant="outlined" />
            )}
          </Stack>
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreVert fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => { setEditing(true); setMenuAnchor(null); }}>
              <EditIcon fontSize="small" sx={{ ml: 1 }} /> تعديل
            </MenuItem>
            <MenuItem onClick={() => { onPin(comment._id); setMenuAnchor(null); }}>
              <PinIcon fontSize="small" sx={{ ml: 1 }} /> {comment.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
            </MenuItem>
            <MenuItem onClick={() => { onResolve(comment._id, !comment.isResolved); setMenuAnchor(null); }}>
              <CheckCircle fontSize="small" sx={{ ml: 1 }} /> {comment.isResolved ? 'إعادة فتح' : 'حل'}
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { onDelete(comment._id); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" sx={{ ml: 1 }} /> حذف
            </MenuItem>
          </Menu>
        </Stack>

        {/* Body */}
        {editing ? (
          <Stack direction="row" spacing={1} mt={1}>
            <TextField
              fullWidth size="small" multiline value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <Button size="small" onClick={handleSaveEdit}>حفظ</Button>
            <Button size="small" color="inherit" onClick={() => setEditing(false)}>إلغاء</Button>
          </Stack>
        ) : (
          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
            {comment.content}
          </Typography>
        )}

        {/* Reactions */}
        <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap" alignItems="center">
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <Chip
              key={emoji}
              label={`${emoji} ${count}`}
              size="small"
              variant="outlined"
              onClick={() => onReact(comment._id, emoji)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
          <Tooltip title="تفاعل">
            <IconButton size="small" onClick={(e) => setReactionAnchor(e.currentTarget)}>
              <EmojiEmotions fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={reactionAnchor} open={Boolean(reactionAnchor)} onClose={() => setReactionAnchor(null)}>
            <Stack direction="row" spacing={0.5} sx={{ px: 1 }}>
              {REACTIONS.map((r) => (
                <Tooltip key={r.emoji} title={r.label}>
                  <IconButton
                    size="small"
                    onClick={() => { onReact(comment._id, r.emoji); setReactionAnchor(null); }}
                  >
                    {r.emoji}
                  </IconButton>
                </Tooltip>
              ))}
            </Stack>
          </Menu>
        </Stack>

        {/* Actions */}
        <Stack direction="row" spacing={1} mt={1}>
          <Button size="small" startIcon={<ReplyIcon />} onClick={() => setReplying(!replying)}>
            رد
          </Button>
          {replies.length > 0 && (
            <Button size="small" onClick={() => setShowReplies(!showReplies)} endIcon={showReplies ? <ExpandLess /> : <ExpandMore />}>
              {replies.length} رد
            </Button>
          )}
        </Stack>

        {/* Reply input */}
        <Collapse in={replying}>
          <Stack direction="row" spacing={1} mt={1}>
            <TextField
              fullWidth
              size="small"
              placeholder="اكتب رداً..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitReply()}
            />
            <IconButton color="primary" onClick={handleSubmitReply}>
              <SendIcon />
            </IconButton>
          </Stack>
        </Collapse>
      </Paper>

      {/* Nested replies */}
      <Collapse in={showReplies}>
        {replies.map((reply) => (
          <CommentItem
            key={reply._id}
            comment={reply}
            onReply={onReply}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onReact={onReact}
            onResolve={onResolve}
            onPin={onPin}
            depth={depth + 1}
          />
        ))}
      </Collapse>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════
 *  CommentsPanel — Main export
 * ═══════════════════════════════════════════════════ */
export default function CommentsPanel({ documentId }) {
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const loadComments = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const [commRes, statsRes] = await Promise.all([
        commentsApi.getForDocument(documentId, { topLevelOnly: true }),
        commentsApi.getStats(documentId),
      ]);
      setComments(commRes.data?.comments ?? []);
      setStats(statsRes.data?.stats ?? null);
    } catch (err) {
      logger.error('Load comments error', err);
      setError('فشل تحميل التعليقات');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await commentsApi.add({ documentId, content: newComment, type: 'comment' });
      setNewComment('');
      loadComments();
    } catch (err) {
      logger.error('Add comment error', err);
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (parentId, content) => {
    try {
      await commentsApi.add({ documentId, content, parentId, type: 'reply' });
      loadComments();
    } catch (err) { logger.error(err); }
  };

  const handleUpdate = async (commentId, data) => {
    try {
      await commentsApi.update(commentId, data);
      loadComments();
    } catch (err) { logger.error(err); }
  };

  const handleDelete = async (commentId) => {
    try {
      await commentsApi.delete(commentId);
      loadComments();
    } catch (err) { logger.error(err); }
  };

  const handleReact = async (commentId, emoji) => {
    try {
      await commentsApi.addReaction(commentId, emoji);
      loadComments();
    } catch (err) { logger.error(err); }
  };

  const handleResolve = async (commentId, resolve) => {
    try {
      if (resolve) await commentsApi.resolve(commentId);
      else await commentsApi.unresolve(commentId);
      loadComments();
    } catch (err) { logger.error(err); }
  };

  const handlePin = async (commentId) => {
    try {
      await commentsApi.togglePin(commentId);
      loadComments();
    } catch (err) { logger.error(err); }
  };

  if (!documentId) return <Alert severity="info">اختر مستنداً لعرض التعليقات</Alert>;

  return (
    <Box dir="rtl">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CommentIcon color="primary" />
          <Typography variant="h6">التعليقات</Typography>
          {stats && (
            <Chip label={`${stats.totalComments ?? 0} تعليق`} size="small" color="primary" variant="outlined" />
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* New comment */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder="اكتب تعليقاً..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          sx={{ mb: 1 }}
        />
        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={posting ? <CircularProgress size={16} /> : <SendIcon />}
            onClick={handleAddComment}
            disabled={posting || !newComment.trim()}
          >
            إرسال
          </Button>
        </Stack>
      </Paper>

      {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}

      {/* Comments list */}
      <Stack spacing={1}>
        {comments.map((comment) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            onReply={handleReply}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onReact={handleReact}
            onResolve={handleResolve}
            onPin={handlePin}
          />
        ))}
        {!loading && comments.length === 0 && (
          <Typography color="text.secondary" textAlign="center" py={4}>
            لا توجد تعليقات بعد — كن أول من يعلّق 💬
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
