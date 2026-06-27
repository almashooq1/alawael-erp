const ICFAssessment = require('../models/assessment/ICFAssessment');
const Document = require('../models/Document');
const Beneficiary = require('../models/Beneficiary');

async function exportAssessmentToDocument(assessmentId, userId) {
  try {
    console.log(`[icfReportExport] Starting export for assessment ${assessmentId} by user ${userId}`);

    // Step 1: Find the ICF assessment by ID, populate beneficiary and assessor
    const assessment = await ICFAssessment.findById(assessmentId)
      .populate('beneficiary', 'name fullName firstName lastName')
      .populate('assessor', 'name fullName firstName lastName');

    // Step 2: If not found, return error
    if (!assessment) {
      console.error(`[icfReportExport] Assessment not found: ${assessmentId}`);
      return { success: false, message: 'Assessment not found' };
    }

    const beneficiaryName = assessment.beneficiary?.name 
      || `${assessment.beneficiary?.firstName || ''} ${assessment.beneficiary?.lastName || ''}`.trim()
      || 'Unknown';

    const assessorName = assessment.assessor?.name 
      || `${assessment.assessor?.firstName || ''} ${assessment.assessor?.lastName || ''}`.trim()
      || userId;

    const assessmentDate = assessment.assessmentDate 
      ? new Date(assessment.assessmentDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0];

    // Step 3: Generate a JSON report object
    const scoresPerCode = {};
    if (assessment.scores && typeof assessment.scores === 'object') {
      // Handle Mongoose Map or plain object
      const entries = assessment.scores instanceof Map 
        ? Array.from(assessment.scores.entries()) 
        : Object.entries(assessment.scores);
      
      for (const [code, score] of entries) {
        scoresPerCode[code] = score;
      }
    }

    const report = {
      metadata: {
        assessmentId: assessment._id.toString(),
        assessmentDate: assessmentDate,
        assessorName: assessorName,
        beneficiaryName: beneficiaryName,
        beneficiaryId: assessment.beneficiary?._id?.toString() || null,
      },
      domainScores: {
        bodyFunctions: assessment.domainScores?.bodyFunctions || null,
        bodyStructures: assessment.domainScores?.bodyStructures || null,
        activities: assessment.domainScores?.activities || null,
        participation: assessment.domainScores?.participation || null,
        environmentalFactors: assessment.domainScores?.environmentalFactors || null,
      },
      overallScore: assessment.overallScore || null,
      scoresPerCode: scoresPerCode,
      recommendations: Array.isArray(assessment.recommendations) ? assessment.recommendations : [],
      generatedAt: new Date().toISOString(),
    };

    const reportJson = JSON.stringify(report, null, 2);
    const fileSize = Buffer.byteLength(reportJson, 'utf8');

    // Step 4: Create a new Document record
    const fileName = `icf-report-${assessmentId}-${Date.now()}.json`;
    const originalFileName = `ICF-Report-${beneficiaryName}-${assessmentDate}.json`;
    const filePath = `/uploads/icf-reports/icf-report-${assessmentId}.json`;
    const title = `تقرير تقييم ICF - ${beneficiaryName}`;
    const description = `تقرير التصنيف الدولي للأداء الوظيفي المولّد تلقائياً`;

    const documentData = {
      fileName: fileName,
      originalFileName: originalFileName,
      fileType: 'json',
      mimeType: 'application/json',
      fileSize: fileSize,
      filePath: filePath,
      title: title,
      description: description,
      category: 'تقارير',
      sourceModule: 'clinical',
      entityType: 'Beneficiary',
      entityId: assessment.beneficiary?._id?.toString() || '',
      folder: 'icf-reports',
      uploadedBy: userId,
      uploadedByName: assessorName,
      tags: ['ICF', 'تقييم', 'تقرير', ' clinical'],
    };

    console.log(`[icfReportExport] Creating document record: ${fileName}`);

    // Step 5: Save the document
    const doc = new Document(documentData);
    await doc.save();

    console.log(`[icfReportExport] Document saved successfully: ${doc._id}`);

    // Step 6: Return success response
    return {
      success: true,
      documentId: doc._id,
      message: 'Report saved to medical files',
    };

  } catch (error) {
    console.error('[icfReportExport] Error exporting assessment to document:', error.message);
    console.error(error.stack);
    return { success: false, message: error.message };
  }
}

module.exports = {
  exportAssessmentToDocument,
};
