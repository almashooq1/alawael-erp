/**
 * TestWizardDialog – multi-step test wizard dialog
 */

import assessmentService from '../../services/assessmentService';
import { surfaceColors } from '../../theme/palette';
import { TEST_ICONS } from './constants';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography
} from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import CloseIcon from '@mui/icons-material/Close';
import DoneIcon from '@mui/icons-material/Done';

const TestWizardDialog = ({
  open, onClose,
  selectedTest, beneficiaries,
  selectedBeneficiary, onSelectBeneficiary,
  activeStep, answers,
  assessorNotes, onNotesChange,
  submitLoading,
  onAnswer, onNext, onBack, onSubmit,
  isStepComplete, getStepperSteps,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle sx={{ bgcolor: selectedTest?.color, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {selectedTest && (TEST_ICONS[selectedTest.icon] || <QuizIcon />)}
        <span>تطبيق {selectedTest?.name}</span>
      </Box>
      <IconButton onClick={onClose} sx={{ color: '#fff' }} aria-label="إغلاق">
        <CloseIcon />
      </IconButton>
    </DialogTitle>

    <DialogContent sx={{ pt: 3 }}>
      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3, mt: 1 }}>
        {getStepperSteps().map((label, idx) => (
          <Step key={label} completed={isStepComplete(idx)}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 0: Select Beneficiary */}
      {activeStep === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            اختر المستفيد الذي سيُطبّق عليه الاختبار ثم انتقل للخطوة التالية.
          </Alert>
          <FormControl fullWidth>
            <InputLabel>اختر المستفيد</InputLabel>
            <Select
              value={selectedBeneficiary}
              onChange={(e) => onSelectBeneficiary(e.target.value)}
              label="اختر المستفيد"
            >
              {beneficiaries.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name} — {b.age} سنة ({assessmentService.getDisabilityTypes()[b.disabilityType] || b.disabilityType})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Steps 1..N-1: Category questions */}
      {selectedTest?.categories.map((cat, catIdx) => {
        if (activeStep !== catIdx + 1) return null;
        return (
          <Box key={cat.key}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color={selectedTest.color}>
              {cat.name}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {cat.items.map((item) => (
              <Paper key={item.key} elevation={1} sx={{ p: 2, mb: 2 }}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {item.name}
                  </FormLabel>
                  <RadioGroup
                    row
                    value={String(answers[cat.key]?.[item.key] ?? -1)}
                    onChange={(e) => onAnswer(cat.key, item.key, e.target.value)}
                  >
                    {item.levels.map((level, lvlIdx) => (
                      <FormControlLabel
                        key={lvlIdx}
                        value={String(lvlIdx)}
                        control={<Radio size="small" />}
                        label={
                          <Chip
                            label={level}
                            size="small"
                            variant={answers[cat.key]?.[item.key] === lvlIdx ? 'filled' : 'outlined'}
                            color={answers[cat.key]?.[item.key] === lvlIdx ? 'primary' : 'default'}
                          />
                        }
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Paper>
            ))}
          </Box>
        );
      })}

      {/* Last Step: Review & Notes */}
      {selectedTest && activeStep === selectedTest.categories.length + 1 && (
        <Box>
          <Alert severity="success" icon={<DoneIcon />} sx={{ mb: 3 }}>
            تم الانتهاء من جميع فئات الاختبار. راجع النتائج ثم أرسل.
          </Alert>

          {selectedTest.categories.map((cat) => {
            const catItems = cat.items;
            const catTotalMax = catItems.reduce((s, item) => s + (item.levels.length - 1), 0);
            const catTotal = catItems.reduce((s, item) => {
              const v = answers[cat.key]?.[item.key];
              return s + (v >= 0 ? v : 0);
            }, 0);
            const pct = catTotalMax > 0 ? Math.round((catTotal / catTotalMax) * 100) : 0;
            return (
              <Paper key={cat.key} elevation={1} sx={{ p: 2, mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography fontWeight="bold">{cat.name}</Typography>
                  <Typography fontWeight="bold" color={selectedTest.color}>
                    {catTotal}/{catTotalMax} ({pct}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: surfaceColors.divider,
                    '& .MuiLinearProgress-bar': { bgcolor: selectedTest.color, borderRadius: 4 },
                  }}
                />
              </Paper>
            );
          })}

          <TextField
            label="ملاحظات وتوصيات المقيّم"
            multiline
            rows={3}
            fullWidth
            value={assessorNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="أدخل ملاحظاتك وتوصياتك..."
            sx={{ mt: 2 }}
          />
        </Box>
      )}
    </DialogContent>

    <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
      <Button disabled={activeStep === 0} onClick={onBack} startIcon={<BackIcon />}>
        السابق
      </Button>
      {selectedTest && activeStep < selectedTest.categories.length + 1 ? (
        <Button
          variant="contained"
          onClick={onNext}
          disabled={!isStepComplete(activeStep)}
          endIcon={<NextIcon />}
          sx={{ bgcolor: selectedTest?.color }}
        >
          التالي
        </Button>
      ) : (
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={submitLoading}
          startIcon={<DoneIcon />}
          sx={{ bgcolor: selectedTest?.color }}
        >
          {submitLoading ? 'جاري الحفظ...' : 'إرسال النتائج'}
        </Button>
      )}
    </DialogActions>
  </Dialog>
);

export default TestWizardDialog;
