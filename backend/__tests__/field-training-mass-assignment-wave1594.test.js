'use strict';
/**
 * W1594 — field-training: mass-assignment on updateProgram + completeTraining.
 * updateProgram forwarded req.body raw to findByIdAndUpdate; completeTraining spread
 * ...completionData AFTER the forced status/completedAt — so a caller could tamper program
 * createdBy/code/isDeleted, or backdate a trainee completion + inject currentGoals (goal
 * spoofing). Now both go through a route-layer whitelist strip.
 */
const fs=require('fs'),path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','domains','field-training','routes','field-training.routes.js'),'utf8');
const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
describe('W1594 field-training mass-assignment',()=>{
  test('updateProgram + completeTraining strip server fields',()=>{
    expect(CODE).toMatch(/stripFields\(req\.body, PROGRAM_SERVER_FIELDS\)/);
    expect(CODE).toMatch(/stripFields\(req\.body, TRAINEE_SERVER_FIELDS\)/);
    expect(CODE).not.toMatch(/updateProgram\(req\.params\.programId, req\.body\)/);
    expect(CODE).not.toMatch(/completeTraining\(req\.params\.traineeRecordId, req\.body\)/);
  });
  test('trainee protected set covers completion + goal fields',()=>{ for(const f of ['status','completedAt','currentGoals','isDeleted']) expect(CODE).toMatch(new RegExp("'"+f+"'")); });
});
