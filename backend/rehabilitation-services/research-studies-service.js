'use strict';

/**
 * خدمة الأبحاث والدراسات التأهيلية
 * Research & Studies Service
 *
 * إدارة الأبحاث والدراسات في مجال التأهيل
 * وتتبع نتائج العلاج وتحليل البيانات وإعداد المنشورات العلمية
 */

class ResearchStudiesService {
  constructor() {
    this.studies = new Map();
    this.participants = new Map();
    this.dataEntries = new Map();
    this.publications = new Map();
    this.counter = { study: 0, participant: 0, data: 0, pub: 0 };
  }

  /** إنشاء دراسة بحثية */
  async createStudy(data) {
    const id = `RES-${++this.counter.study}`;
    const study = {
      id,
      title: data.title || '',
      titleEn: data.titleEn || '',
      type: data.type || 'مقطعية',
      field: data.field || 'تأهيل',
      principalInvestigator: data.principalInvestigator || '',
      coInvestigators: data.coInvestigators || [],
      objectives: data.objectives || [],
      methodology: data.methodology || '',
      sampleSize: data.sampleSize || 0,
      inclusionCriteria: data.inclusionCriteria || [],
      exclusionCriteria: data.exclusionCriteria || [],
      ethicsApproval: data.ethicsApproval || 'قيد_المراجعة',
      funding: data.funding || { source: 'داخلي', amount: 0 },
      startDate: data.startDate || new Date(),
      expectedEndDate: data.expectedEndDate || null,
      status: 'تخطيط',
      currentParticipants: 0,
      createdDate: new Date(),
    };
    this.studies.set(id, study);
    return study;
  }

  /** تسجيل مشارك في الدراسة */
  async enrollParticipant(studyId, data) {
    const id = `RES-PART-${++this.counter.participant}`;
    const study = this.studies.get(studyId);
    if (study && study.currentParticipants >= study.sampleSize) {
      throw new Error('تم الوصول للحد الأقصى من المشاركين');
    }
    const participant = {
      id,
      studyId,
      beneficiaryId: data.beneficiaryId,
      consentSigned: data.consentSigned || false,
      consentDate: data.consentSigned ? new Date() : null,
      group: data.group || 'تجريبية',
      baselineData: data.baselineData || {},
      status: 'نشط',
      enrollmentDate: new Date(),
    };
    this.participants.set(id, participant);
    if (study) {
      study.currentParticipants++;
      this.studies.set(studyId, study);
    }
    return participant;
  }

  /** تسجيل بيانات بحثية */
  async recordData(studyId, data) {
    const id = `RES-DATA-${++this.counter.data}`;
    const entry = {
      id,
      studyId,
      participantId: data.participantId,
      timepoint: data.timepoint || 'خط_أساس',
      measures: data.measures || {},
      outcomes: data.outcomes || {},
      notes: data.notes || '',
      collectedBy: data.researcherId,
      date: new Date(),
    };
    this.dataEntries.set(id, entry);
    return entry;
  }

  /** تحليل بيانات الدراسة */
  async analyzeStudy(studyId) {
    const study = this.studies.get(studyId);
    const participants = [...this.participants.values()].filter(p => p.studyId === studyId);
    const entries = [...this.dataEntries.values()].filter(e => e.studyId === studyId);

    const groups = {};
    participants.forEach(p => {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p.id);
    });

    return {
      studyId,
      studyTitle: study?.title || '',
      totalParticipants: participants.length,
      activeParticipants: participants.filter(p => p.status === 'نشط').length,
      dataPoints: entries.length,
      groups: Object.keys(groups).map(g => ({
        name: g,
        count: groups[g].length,
        dataPoints: entries.filter(e => groups[g].includes(e.participantId)).length,
      })),
      completionRate:
        study?.sampleSize > 0 ? Math.round((participants.length / study.sampleSize) * 100) : 0,
      analysisDate: new Date(),
    };
  }

  /** إنشاء منشور علمي */
  async createPublication(data) {
    const id = `RES-PUB-${++this.counter.pub}`;
    const publication = {
      id,
      studyId: data.studyId,
      title: data.title || '',
      authors: data.authors || [],
      abstract: data.abstract || '',
      journal: data.journal || '',
      type: data.type || 'مقال_بحثي',
      status: 'مسودة',
      submissionDate: null,
      acceptanceDate: null,
      doi: null,
      createdDate: new Date(),
    };
    this.publications.set(id, publication);
    return publication;
  }

  /** تقرير البحث */
  async getResearchReport(studyId) {
    const study = this.studies.get(studyId) || {};
    const participants = [...this.participants.values()].filter(p => p.studyId === studyId);
    const entries = [...this.dataEntries.values()].filter(e => e.studyId === studyId);
    const pubs = [...this.publications.values()].filter(p => p.studyId === studyId);
    return {
      study,
      totalParticipants: participants.length,
      dataEntries: entries.length,
      publications: pubs.length,
      overallProgress:
        study.sampleSize > 0 ? Math.round((participants.length / study.sampleSize) * 100) : 0,
      reportDate: new Date(),
    };
  }
}

module.exports = { ResearchStudiesService };
