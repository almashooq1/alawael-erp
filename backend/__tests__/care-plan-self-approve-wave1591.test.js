'use strict';
/**
 * W1591 — care-plans: self-approve/activate a care plan via the generic PUT.
 * createPlan is safe (explicit payload, status forced 'draft'). updatePlan did
 * findByIdAndUpdate($set: req.body) with no whitelist → PUT { status:'active', approvedBy,
 * approvedAt } self-approved a care plan bypassing the /approve endpoint (activatePlan), or
 * tampered evidenceHash/signatureChain/version/createdBy/isDeleted. Now stripped; status
 * 'active' blocked (activation is approval-only).
 */
const fs=require('fs'),path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','domains','care-plans','routes','care-plans.routes.js'),'utf8');
const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
describe('W1591 care-plan self-approve via update',()=>{
  test('update strips server/approval fields',()=>{
    expect(CODE).toMatch(/stripCarePlanFields\(req\.body\)/);
    expect(CODE).not.toMatch(/updatePlan\(req\.params\.planId, req\.body\)/);
  });
  test('self-activation to active blocked',()=>{ expect(CODE).toMatch(/if \(clean\.status === 'active'\) delete clean\.status/); });
  test('protected set covers approval + integrity + audit',()=>{ for(const f of ['approvedBy','approvedAt','evidenceHash','signatureChain','createdBy','isDeleted']) expect(CODE).toMatch(new RegExp("'"+f+"'")); });
});
