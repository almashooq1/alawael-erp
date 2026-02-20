import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { fetchAuditLog } from '../../services/auditService';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLog().then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Typography>جاري التحميل...</Typography>;

  return (
    <Box>
      <Typography variant="h5" mb={2}>سجل تدقيق تغييرات الصلاحيات والأدوار</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>التاريخ</TableCell>
              <TableCell>المستخدم</TableCell>
              <TableCell>العملية</TableCell>
              <TableCell>التفاصيل</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log, idx) => (
              <TableRow key={idx}>
                <TableCell>{log.date}</TableCell>
                <TableCell>{log.user}</TableCell>
                <TableCell><Chip label={log.action} color={log.action === 'تغيير صلاحيات' ? 'warning' : 'info'} /></TableCell>
                <TableCell>{log.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AuditLog;
