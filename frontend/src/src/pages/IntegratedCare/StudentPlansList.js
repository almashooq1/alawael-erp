import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Avatar,
  Box,
  Typography,
} from '@mui/material';
import { Visibility, Edit } from '@mui/icons-material';

const mockPlans = [
  { id: 1, name: 'Ahmed Ali', type: 'Comprehensive', status: 'ACTIVE', domains: ['Speech', 'Academic'], progress: 45 },
  { id: 2, name: 'Sara Mohammed', type: 'Therapeutic Only', status: 'REVIEW', domains: ['OT', 'PT'], progress: 70 },
  { id: 3, name: 'Khalid Omar', type: 'Life Skills', status: 'ACTIVE', domains: ['Self Care', 'Social'], progress: 20 },
];

function StudentPlansList() {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Student</TableCell>
            <TableCell>Plan Type</TableCell>
            <TableCell>Active Domains</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Progress</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {mockPlans.map(plan => (
            <TableRow key={plan.id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ mr: 2 }}>{plan.name[0]}</Avatar>
                  <Typography variant="subtitle2">{plan.name}</Typography>
                </Box>
              </TableCell>
              <TableCell>{plan.type}</TableCell>
              <TableCell>
                {plan.domains.map(d => (
                  <Chip key={d} label={d} size="small" sx={{ mr: 0.5 }} />
                ))}
              </TableCell>
              <TableCell>
                <Chip label={plan.status} color={plan.status === 'ACTIVE' ? 'success' : 'warning'} size="small" />
              </TableCell>
              <TableCell>{plan.progress}%</TableCell>
              <TableCell>
                <IconButton size="small">
                  <Visibility />
                </IconButton>
                <IconButton size="small">
                  <Edit />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default StudentPlansList;
