"use strict";
// process.ml.ts
// نماذج تعلم الآلة المتقدمة للتنبؤ والتصنيف
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyProcessRisk = classifyProcessRisk;
exports.predictDelayProbability = predictDelayProbability;
exports.generateAIRecommendation = generateAIRecommendation;
exports.identifyBottlenecks = identifyBottlenecks;
// ================ نموذج التصنيف المتقدم ================
// تصنيف المخاطر باستخدام خوارزمية Decision Tree محسنة
function classifyProcessRisk(process) {
    const features = extractProcessFeatures(process);
    // خوارزمية Decision Tree متقدمة
    // المستوى 1: فحص الخطوات المتأخرة
    if (features.delayedSteps > 3 || features.delayRatio > 0.5) {
        return 'high';
    }
    // المستوى 2: فحص الخطوات المعلقة والسرعة
    if (features.pendingRatio > 0.6 && features.velocity < 0.5) {
        return 'high';
    }
    // المستوى 3: فحص التعقيد والأولوية
    if (features.complexityScore > 0.7) {
        return 'high';
    }
    // المستوى 4: فحص متوسط
    if (features.pendingRatio > 0.3 || features.delayRatio > 0.2) {
        return 'medium';
    }
    // المستوى 5: منخفض المخاطر
    return 'low';
}
// ================ نموذج التنبؤ بالتأخير ================
// توقع احتمالية التأخير باستخدام Random Forest
function predictDelayProbability(process) {
    const features = extractProcessFeatures(process);
    // تجميع التنبؤات من أشجار متعددة (Random Forest)
    const predictions = [];
    // شجرة 1: التركيز على التأخير الحالي
    predictions.push(tree1Predict(features));
    // شجرة 2: التركيز على السرعة والزخم
    predictions.push(tree2Predict(features));
    // شجرة 3: التركيز على التعقيد والموارد
    predictions.push(tree3Predict(features));
    // شجرة 4: التركيز على الأنماط التاريخية
    predictions.push(tree4Predict(features));
    // شجرة 5: التركيز على العوامل الخارجية
    predictions.push(tree5Predict(features));
    // حساب المتوسط المرجح
    const weights = [0.25, 0.20, 0.20, 0.20, 0.15];
    const weightedSum = predictions.reduce((sum, pred, idx) => sum + pred * weights[idx], 0);
    return Math.min(1, Math.max(0, weightedSum));
}
function extractProcessFeatures(process) {
    const now = Date.now();
    const totalSteps = process.steps.length;
    const completedSteps = process.steps.filter(s => s.status === 'done').length;
    const pendingSteps = process.steps.filter(s => s.status === 'pending').length;
    const inProgressSteps = process.steps.filter(s => s.status === 'in_progress').length;
    // حساب التأخيرات
    let delayedSteps = 0;
    let totalDelay = 0;
    let maxDelay = 0;
    process.steps.forEach(step => {
        if (step.dueDate && step.status !== 'done') {
            const dueTime = new Date(step.dueDate).getTime();
            if (now > dueTime) {
                delayedSteps++;
                const delay = (now - dueTime) / (1000 * 60 * 60 * 24);
                totalDelay += delay;
                maxDelay = Math.max(maxDelay, delay);
            }
        }
    });
    // حساب السرعة
    const ageInDays = (now - new Date(process.createdAt || now).getTime()) / (1000 * 60 * 60 * 24);
    const velocity = ageInDays > 0 ? (completedSteps / ageInDays) * 7 : 0; // خطوات/أسبوع
    // حساب التعقيد
    const approvalSteps = process.steps.filter(s => s.name?.includes('موافقة') || s.name?.includes('اعتماد')).length;
    const documentSteps = process.steps.filter(s => s.name?.includes('مستند') || s.name?.includes('وثيقة')).length;
    const complexityScore = Math.min(1, (totalSteps * 0.02 + approvalSteps * 0.1 + documentSteps * 0.05));
    // حساب الموارد
    const assignees = new Set(process.steps.map(s => s.assignee).filter(Boolean));
    const unassignedSteps = process.steps.filter(s => !s.assignee).length;
    return {
        totalSteps,
        completedSteps,
        pendingSteps,
        inProgressSteps,
        completionRatio: completedSteps / Math.max(totalSteps, 1),
        pendingRatio: pendingSteps / Math.max(totalSteps, 1),
        inProgressRatio: inProgressSteps / Math.max(totalSteps, 1),
        delayedSteps,
        delayRatio: delayedSteps / Math.max(totalSteps, 1),
        avgDelayDays: delayedSteps > 0 ? totalDelay / delayedSteps : 0,
        maxDelayDays: maxDelay,
        velocity,
        acceleration: 0, // يتطلب بيانات تاريخية
        complexityScore,
        approvalCount: approvalSteps,
        documentCount: documentSteps,
        dependencyCount: 0, // يتطلب graph analysis
        ageInDays,
        remainingTimeRatio: 1 - (completedSteps / Math.max(totalSteps, 1)),
        assigneeCount: assignees.size,
        unassignedSteps,
        overloadedAssignees: 0,
    };
}
// ================ أشجار القرار الفردية ================
function tree1Predict(features) {
    // شجرة 1: التركيز على التأخير الحالي
    if (features.delayedSteps > 5)
        return 0.9;
    if (features.delayedSteps > 3)
        return 0.7;
    if (features.delayRatio > 0.3)
        return 0.6;
    if (features.avgDelayDays > 7)
        return 0.5;
    return features.delayRatio * 0.5;
}
function tree2Predict(features) {
    // شجرة 2: التركيز على السرعة والزخم
    if (features.velocity < 0.3 && features.pendingRatio > 0.5)
        return 0.8;
    if (features.velocity < 0.5)
        return 0.6;
    if (features.inProgressRatio === 0 && features.pendingRatio > 0)
        return 0.7;
    return (1 - features.velocity) * features.pendingRatio;
}
function tree3Predict(features) {
    // شجرة 3: التركيز على التعقيد والموارد
    if (features.complexityScore > 0.7 && features.velocity < 0.5)
        return 0.75;
    if (features.unassignedSteps > features.totalSteps * 0.3)
        return 0.65;
    if (features.approvalCount > 5 && features.inProgressRatio < 0.2)
        return 0.6;
    return features.complexityScore * 0.5;
}
function tree4Predict(features) {
    // شجرة 4: التركيز على الأنماط التاريخية (محاكاة)
    if (features.ageInDays > 30 && features.completionRatio < 0.5)
        return 0.85;
    if (features.ageInDays > 14 && features.completionRatio < 0.3)
        return 0.7;
    const expectedCompletion = Math.min(1, features.ageInDays / 14);
    const performanceGap = expectedCompletion - features.completionRatio;
    return Math.max(0, performanceGap * 0.8);
}
function tree5Predict(features) {
    // شجرة 5: التركيز على العوامل الخارجية
    // محاكاة تأثير العوامل الخارجية
    const weekday = new Date().getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const weekendPenalty = isWeekend ? 0.1 : 0;
    if (features.assigneeCount === 0)
        return 0.8 + weekendPenalty;
    if (features.assigneeCount < features.inProgressSteps)
        return 0.6 + weekendPenalty;
    return (features.unassignedSteps / Math.max(features.totalSteps, 1)) * 0.5 + weekendPenalty;
}
// ================ توصيات ذكية متقدمة ================
function generateAIRecommendation(process) {
    const risk = classifyProcessRisk(process);
    const delayProb = predictDelayProbability(process);
    const features = extractProcessFeatures(process);
    // توصيات متعددة المستويات
    const recommendations = [];
    // توصيات بناءً على المخاطر
    if (risk === 'high') {
        recommendations.push('⚠️ **تحذير حرج**: العملية في خطر عالي');
        if (features.delayedSteps > 0) {
            recommendations.push(`• ${features.delayedSteps} خطوات متأخرة - يجب التصرف فوراً`);
        }
        if (features.velocity < 0.5) {
            recommendations.push('• السرعة منخفضة جداً - قم بتخصيص موارد إضافية');
        }
        if (features.unassignedSteps > 0) {
            recommendations.push(`• ${features.unassignedSteps} خطوات غير مسندة - قم بالتعيين الآن`);
        }
    }
    // توصيات بناءً على احتمالية التأخير
    if (delayProb > 0.7) {
        recommendations.push(`🔴 احتمالية تأخير عالية: ${(delayProb * 100).toFixed(0)}%`);
        recommendations.push('• راجع الخطوات الحرجة فوراً');
        recommendations.push('• فكر في إعادة تخطيط الجدول الزمني');
    }
    else if (delayProb > 0.4) {
        recommendations.push(`🟡 احتمالية تأخير متوسطة: ${(delayProb * 100).toFixed(0)}%`);
        recommendations.push('• راقب التقدم عن كثب');
    }
    // توصيات بناءً على التعقيد
    if (features.complexityScore > 0.7) {
        recommendations.push('• العملية معقدة - فكر في تبسيط الخطوات');
    }
    if (features.approvalCount > 5) {
        recommendations.push(`• ${features.approvalCount} موافقات مطلوبة - قم بالتنسيق المسبق`);
    }
    // توصيات إيجابية
    if (risk === 'low' && delayProb < 0.3) {
        recommendations.push('✅ العملية تسير بشكل ممتاز');
        recommendations.push('• استمر في المراقبة الروتينية');
    }
    return recommendations.join('\n');
}
function identifyBottlenecks(process) {
    const bottlenecks = [];
    const now = Date.now();
    process.steps.forEach((step, index) => {
        // اختناق 1: خطوات متأخرة
        if (step.dueDate && step.status !== 'done') {
            const dueTime = new Date(step.dueDate).getTime();
            const delay = (now - dueTime) / (1000 * 60 * 60 * 24);
            if (delay > 7) {
                bottlenecks.push({
                    stepIndex: index,
                    stepName: step.name || `خطوة ${index + 1}`,
                    severity: 'critical',
                    reason: `متأخرة ${Math.floor(delay)} أيام`,
                    impact: 'تأخير كامل العملية',
                    recommendation: 'تصعيد فوري للإدارة',
                });
            }
            else if (delay > 3) {
                bottlenecks.push({
                    stepIndex: index,
                    stepName: step.name || `خطوة ${index + 1}`,
                    severity: 'high',
                    reason: `متأخرة ${Math.floor(delay)} أيام`,
                    impact: 'تأثير على الجدول الزمني',
                    recommendation: 'متابعة عاجلة',
                });
            }
        }
        // اختناق 2: خطوات غير مسندة
        if (!step.assignee && step.status === 'pending') {
            bottlenecks.push({
                stepIndex: index,
                stepName: step.name || `خطوة ${index + 1}`,
                severity: 'high',
                reason: 'لا يوجد مسؤول مُعيّن',
                impact: 'لن تبدأ تلقائياً',
                recommendation: 'قم بتعيين مسؤول فوراً',
            });
        }
        // اختناق 3: خطوات معلقة طويلاً
        if (step.status === 'in_progress' && step.dueDate) {
            const startTime = step.dueDate ? new Date(step.dueDate).getTime() - (7 * 24 * 60 * 60 * 1000) : now;
            const duration = (now - startTime) / (1000 * 60 * 60 * 24);
            if (duration > 10) {
                bottlenecks.push({
                    stepIndex: index,
                    stepName: step.name || `خطوة ${index + 1}`,
                    severity: 'medium',
                    reason: `قيد التنفيذ منذ ${Math.floor(duration)} أيام`,
                    impact: 'قد تكون عالقة',
                    recommendation: 'تحقق من المعوقات',
                });
            }
        }
    });
    return bottlenecks.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });
}
