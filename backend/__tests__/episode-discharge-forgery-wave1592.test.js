'use strict';
/**
 * W1592 — episodes: forge a discharged episode via create/update + team isPrimary injection.
 * Episode lifecycle (advance-phase/discharge/suspend/resume) is driven by dedicated endpoints,
 * but POST /episodes + PUT /:episodeId forwarded req.body raw to BaseService create/update
 * (no whitelist) → a caller could create/update an episode with status:'completed' +
 * dischargedBy + dischargeReason to forge a discharge record, or tamper createdBy/isDeleted/
 * version. addTeamMember spread ...member → isPrimary:true self-designation. Now stripped.
 */
const fs=require('fs'),path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','domains','episodes','routes','episodes.routes.js'),'utf8');
const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
describe('W1592 episode discharge forgery + team',()=>{
  test('create + update strip discharge/status/server fields',()=>{
    expect((CODE.match(/stripFields\(req\.body, EPISODE_SERVER_FIELDS\)/g)||[]).length).toBeGreaterThanOrEqual(2);
    expect(CODE).not.toMatch(/svc\(\)\.create\(req\.body, context\)/);
    expect(CODE).not.toMatch(/svc\(\)\.update\(req\.params\.episodeId, req\.body, context\)/);
  });
  test('team add strips isPrimary (self-designation)',()=>{
    expect(CODE).toMatch(/TEAM_MEMBER_SERVER_FIELDS = \[[^\]]*'isPrimary'/);
    expect(CODE).toMatch(/addTeamMember\([^)]*stripFields\(req\.body, TEAM_MEMBER_SERVER_FIELDS\)/);
  });
  test('protected set covers discharge fields',()=>{ for(const f of ['status','dischargedBy','dischargeReason','actualEndDate','isDeleted']) expect(CODE).toMatch(new RegExp("'"+f+"'")); });
});
