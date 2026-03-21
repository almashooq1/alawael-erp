/**
 * LeaveManagement — Constants & Configuration
 */

import { leaveColors, statusColors } from '../../theme/palette';
import SickIcon from '@mui/icons-material/Sick';
import TimerIcon from '@mui/icons-material/Timer';
import PersonIcon from '@mui/icons-material/Person';
import BalanceIcon from '@mui/icons-material/Balance';
import FlightIcon from '@mui/icons-material/Flight';
import PendingIcon from '@mui/icons-material/Pending';
import { LeaveIcon } from 'utils/iconAliases';

export const LEAVE_TYPES = [
  {
    value: 'annual',
    label: 'سنوية',
    icon: <VacationIcon sx={{ fontSize: 16 }} />,
    color: leaveColors.annual,
    maxDays: 30,
  },
  {
    value: 'sick',
    label: 'مرضية',
    icon: <SickIcon sx={{ fontSize: 16 }} />,
    color: leaveColors.sick,
    maxDays: 120,
  },
  {
    value: 'emergency',
    label: 'طارئة',
    icon: <TimerIcon sx={{ fontSize: 16 }} />,
    color: leaveColors.emergency,
    maxDays: 5,
  },
  {
    value: 'maternity',
    label: 'أمومة',
    icon: <PersonIcon sx={{ fontSize: 16 }} />,
    color: leaveColors.maternity,
    maxDays: 70,
  },
  {
    value: 'unpaid',
    label: 'بدون راتب',
    icon: <BalanceIcon sx={{ fontSize: 16 }} />,
    color: leaveColors.unpaid,
    maxDays: 15,
  },
  {
    value: 'hajj',
    label: 'حج',
    icon: <FlightIcon sx={{ fontSize: 16 }} />,
    color: statusColors.success,
    maxDays: 15,
  },
  {
    value: 'marriage',
    label: 'زواج',
    icon: <LeaveIcon sx={{ fontSize: 16 }} />,
    color: statusColors.purple,
    maxDays: 5,
  },
  {
    value: 'bereavement',
    label: 'وفاة',
    icon: <LeaveIcon sx={{ fontSize: 16 }} />,
    color: leaveColors.bereavement,
    maxDays: 5,
  },
];

export const LEAVE_TYPE_MAP = Object.fromEntries(LEAVE_TYPES.map(t => [t.value, t]));

export const STATUS_CONFIG = {
  approved: { label: 'موافق عليها', color: 'success', icon: <ApproveIcon sx={{ fontSize: 16 }} /> },
  pending: { label: 'قيد المراجعة', color: 'warning', icon: <PendingIcon sx={{ fontSize: 16 }} /> },
  rejected: { label: 'مرفوضة', color: 'error', icon: <RejectIcon sx={{ fontSize: 16 }} /> },
};

export const EMPTY_FORM = {
  employeeName: '',
  employeeId: '',
  leaveType: 'annual',
  startDate: '',
  endDate: '',
  reason: '',
  notes: '',
};

export const LEAVE_BALANCES = {
  annual: { total: 30, label: 'إجازة سنوية' },
  sick: { total: 120, label: 'إجازة مرضية' },
  emergency: { total: 5, label: 'إجازة طارئة' },
};
