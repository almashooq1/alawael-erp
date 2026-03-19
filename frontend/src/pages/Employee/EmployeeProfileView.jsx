/**
 * EmployeeProfileView.jsx — Profile view mode + shared SectionHeader
 * عرض بيانات الموظف في وضع العرض
 */
import {
  Typography, Grid, Box, Chip, Avatar, IconButton, DialogTitle,
  DialogContent, Tooltip, Divider,
} from '@mui/material';
import {
  Edit as EditIcon, Close as CloseIcon, Person as PersonIcon,
  Work as WorkIcon, Phone as PhoneIcon, Email as EmailIcon,
  Badge as BadgeIcon, CalendarMonth as CalendarIcon,
  Business as DeptIcon, Print as PrintIcon,
  Cake as BirthIcon, Flag as NatIcon, CreditCard as IdIcon,
  Home as HomeIcon, LocationCity as CityIcon, LocalHospital as EmergIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { STATUS_MAP, CONTRACT_TYPES, GENDERS, MARITAL_STATUS } from './employeeManagement.constants';
import { DEPT_COLORS } from '../../constants/departmentColors';
import { statusColors } from '../../theme/palette';

/* ─── Shared section header ─── */
export const SectionHeader = ({ icon, title, subtitle }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
    <Avatar sx={{ bgcolor: 'primary.lighter', color: 'primary.main', width: 36, height: 36 }}>
      {icon}
    </Avatar>
    <Box>
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </Box>
  </Box>
);

/* ─── Info row helper ─── */
const InfoRow = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.8 }}>
    <Avatar sx={{ width: 28, height: 28, bgcolor: 'action.hover', color: 'text.secondary' }}>{icon}</Avatar>
    <Box sx={{ minWidth: 120 }}><Typography variant="caption" color="text.secondary">{label}</Typography></Box>
    <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
  </Box>
);

/* ─── Profile view (view mode inside Dialog) ─── */
const EmployeeProfileView = ({ form: f, onClose, onEdit, onPrint }) => {
  const deptColor = DEPT_COLORS[f.department] || statusColors.primaryBlue;
  const st = STATUS_MAP[f.status] || STATUS_MAP.active;
  const contractLabel = CONTRACT_TYPES.find(c => c.value === f.contractType)?.label || f.contractType || '—';
  const genderLabel = GENDERS.find(g => g.value === f.gender)?.label || f.gender || '—';
  const maritalLabel = MARITAL_STATUS.find(m => m.value === f.maritalStatus)?.label || f.maritalStatus || '—';
  const totalSalary = (+f.basicSalary || 0) + (+f.housingAllowance || 0) + (+f.transportAllowance || 0) + (+f.otherAllowance || 0);

  return (
    <>
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{ background: `linear-gradient(135deg, ${deptColor}dd 0%, ${deptColor}99 100%)`, color: 'white', p: 3, position: 'relative' }}>
          <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 1 }}>
            <Tooltip title="طباعة"><IconButton size="small" sx={{ color: 'white' }} onClick={onPrint}><PrintIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="تعديل"><IconButton size="small" sx={{ color: 'white' }} onClick={onEdit}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="إغلاق"><IconButton size="small" sx={{ color: 'white' }} onClick={onClose}><CloseIcon fontSize="small" /></IconButton></Tooltip>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mt: 1 }}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: '#ffffff30', fontSize: 28, fontWeight: 700 }}>
              {(f.firstName || '?')[0]}{(f.lastName || '')[0]}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>{f.firstName} {f.lastName}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>{f.position || f.department}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip label={f.employeeNumber || '—'} size="small" sx={{ bgcolor: '#ffffff30', color: 'white' }} />
                <Chip label={st.label} size="small" color={st.color} />
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ py: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1.5 }}>البيانات الشخصية</Typography>
            <InfoRow icon={<PersonIcon sx={{ fontSize: 16 }} />} label="الجنس" value={genderLabel} />
            <InfoRow icon={<BirthIcon sx={{ fontSize: 16 }} />} label="تاريخ الميلاد" value={f.dateOfBirth} />
            <InfoRow icon={<NatIcon sx={{ fontSize: 16 }} />} label="الجنسية" value={f.nationality} />
            <InfoRow icon={<IdIcon sx={{ fontSize: 16 }} />} label="رقم الهوية" value={f.idNumber} />
            <InfoRow icon={<PersonIcon sx={{ fontSize: 16 }} />} label="الحالة الاجتماعية" value={maritalLabel} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1.5 }}>البيانات الوظيفية</Typography>
            <InfoRow icon={<DeptIcon sx={{ fontSize: 16 }} />} label="القسم" value={f.department} />
            <InfoRow icon={<WorkIcon sx={{ fontSize: 16 }} />} label="المنصب" value={f.position} />
            <InfoRow icon={<CalendarIcon sx={{ fontSize: 16 }} />} label="تاريخ التعيين" value={f.joinDate} />
            <InfoRow icon={<BadgeIcon sx={{ fontSize: 16 }} />} label="نوع العقد" value={contractLabel} />
            {f.contractEndDate && <InfoRow icon={<CalendarIcon sx={{ fontSize: 16 }} />} label="انتهاء العقد" value={f.contractEndDate} />}
          </Grid>
          <Grid item xs={12}><Divider /></Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1.5 }}>معلومات التواصل</Typography>
            <InfoRow icon={<PhoneIcon sx={{ fontSize: 16 }} />} label="الهاتف" value={f.phone} />
            <InfoRow icon={<EmailIcon sx={{ fontSize: 16 }} />} label="البريد" value={f.email} />
            <InfoRow icon={<HomeIcon sx={{ fontSize: 16 }} />} label="العنوان" value={f.address} />
            <InfoRow icon={<CityIcon sx={{ fontSize: 16 }} />} label="المدينة" value={f.city} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1.5 }}>الطوارئ والمالية</Typography>
            {(f.emergencyName || f.emergencyPhone) && (
              <>
                <InfoRow icon={<EmergIcon sx={{ fontSize: 16 }} />} label="جهة الطوارئ" value={f.emergencyName} />
                <InfoRow icon={<PhoneIcon sx={{ fontSize: 16 }} />} label="هاتف الطوارئ" value={f.emergencyPhone} />
              </>
            )}
            <InfoRow icon={<BankIcon sx={{ fontSize: 16 }} />} label="الراتب الأساسي" value={f.basicSalary ? `${Number(f.basicSalary).toLocaleString('ar-SA')} ر.س` : '—'} />
            {totalSalary > 0 && <InfoRow icon={<BankIcon sx={{ fontSize: 16 }} />} label="إجمالي الراتب" value={`${totalSalary.toLocaleString('ar-SA')} ر.س`} />}
            {f.bankName && <InfoRow icon={<BankIcon sx={{ fontSize: 16 }} />} label="البنك" value={f.bankName} />}
            {f.iban && <InfoRow icon={<IdIcon sx={{ fontSize: 16 }} />} label="IBAN" value={f.iban} />}
          </Grid>
        </Grid>
      </DialogContent>
    </>
  );
};

export default EmployeeProfileView;
