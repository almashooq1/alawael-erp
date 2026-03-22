/**
 * PerformanceTable.jsx — Data table with cell renderer
 * Extracted from PerformanceEvaluation.js
 */
import React from 'react';
import {
  Typography,
  Paper,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  LinearProgress,
  Avatar,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DEPT_COLORS } from '../../constants/departmentColors';
import { statusColors, surfaceColors, neutralColors } from '../../theme/palette';
import { STATUS_CONFIG, RATING_CONFIG, COL_MAP } from './performanceEvaluation.constants';

/* ─── Cell Renderer ─── */
const renderCell = (col, value, _row) => {
  if (col === 'status') {
    const cfg = STATUS_CONFIG[value] || { label: value, color: 'default' };
    return <Chip label={cfg.label} size="small" color={cfg.color} />;
  }
  if (col === 'rating') {
    const cfg = RATING_CONFIG[value] || {};
    return (
      <Chip
        label={cfg.label || value}
        size="small"
        sx={{ bgcolor: cfg.bgcolor || surfaceColors.lightGray, color: cfg.color || neutralColors.textSecondary, fontWeight: 'bold' }}
      />
    );
  }
  if (col === 'overallScore') {
    const scoreColor = value >= 80 ? statusColors.success : value >= 60 ? statusColors.warning : statusColors.error;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(value, 100)}
          sx={{
            flex: 1,
            height: 8,
            borderRadius: 4,
            bgcolor: `${scoreColor}20`,
            '& .MuiLinearProgress-bar': { bgcolor: scoreColor, borderRadius: 4 },
          }}
        />
        <Typography variant="body2" fontWeight="bold" sx={{ color: scoreColor, minWidth: 36 }}>
          {value}%
        </Typography>
      </Box>
    );
  }
  if (col === 'department') {
    const color = DEPT_COLORS[value] || neutralColors.textSecondary;
    return (
      <Chip
        label={value}
        size="small"
        sx={{ bgcolor: `${color}15`, color, fontWeight: 'bold' }}
      />
    );
  }
  if (col === 'employee' || col === 'employeeName') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar
          sx={{ width: 28, height: 28, fontSize: 12, bgcolor: surfaceColors.infoLight, color: statusColors.primaryBlue }}
        >
          {(value || '')[0]}
        </Avatar>
        <Typography variant="body2" fontWeight="bold">
          {value}
        </Typography>
      </Box>
    );
  }
  if (col === 'autoAssign') {
    return value ? (
      <Chip label="تلقائي" size="small" color="success" />
    ) : (
      <Chip label="يدوي" size="small" color="default" />
    );
  }
  return <Typography variant="body2">{value?.toString() || '-'}</Typography>;
};

/* ─── Table Component ─── */
const PerformanceTable = ({ activeTab, tabs, data, openEdit, handleDelete }) => {
  const key = tabs[activeTab]?.key;
  const items = Array.isArray(data[key]) ? data[key] : [];
  const { cols, headers } = COL_MAP[key] || { cols: [], headers: [] };

  return (
    <TableContainer component={Paper} sx={{ mt: 2, borderRadius: 3 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            {headers.map((h, i) => (
              <TableCell key={i} sx={{ fontWeight: 'bold' }}>
                {h}
              </TableCell>
            ))}
            <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={cols.length + 1} align="center">
                <Typography color="text.secondary" py={3}>
                  لا توجد بيانات
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            items.map((row, idx) => (
              <TableRow key={row._id || idx} hover>
                {cols.map((col, i) => (
                  <TableCell key={i}>{renderCell(col, row[col], row)}</TableCell>
                ))}
                <TableCell>
                  <Tooltip title="تعديل">
                    <IconButton size="small" color="primary" onClick={() => openEdit(key, row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(key, row._id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PerformanceTable;
