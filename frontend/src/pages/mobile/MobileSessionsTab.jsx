/**
 * MobileSessionsTab.jsx — الجلسات
 * List of today's sessions with swipe actions, pull-to-refresh
 */
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  SwipeableDrawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as CompleteIcon,
  Schedule as RescheduleIcon,
  ChevronLeft as ChevronLeftIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { mockTodaySessions } from './mockData';

const statusConfig = {
  completed: { label: 'منجزة', color: 'success', bg: '#e8f5e9' },
  'in-progress': { label: 'جارية', color: 'warning', bg: '#fff3e0' },
  upcoming: { label: 'قادمة', color: 'info', bg: '#e3f2fd' },
};

const sessionTypeColors = {
  'علاج وظيفي': '#1976d2',
  'علاج نطقي': '#7b1fa2',
  'علاج سلوكي ABA': '#388e3c',
  'علاج فيزيائي': '#d32f2f',
  'جلسة جماعية': '#f57c00',
};

export default function MobileSessionsTab({ onRefresh, refreshing }) {
  const [sessions, setSessions] = useState(mockTodaySessions);
  const [selectedSession, setSelectedSession] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSwipe = (sessionId, direction) => {
    if (direction === 'left') {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: 'completed' } : s))
      );
    } else if (direction === 'right') {
      setSelectedSession(sessions.find((s) => s.id === sessionId));
      setDrawerOpen(true);
    }
  };

  const startSession = (id) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'in-progress' } : s))
    );
  };

  const completeSession = (id) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'completed' } : s))
    );
  };

  const grouped = sessions.reduce((acc, s) => {
    const key = s.status === 'completed' ? 'completed' : s.status === 'in-progress' ? 'in-progress' : 'upcoming';
    acc[key] = acc[key] || [];
    acc[key].push(s);
    return acc;
  }, {});

  const order = ['in-progress', 'upcoming', 'completed'];

  return (
    <Box sx={{ px: 2, py: 2, pb: 4 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
        جلسات اليوم
      </Typography>

      {order.map((groupKey) => {
        const groupSessions = grouped[groupKey] || [];
        if (groupSessions.length === 0) return null;
        const cfg = statusConfig[groupKey];

        return (
          <Box key={groupKey} sx={{ mb: 2.5 }}>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{
                display: 'inline-block',
                px: 1.5,
                py: 0.4,
                borderRadius: 2,
                bgcolor: cfg.bg,
                color: `${cfg.color}.dark`,
                mb: 1,
                fontFamily: 'Tajawal, Cairo, sans-serif',
              }}
            >
              {cfg.label} ({groupSessions.length})
            </Typography>

            <AnimatePresence>
              {groupSessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -200 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                >
                  <SwipeableSessionCard
                    session={session}
                    onSwipe={handleSwipe}
                    onStart={() => startSession(session.id)}
                    onComplete={() => completeSession(session.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </Box>
        );
      })}

      {/* Bottom Sheet for Reschedule */}
      <SwipeableDrawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        PaperProps={{ sx: { borderRadius: '20px 20px 0 0', px: 2, pt: 2, pb: 4 } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2 }} />
        </Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
          إعادة جدولة الجلسة
        </Typography>
        {selectedSession && (
          <>
            <Typography variant="body1" sx={{ mb: 1, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
              {selectedSession.beneficiaryName} — {selectedSession.type}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
              الوقت الحالي: {selectedSession.time}
            </Typography>
            <List>
              {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map((t) => (
                <ListItem key={t} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    sx={{ borderRadius: 2, minHeight: 52 }}
                    onClick={() => {
                      setSessions((prev) =>
                        prev.map((s) => (s.id === selectedSession.id ? { ...s, time: t } : s))
                      );
                      setDrawerOpen(false);
                    }}
                  >
                    <ListItemText primary={t} sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }} />
                    <ChevronLeftIcon fontSize="small" color="action" />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </SwipeableDrawer>
    </Box>
  );
}

/* ─── Swipeable Session Card ─────────────────────────────────────────── */
function SwipeableSessionCard({ session, onSwipe, onStart, onComplete }) {
  const [dragX, setDragX] = useState(0);
  const themeColor = sessionTypeColors[session.type] || '#757575';
  const isUpcoming = session.status === 'upcoming';
  const isInProgress = session.status === 'in-progress';

  const handleDragEnd = (_e, info) => {
    const threshold = 80;
    if (info.offset.x < -threshold) {
      onSwipe(session.id, 'left');
    } else if (info.offset.x > threshold) {
      onSwipe(session.id, 'right');
    }
    setDragX(0);
  };

  return (
    <Box sx={{ position: 'relative', mb: 1.5, overflow: 'hidden', borderRadius: 3 }}>
      {/* Swipe background actions */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          borderRadius: 3,
          bgcolor: dragX < 0 ? '#e8f5e9' : dragX > 0 ? '#fff3e0' : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        {dragX < 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#2e7d32' }}>
            <CompleteIcon />
            <Typography variant="body2" fontWeight={700}>إنجاز</Typography>
          </Box>
        )}
        {dragX > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ed6c02', ml: 'auto' }}>
            <Typography variant="body2" fontWeight={700}>إعادة جدولة</Typography>
            <RescheduleIcon />
          </Box>
        )}
      </Box>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDrag={(_e, info) => setDragX(info.offset.x)}
        onDragEnd={handleDragEnd}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            borderRight: `4px solid ${themeColor}`,
          }}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } } }>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: `${themeColor}22`, color: themeColor, fontWeight: 700 }}>
                {session.beneficiaryName.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" fontWeight={700} sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {session.beneficiaryName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {session.beneficiaryId}
                </Typography>
              </Box>
              <Chip
                label={statusConfig[session.status]?.label || session.status}
                size="small"
                color={statusConfig[session.status]?.color || 'default'}
                sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimeIcon fontSize="small" color="action" sx={{ fontSize: 16 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {session.time} · {session.duration} د
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationIcon fontSize="small" color="action" sx={{ fontSize: 16 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {session.room}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
              {session.goals.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.68rem', height: 22, fontFamily: 'Tajawal, Cairo, sans-serif' }}
                />
              ))}
            </Box>

            {isUpcoming && (
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                fullWidth
                onClick={onStart}
                sx={{ minHeight: 44, borderRadius: 2, fontWeight: 700, fontSize: '0.85rem', fontFamily: 'Tajawal, Cairo, sans-serif' }}
              >
                بدء الجلسة
              </Button>
            )}
            {isInProgress && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CompleteIcon />}
                fullWidth
                onClick={onComplete}
                sx={{ minHeight: 44, borderRadius: 2, fontWeight: 700, fontSize: '0.85rem', fontFamily: 'Tajawal, Cairo, sans-serif' }}
              >
                إنهاء الجلسة
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}
