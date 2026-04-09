/**
 * Documents Pro Phase 9 Routes
 * دورة الحياة • التوقيع الرقمي • التصنيف الذكي • تنسيق سير العمل • التحليل الجنائي
 */

const express = require('express');
const router = express.Router();

/* ─── helpers ──────────────────────────────────────────── */
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const getUserId = req => req.user?.userId || req.user?.id || req.user?._id;

/* ─── auth middleware ──────────────────────────────────── */
let authMiddleware;
try {
  const auth = require('../../middleware/auth');
  authMiddleware = auth.authenticateToken || auth.default || auth.auth || auth;
} catch {
  authMiddleware = (req, _res, next) => next();
}

/* ─── services ─────────────────────────────────────────── */
let lifecycleSvc, digitalCertSvc, classificationSvc, workflowOrchSvc, forensicsSvc;
try {
  lifecycleSvc = require('../../services/documents/documentLifecycle.service');
} catch {
  lifecycleSvc = null;
}
try {
  digitalCertSvc = require('../../services/documents/documentDigitalCert.service');
} catch {
  digitalCertSvc = null;
}
try {
  classificationSvc = require('../../services/documents/documentClassification.service');
} catch {
  classificationSvc = null;
}
try {
  workflowOrchSvc = require('../../services/documents/documentWorkflowOrch.service');
} catch {
  workflowOrchSvc = null;
}
try {
  forensicsSvc = require('../../services/documents/documentForensics.service');
} catch {
  forensicsSvc = null;
}

const svc = s => {
  if (!s) throw new Error('الخدمة غير متوفرة');
  return s;
};

/* ══════════════════════════════════════════════════════════
   1. LIFECYCLE — دورة حياة المستند
   ══════════════════════════════════════════════════════════ */

// Policies
router.post(
  '/lifecycle/policies',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(lifecycleSvc).createPolicy(req.body, getUserId(req)),
      });
  })
);
router.get(
  '/lifecycle/policies',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: { policies: await svc(lifecycleSvc).getPolicies(req.query) } });
  })
);
router.get(
  '/lifecycle/policies/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(lifecycleSvc).getPolicy(req.params.id) });
  })
);
router.put(
  '/lifecycle/policies/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(lifecycleSvc).updatePolicy(req.params.id, req.body, getUserId(req)),
    });
  })
);
router.post(
  '/lifecycle/policies/:id/activate',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(lifecycleSvc).activatePolicy(req.params.id, getUserId(req)),
    });
  })
);
router.delete(
  '/lifecycle/policies/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await svc(lifecycleSvc).deletePolicy(req.params.id);
    res.json({ success: true, message: 'تم الحذف' });
  })
);

// Document Lifecycle
router.post(
  '/lifecycle/assign',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(lifecycleSvc).assignLifecycle(
          req.body.documentId,
          req.body.policyId,
          getUserId(req)
        ),
      });
  })
);
router.get(
  '/lifecycle/document/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(lifecycleSvc).getDocumentLifecycle(req.params.documentId),
    });
  })
);
router.post(
  '/lifecycle/document/:documentId/transition',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(lifecycleSvc).transitionPhase(
        req.params.documentId,
        req.body.targetPhase,
        getUserId(req),
        req.body.notes
      ),
    });
  })
);
router.post(
  '/lifecycle/document/:documentId/legal-hold',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(lifecycleSvc).setLegalHold(
        req.params.documentId,
        req.body.reason,
        getUserId(req)
      ),
    });
  })
);
router.post(
  '/lifecycle/document/:documentId/release-hold',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(lifecycleSvc).releaseLegalHold(req.params.documentId, getUserId(req)),
    });
  })
);
router.post(
  '/lifecycle/document/:documentId/extend-retention',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(lifecycleSvc).extendRetention(
        req.params.documentId,
        req.body.additionalDays,
        getUserId(req),
        req.body.reason
      ),
    });
  })
);
router.get(
  '/lifecycle/document/:documentId/timeline',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(lifecycleSvc).getTimeline(req.params.documentId) });
  })
);

// Disposition
router.post(
  '/lifecycle/disposition',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(lifecycleSvc).requestDisposition(
          req.body.documentId,
          req.body.method,
          req.body.reason,
          getUserId(req)
        ),
      });
  })
);
router.get(
  '/lifecycle/disposition',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { requests: await svc(lifecycleSvc).getDispositionRequests(req.query) },
    });
  })
);
router.post(
  '/lifecycle/disposition/:id/approve',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(lifecycleSvc).approveDisposition(
        req.params.id,
        getUserId(req),
        req.body.notes
      ),
    });
  })
);
router.post(
  '/lifecycle/disposition/:id/execute',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(lifecycleSvc).executeDisposition(req.params.id, getUserId(req)),
    });
  })
);

// Expiry
router.get(
  '/lifecycle/expiring',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { documents: await svc(lifecycleSvc).getExpiringDocuments(req.query.days || 30) },
    });
  })
);
router.get(
  '/lifecycle/retention-expiring',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { documents: await svc(lifecycleSvc).getRetentionExpiring(req.query.days || 30) },
    });
  })
);
router.post(
  '/lifecycle/auto-transition',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(lifecycleSvc).processAutoTransitions() });
  })
);
router.get(
  '/lifecycle/stats',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(lifecycleSvc).getStats() });
  })
);

/* ══════════════════════════════════════════════════════════
   2. DIGITAL CERTIFICATES — التوقيع الرقمي
   ══════════════════════════════════════════════════════════ */

// Certificates
router.post(
  '/digital-cert/generate',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(digitalCertSvc).generateCertificate(getUserId(req), req.body),
      });
  })
);
router.get(
  '/digital-cert/certificates',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { certificates: await svc(digitalCertSvc).getCertificates(getUserId(req), req.query) },
    });
  })
);
router.get(
  '/digital-cert/certificates/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(digitalCertSvc).getCertificate(req.params.id) });
  })
);
router.post(
  '/digital-cert/certificates/:id/revoke',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(digitalCertSvc).revokeCertificate(
        req.params.id,
        req.body.reason,
        getUserId(req)
      ),
    });
  })
);
router.post(
  '/digital-cert/certificates/:id/renew',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(digitalCertSvc).renewCertificate(req.params.id, getUserId(req)),
    });
  })
);

// Signing
router.post(
  '/digital-cert/sign',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(digitalCertSvc).signDocument(
          req.body.documentId,
          req.body.certificateId,
          getUserId(req),
          req.body
        ),
      });
  })
);
router.get(
  '/digital-cert/document/:documentId/signatures',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { signatures: await svc(digitalCertSvc).getDocumentSignatures(req.params.documentId) },
    });
  })
);
router.post(
  '/digital-cert/verify/:signatureId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(digitalCertSvc).verifySignature(req.params.signatureId),
    });
  })
);
router.post(
  '/digital-cert/document/:documentId/verify-all',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(digitalCertSvc).verifyAllSignatures(req.params.documentId),
    });
  })
);

// Signature Requests
router.post(
  '/digital-cert/requests',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(digitalCertSvc).createSignatureRequest(
          req.body.documentId,
          req.body.signers,
          req.body,
          getUserId(req)
        ),
      });
  })
);
router.get(
  '/digital-cert/requests',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { requests: await svc(digitalCertSvc).getSignatureRequests(req.query) },
    });
  })
);
router.post(
  '/digital-cert/requests/:id/process',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(digitalCertSvc).processSignatureRequest(
        req.params.id,
        getUserId(req),
        req.body.action,
        req.body
      ),
    });
  })
);
router.get(
  '/digital-cert/stats',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(digitalCertSvc).getStats(getUserId(req)) });
  })
);

/* ══════════════════════════════════════════════════════════
   3. CLASSIFICATION — التصنيف الذكي
   ══════════════════════════════════════════════════════════ */

// Models
router.post(
  '/classification/models',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(classificationSvc).createModel(req.body, getUserId(req)),
      });
  })
);
router.get(
  '/classification/models',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { models: await svc(classificationSvc).getModels(req.query) },
    });
  })
);
router.get(
  '/classification/models/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(classificationSvc).getModel(req.params.id) });
  })
);
router.put(
  '/classification/models/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(classificationSvc).updateModel(req.params.id, req.body),
    });
  })
);
router.post(
  '/classification/models/:id/activate',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(classificationSvc).activateModel(req.params.id) });
  })
);
router.post(
  '/classification/models/:id/train',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(classificationSvc).trainModel(req.params.id, req.body),
    });
  })
);

// Classification
router.post(
  '/classification/classify',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(classificationSvc).classifyDocument(
        req.body.documentId,
        req.body.modelId,
        req.body.text,
        getUserId(req)
      ),
    });
  })
);
router.post(
  '/classification/batch-classify',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(classificationSvc).batchClassify(
        req.body.documentIds,
        req.body.modelId,
        req.body.textsMap,
        getUserId(req)
      ),
    });
  })
);
router.get(
  '/classification/document/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(classificationSvc).getClassification(req.params.documentId),
    });
  })
);
router.get(
  '/classification/document/:documentId/history',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        history: await svc(classificationSvc).getClassificationHistory(req.params.documentId),
      },
    });
  })
);
router.post(
  '/classification/:resultId/feedback',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(classificationSvc).provideFeedback(
        req.params.resultId,
        req.body.feedback,
        req.body.correctedCategory
      ),
    });
  })
);

// Clustering
router.post(
  '/classification/clusters',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(classificationSvc).createCluster(req.body, getUserId(req)),
      });
  })
);
router.get(
  '/classification/clusters',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { clusters: await svc(classificationSvc).getClusters(req.query) },
    });
  })
);
router.get(
  '/classification/clusters/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(classificationSvc).getCluster(req.params.id) });
  })
);
router.post(
  '/classification/clusters/:id/add',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(classificationSvc).addToCluster(req.params.id, req.body.documentIds),
    });
  })
);
router.post(
  '/classification/clusters/:id/remove',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(classificationSvc).removeFromCluster(req.params.id, req.body.documentIds),
    });
  })
);
router.post(
  '/classification/auto-cluster',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(classificationSvc).autoCluster(req.body.texts, req.body.options),
    });
  })
);
router.post(
  '/classification/similar/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        similar: await svc(classificationSvc).findSimilarDocuments(
          req.params.documentId,
          req.body.text,
          req.body.limit
        ),
      },
    });
  })
);
router.get(
  '/classification/stats',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(classificationSvc).getStats() });
  })
);

/* ══════════════════════════════════════════════════════════
   4. WORKFLOW ORCHESTRATION — تنسيق سير العمل
   ══════════════════════════════════════════════════════════ */

// Definitions
router.post(
  '/workflow-orch/definitions',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(workflowOrchSvc).createDefinition(req.body, getUserId(req)),
      });
  })
);
router.get(
  '/workflow-orch/definitions',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { definitions: await svc(workflowOrchSvc).getDefinitions(req.query) },
    });
  })
);
router.get(
  '/workflow-orch/definitions/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(workflowOrchSvc).getDefinition(req.params.id) });
  })
);
router.put(
  '/workflow-orch/definitions/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(workflowOrchSvc).updateDefinition(req.params.id, req.body, getUserId(req)),
    });
  })
);
router.post(
  '/workflow-orch/definitions/:id/activate',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(workflowOrchSvc).activateDefinition(req.params.id, getUserId(req)),
    });
  })
);
router.post(
  '/workflow-orch/definitions/:id/clone',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(workflowOrchSvc).cloneDefinition(req.params.id, getUserId(req)),
    });
  })
);
router.post(
  '/workflow-orch/definitions/:id/validate',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(workflowOrchSvc).validateDefinition(req.params.id) });
  })
);
router.delete(
  '/workflow-orch/definitions/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await svc(workflowOrchSvc).deleteDefinition(req.params.id);
    res.json({ success: true, message: 'تم الحذف' });
  })
);

// Instances
router.post(
  '/workflow-orch/start',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(workflowOrchSvc).startInstance(
          req.body.definitionId,
          req.body,
          getUserId(req)
        ),
      });
  })
);
router.get(
  '/workflow-orch/instances',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { instances: await svc(workflowOrchSvc).getInstances(req.query) },
    });
  })
);
router.get(
  '/workflow-orch/instances/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(workflowOrchSvc).getInstance(req.params.id) });
  })
);
router.post(
  '/workflow-orch/instances/:id/complete-task',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(workflowOrchSvc).completeTask(
        req.params.id,
        req.body.nodeId,
        getUserId(req),
        req.body
      ),
    });
  })
);
router.post(
  '/workflow-orch/instances/:id/suspend',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(workflowOrchSvc).suspendInstance(
        req.params.id,
        getUserId(req),
        req.body.reason
      ),
    });
  })
);
router.post(
  '/workflow-orch/instances/:id/resume',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(workflowOrchSvc).resumeInstance(req.params.id, getUserId(req)),
    });
  })
);
router.post(
  '/workflow-orch/instances/:id/cancel',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(workflowOrchSvc).cancelInstance(
        req.params.id,
        getUserId(req),
        req.body.reason
      ),
    });
  })
);
router.post(
  '/workflow-orch/instances/:id/retry/:nodeId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(workflowOrchSvc).retryNode(req.params.id, req.params.nodeId, getUserId(req)),
    });
  })
);
router.get(
  '/workflow-orch/my-tasks',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { tasks: await svc(workflowOrchSvc).getMyTasks(getUserId(req)) },
    });
  })
);
router.get(
  '/workflow-orch/stats',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(workflowOrchSvc).getStats() });
  })
);

/* ══════════════════════════════════════════════════════════
   5. FORENSICS — التحليل الجنائي
   ══════════════════════════════════════════════════════════ */

// Integrity
router.post(
  '/forensics/integrity-check',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(forensicsSvc).checkIntegrity(
        req.body.documentId,
        req.body.content,
        getUserId(req)
      ),
    });
  })
);
router.post(
  '/forensics/compute-hashes',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(forensicsSvc).computeHashes(req.body.content) });
  })
);

// Chain of Custody
router.post(
  '/forensics/custody',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(forensicsSvc).addCustodyEntry(
        req.body.documentId,
        req.body.action,
        getUserId(req),
        { ipAddress: req.ip, userAgent: req.get('user-agent'), ...req.body.details }
      ),
    });
  })
);
router.get(
  '/forensics/custody/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(forensicsSvc).getChainOfCustody(req.params.documentId),
    });
  })
);
router.post(
  '/forensics/custody/:documentId/verify',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(forensicsSvc).verifyChainIntegrity(req.params.documentId),
    });
  })
);

// Analysis
router.post(
  '/forensics/analyze/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(forensicsSvc).runForensicAnalysis(req.params.documentId, getUserId(req)),
    });
  })
);
router.get(
  '/forensics/history/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: { records: await svc(forensicsSvc).getForensicHistory(req.params.documentId) },
    });
  })
);
router.get(
  '/forensics/timeline/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(forensicsSvc).reconstructTimeline(req.params.documentId),
    });
  })
);

// Alerts
router.get(
  '/forensics/alerts',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: { alerts: await svc(forensicsSvc).getAlerts(req.query) } });
  })
);
router.put(
  '/forensics/alerts/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(forensicsSvc).updateAlertStatus(
        req.params.id,
        req.body.status,
        req.body.resolution,
        getUserId(req)
      ),
    });
  })
);

// Policies
router.post(
  '/forensics/policies',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await svc(forensicsSvc).createPolicy(req.body, getUserId(req)),
      });
  })
);
router.get(
  '/forensics/policies',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: { policies: await svc(forensicsSvc).getPolicies() } });
  })
);
router.put(
  '/forensics/policies/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await svc(forensicsSvc).updatePolicy(req.params.id, req.body),
    });
  })
);
router.delete(
  '/forensics/policies/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await svc(forensicsSvc).deletePolicy(req.params.id);
    res.json({ success: true, message: 'تم الحذف' });
  })
);
router.get(
  '/forensics/stats',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await svc(forensicsSvc).getStats() });
  })
);

/* ── Dashboard ─────────────────────────────────────────── */
router.get(
  '/dashboard',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [lifecycle, digitalCert, classification, workflowOrch, forensics] = await Promise.all([
      lifecycleSvc?.getStats().catch(() => null),
      digitalCertSvc?.getStats().catch(() => null),
      classificationSvc?.getStats().catch(() => null),
      workflowOrchSvc?.getStats().catch(() => null),
      forensicsSvc?.getStats().catch(() => null),
    ]);
    res.json({
      success: true,
      data: { lifecycle, digitalCert, classification, workflowOrch, forensics },
    });
  })
);

module.exports = router;
