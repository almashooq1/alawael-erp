// AI Compliance Risk Scoring Module
import ComplianceEvent from '../models/compliance-event';
import CompliancePolicy from '../models/compliance-policy';

/**
 * Calculate a risk score for each compliance policy based on recent events.
 * Score: 0 (no risk) to 100 (critical risk)
 * Factors: number of violations, recency, severity, unresolved issues
 */
export async function getComplianceRiskScores({ days = 30 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const policies = await CompliancePolicy.find().lean();
  const events = await ComplianceEvent.find({ timestamp: { $gte: since } }).lean();
  const scores: Array<{
    policy: string;
    riskScore: number;
    violations: number;
    lastViolation?: Date;
    unresolved: number;
    details: string;
  }> = [];
  for (const policy of policies) {
    const related = events.filter(e => e.policy === policy.name);
    const violations = related.filter(e => e.status === 'fail' || e.status === 'warning');
    const unresolved = violations.filter(e => !e.resolved).length;
    const lastViolation = violations.length ? violations[violations.length - 1].timestamp : undefined;
    // Simple scoring: more violations, more unresolved, more recent = higher risk
    let riskScore = 0;
    riskScore += violations.length * 10;
    riskScore += unresolved * 15;
    if (lastViolation) {
      const daysAgo = (Date.now() - new Date(lastViolation).getTime()) / (1000 * 60 * 60 * 24);
      riskScore += Math.max(0, 20 - daysAgo);
    }
    if (riskScore > 100) riskScore = 100;
    scores.push({
      policy: policy.name,
      riskScore: Math.round(riskScore),
      violations: violations.length,
      lastViolation,
      unresolved,
      details: `${violations.length} violations, ${unresolved} unresolved` + (lastViolation ? `, last: ${lastViolation}` : '')
    });
  }
  return scores.sort((a, b) => b.riskScore - a.riskScore);
}
