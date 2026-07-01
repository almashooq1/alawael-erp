'use strict';
/**
 * W1593 — tele-rehab: charge evasion / status forge via completeSession.
 * completeSession spread ...payload AFTER the forced { status:'completed', endedAt } fields,
 * so a caller could pass { status, billing:{billable:false,effectiveMinutes:0}, endedAt } to
 * flip status, evade billing, or override the server end-timestamp. Now the payload is
 * stripped of server/billing fields and the forced fields go last (win). (recordQuality +
 * submitSatisfaction are client self-reports of the caller's OWN session — ownership is
 * enforced by the :teleSessionId param hook — so they are by-design, not changed.)
 */
const fs=require('fs'),path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','domains','tele-rehab','services','TeleRehabService.js'),'utf8');
const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
describe('W1593 tele-rehab completion billing/status forge',()=>{
  test('completeSession strips billing/status; forced fields win',()=>{
    expect(CODE).toMatch(/TELE_SERVER_FIELDS = \[[^\]]*'billing'/);
    expect(CODE).toMatch(/\.\.\.cleanPayload,\s*status: 'completed'/);
    expect(CODE).not.toMatch(/status: 'completed',\s*endedAt: new Date\(\),\s*\.\.\.payload/);
  });
});
