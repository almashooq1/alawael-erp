



import { useState } from 'react';
import assessmentService from 'services/assessmentService';
import { SCALE_ICONS } from './constants';

/* ── Auto-recommendation engine based on domain scores ── */
const generateAutoRecommendations = (scale, domainScores) => {
  if (!scale) return [];
  const recs = [];
  const scaleRecs = {
    motorFunction: {
      grossMotor: 'تكثيف تمارين الحركة الكبرى والمشي والجري',
      fineMotor: 'أنشطة الحركة الدقيقة: الرسم والقص والتركيب',
      balance: 'تمارين التوازن الثابت والديناميكي',
      coordination: 'تدريبات التنسيق بين العين واليد',
    },
    dailyLiving: {
      eating: 'تدريب على تناول الطعام باستقلالية',
      bathing: 'تدريب تدريجي على مهارات الاستحمام',
      dressing: 'استخدام ملابس معدلة للتدريب على اللبس',
      mobility: 'تدريب على التنقل الآمن مع أجهزة مساعدة',
      hygiene: 'برنامج نظافة شخصية يومي بالصور',
    },
    communication: {
      comprehension: 'أنشطة فهم القصص والتعليمات المتدرجة',
      expression: 'تمارين التعبير اللفظي والجمل الوظيفية',
      reading: 'برنامج قراءة وظيفية مدعوم بالصور',
      writing: 'تدريب على الكتابة الوظيفية والإملاء',
      nonVerbal: 'استخدام وسائل التواصل البديل (AAC)',
    },
    adaptiveBehavior: {
      socialSkills: 'برنامج مهارات اجتماعية جماعي',
      academicSkills: 'تدريب أكاديمي وظيفي مخصص',
      practicalSkills: 'تدريب على المهارات الحياتية العملية',
    },
    qualityOfLife: {
      physicalHealth: 'برنامج لياقة بدنية مكيّف',
      mentalHealth: 'جلسات دعم نفسي وإرشادي',
      socialRelations: 'أنشطة دمج اجتماعي',
      environment: 'تعديل البيئة لتلبية الاحتياجات',
    },
    sensoryProfile: {
      auditory: 'حمية حسية سمعية — تقليل الضوضاء البيئية',
      visual: 'تعديل الإضاءة وتقليل المثيرات البصرية',
      tactile: 'أنشطة لمسية تدريجية مع ضغط عميق',
      vestibular: 'تمارين الأرجوحة والتهدئة الدهليزية',
      proprioceptive: 'أنشطة الحس العميق: السحب والدفع',
      oralSensory: 'أدوات فموية حسية وأنشطة المضغ المنظمة',
    },
    cognitiveSkills: {
      attention: 'تمارين تركيز متدرجة مع تقليل المشتتات',
      memory: 'ألعاب تعزيز الذاكرة العاملة والبصرية',
      reasoning: 'أنشطة التفكير المنطقي والتصنيف',
      problemSolving: 'مواقف حل المشكلات التطبيقية',
      executiveFunction: 'تدريب التخطيط والتنظيم بالجدول البصري',
    },
    developmentalIntegration: {
      motorDev: 'تدخل مبكر حركي متعدد التخصصات',
      languageDev: 'جلسات نطق وتخاطب مكثفة',
      cognitiveDev: 'أنشطة تحفيز معرفي مناسبة للعمر',
      socialEmotional: 'برنامج تعلم اجتماعي عاطفي',
      selfHelp: 'تدريب استقلالية تدريجي بالمنزل',
    },
    painAssessment: {
      intensity: 'بروتوكول إدارة الألم الحاد مع طبيب التأهيل',
      frequency: 'علاج طبيعي وقائي لتقليل نوبات الألم',
      dailyImpact: 'تعديل الأنشطة اليومية وتوفير أدوات مساعدة',
      psychologicalImpact: 'دعم نفسي وتقنيات الاسترخاء والتأمل',
      copingStrategies: 'تدريب على استراتيجيات إدارة الألم الذاتية',
    },
    speechLanguageDetailed: {
      articulation: 'تمارين نطقية مكثفة مع أخصائي التخاطب',
      receptiveLanguage: 'أنشطة فهم اللغة المتدرجة بالصور والأوامر',
      expressiveLanguage: 'تدريب على بناء الجمل والتعبير اللفظي',
      pragmaticLanguage: 'مواقف تواصل اجتماعي حقيقية ومحاكاة',
      voiceQuality: 'تمارين تنفسية وإحماء صوتي يومي',
      swallowingFunction: 'تقييم وظيفة البلع مع أخصائي وتعديل القوام',
    },
    earlyChildhoodDevelopment: {
      grossMotor: 'تمارين حركية كبرى مناسبة للمرحلة العمرية',
      fineMotor: 'أنشطة لعب بالعجين والتلوين والتركيب',
      cognitiveDev: 'ألعاب تعليمية لتحفيز الإدراك والتصنيف',
      languageDev: 'قراءة القصص المصورة وتمارين النطق المبكر',
      socialEmotionalDev: 'لعب جماعي منظم لتنمية المهارات الاجتماعية',
      selfCare: 'تدريب تدريجي على الأكل واللبس والنظافة',
      playSkills: 'لعب تخيلي موجه ولعب تعاوني مع أقران',
    },
    specialEducationNeeds: {
      academicSkills: 'خطة تعليمية فردية (IEP) مع أهداف محددة',
      learningProcess: 'استراتيجيات تعلم متنوعة (بصرية، سمعية، حركية)',
      classroomBehavior: 'نظام تعزيز سلوكي إيجابي في الصف',
      socialInteraction: 'برنامج مهارات اجتماعية مع أقران داعمين',
      accommodationNeeds: 'توفير تعديلات بيئية وتقنية مساعدة مناسبة',
      transitionPlanning: 'خطة انتقالية مبكرة للمرحلة التعليمية التالية',
    },
    assistiveTechEffectiveness: {
      deviceUsability: 'تبسيط واجهة الجهاز وإعادة تعليم الاستخدام',
      functionalImprovement: 'مراجعة ملاءمة الجهاز واستبداله إن لزم',
      userSatisfaction: 'استطلاع رأي المستخدم وتعديل حسب التفضيلات',
      independenceGain: 'تدريب مكثف على الاستخدام المستقل',
      maintenanceAccess: 'توفير خدمات صيانة دورية وقطع غيار',
      trainingAdequacy: 'جلسات تدريب إضافية مع متابعة ميدانية',
    },
    caregiverBurden: {
      physicalBurden: 'توفير مساعد رعاية ثانوي وأدوات رفع',
      emotionalBurden: 'جلسات إرشاد نفسي ومجموعات دعم لمقدمي الرعاية',
      socialImpact: 'خدمات رعاية مؤقتة (Respite Care) لإتاحة وقت اجتماعي',
      financialStress: 'ربط بخدمات الدعم المالي والتأمين الاجتماعي',
      timeConstraints: 'جدولة مهام الرعاية وتوزيعها على أفراد الأسرة',
      supportSatisfaction: 'تعزيز شبكة الدعم المجتمعي والمؤسسي',
    },
    socialIntegrationReadiness: {
      communicationReadiness: 'تدريب على مهارات التواصل المجتمعي',
      socialSkills: 'برنامج تدريب اجتماعي تدريجي مع مواقف حقيقية',
      communityAccess: 'تسهيل الوصول إلى المرافق العامة والنقل',
      selfAdvocacy: 'تمكين المستفيد من التعبير عن احتياجاته وحقوقه',
      environmentalSupport: 'تعديل البيئة المحيطة لدعم الدمج',
      culturalParticipation: 'إشراك في أنشطة ثقافية ورياضية مجتمعية',
    },
  };

  const scaleDef = scaleRecs[scale.id];
  if (!scaleDef) return recs;

  scale.domains.forEach(domain => {
    const score = domainScores[domain.key] || 0;
    const pct = (score / domain.maxScore) * 100;
    if (pct < 50 && scaleDef[domain.key]) {
      recs.push(`${domain.name}: ${scaleDef[domain.key]}`);
    }
  });
  return recs;
};

/**
 * Dialog for conducting a new assessment: beneficiary select,
 * domain sliders with percentage badges, total/interpretation display,
 * auto-recommendations, notes, and submit.
 */
const AssessmentDialog = ({
  open,
  selectedScale,
  beneficiaries,
  selectedBeneficiary,
  domainScores,
  assessorNotes,
  submitLoading,
  getTotalScore,
  getInterpretation,
  onClose,
  onBeneficiaryChange,
  onDomainScoreChange,
  onNotesChange,
  onSubmit,
}) => {
  const [showRecs, setShowRecs] = useState(false);
  const autoRecs = generateAutoRecommendations(selectedScale, domainScores);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: selectedScale?.color,
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedScale && (SCALE_ICONS[selectedScale.icon] || <AssessmentIcon />)}
          <span>تطبيق {selectedScale?.name}</span>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }} aria-label="إغلاق">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Beneficiary select */}
        <FormControl fullWidth sx={{ mb: 3, mt: 1 }}>
          <InputLabel>اختر المستفيد</InputLabel>
          <Select
            value={selectedBeneficiary}
            onChange={(e) => onBeneficiaryChange(e.target.value)}
            label="اختر المستفيد"
          >
            {beneficiaries.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.name} — {b.age} سنة (
                {assessmentService.getDisabilityTypes()[b.disabilityType] || b.disabilityType})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Domain sliders with percentage badge */}
        {selectedScale?.domains.map((domain) => {
          const score = domainScores[domain.key] || 0;
          const pct = Math.round((score / domain.maxScore) * 100);
          const pctColor = pct < 25 ? '#d32f2f' : pct < 50 ? '#ed6c02' : pct < 75 ? '#0288d1' : '#2e7d32';
          return (
            <Paper key={domain.key} elevation={1} sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography fontWeight="bold">{domain.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    label={`${pct}%`}
                    size="small"
                    sx={{ bgcolor: pctColor, color: 'white', fontWeight: 'bold', minWidth: 48 }}
                  />
                  <Chip
                    label={`${score} / ${domain.maxScore}`}
                    size="small"
                    sx={{ bgcolor: selectedScale.color, color: 'white' }}
                  />
                </Box>
              </Box>
              <Slider
                value={score}
                min={0}
                max={domain.maxScore}
                step={1}
                onChange={(_, v) => onDomainScoreChange(domain.key, v)}
                valueLabelDisplay="auto"
                sx={{ color: selectedScale.color }}
              />
            </Paper>
          );
        })}

        {/* Total / interpretation */}
        {selectedScale && (
          <Alert severity="info" sx={{ mb: 2 }} icon={<BarChartIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">
              الدرجة الكلية: {getTotalScore()} / {selectedScale.maxScore} (
              {Math.round((getTotalScore() / selectedScale.maxScore) * 100)}%)
            </Typography>
            {(() => {
              const interp = getInterpretation(selectedScale, getTotalScore());
              return interp ? (
                <Chip
                  label={interp.label}
                  sx={{ bgcolor: interp.color, color: 'white', mt: 0.5 }}
                  size="small"
                />
              ) : null;
            })()}
          </Alert>
        )}

        {/* Auto-generated recommendations */}
        {autoRecs.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              size="small"
              startIcon={<TipsIcon />}
              onClick={() => setShowRecs(prev => !prev)}
              sx={{ color: selectedScale?.color, mb: 1 }}
            >
              توصيات تلقائية ({autoRecs.length})
            </Button>
            <Collapse in={showRecs}>
              <Alert severity="warning" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                <Typography variant="subtitle2" gutterBottom>
                  توصيات بناءً على المجالات التي تقل عن 50%:
                </Typography>
                <Box component="ul" sx={{ margin: 0, paddingInlineStart: '20px' }}>
                  {autoRecs.map((rec, i) => (
                    <li key={i}>
                      <Typography variant="body2">{rec}</Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            </Collapse>
          </Box>
        )}

        {/* Notes */}
        <TextField
          label="ملاحظات المقيّم"
          multiline
          rows={3}
          fullWidth
          value={assessorNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="أدخل ملاحظاتك وتوصياتك هنا..."
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={!selectedBeneficiary || submitLoading}
          sx={{ bgcolor: selectedScale?.color }}
        >
          {submitLoading ? 'جاري الحفظ...' : 'حفظ التقييم'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssessmentDialog;
