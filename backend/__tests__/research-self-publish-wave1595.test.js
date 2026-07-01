'use strict';
/**
 * W1595 — research: self-publish / ethics-approval forge via updateStudy.
 * updateStudy forwarded req.body raw to findByIdAndUpdate → PUT { status:'published',
 * ethicsApproval:{approved:true} } bypassed the ethics-review workflow (status belongs to the
 * dedicated /:id/status endpoint; ethics approval is committee-controlled), or tampered
 * createdBy/organizationId/isActive/statusHistory. Now stripped. (The cross-branch IDOR —
 * ResearchStudy has no branchId — is flagged for an owner-run branchId migration.)
 */
const fs=require('fs'),path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','domains','research','routes','research.routes.js'),'utf8');
const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
describe('W1595 research self-publish via update',()=>{
  test('updateStudy strips status/ethicsApproval/server fields',()=>{
    expect(CODE).toMatch(/updateStudy\(req\.params\.id, stripStudyFields\(req\.body\)\)/);
    expect(CODE).not.toMatch(/updateStudy\(req\.params\.id, req\.body\)/);
    for(const f of ['status','ethicsApproval','createdBy','organizationId','statusHistory']) expect(CODE).toMatch(new RegExp("'"+f+"'"));
  });
});
