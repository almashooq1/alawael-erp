'use strict';
/**
 * W1597 — insuranceClaims: forge a PAID claim / self-approve a pre-auth / self-activate a
 * contract via the CREATE endpoints. The claim PUT was already whitelisted (CLAIM_UPDATABLE),
 * but the creates were raw: new InsuranceClaim({...req.body}) → status:'paid' + adjudication +
 * payment.amount (money fabrication); new PreAuthorization({...req.body}) → status:'approved' +
 * approvalDetails.approvedAmount (self-approve, bypass /pre-auth/:id/approve); new
 * InsuranceContract({...req.body}) → status:'active'. stripUpdateMeta only blocks proto/creds
 * so the contract PUT was exploitable too. Now all go through stripInsuranceFields whitelists.
 */
const fs=require('fs'),path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','routes','insuranceClaims.routes.js'),'utf8');
const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
describe('W1597 insurance create-time fraud',()=>{
  test('claim/pre-auth/contract creates strip privileged fields',()=>{
    expect(CODE).toMatch(/new InsuranceClaim\(\{ \.\.\.stripInsuranceFields\(claimData, CLAIM_PROTECTED\)/);
    expect(CODE).toMatch(/new PreAuthorization\(\{ \.\.\.stripInsuranceFields\(req\.body, PREAUTH_PROTECTED\)/);
    expect(CODE).toMatch(/new InsuranceContract\(\{ \.\.\.stripInsuranceFields\(req\.body, CONTRACT_PROTECTED\)/);
    expect(CODE).not.toMatch(/new InsuranceClaim\(\{ \.\.\.claimData, createdBy/);
    expect(CODE).not.toMatch(/new PreAuthorization\(\{ \.\.\.req\.body, requestedBy/);
  });
  test('contract update wraps stripUpdateMeta with the insurance strip',()=>{
    expect(CODE).toMatch(/stripInsuranceFields\(stripUpdateMeta\(req\.body\), CONTRACT_PROTECTED\)/);
  });
  test('protected sets cover money + approval + status',()=>{ for(const f of ['status','adjudication','payment','approvalDetails','approvedAmount','isDeleted']) expect(CODE).toMatch(new RegExp("'"+f+"'")); });
});
