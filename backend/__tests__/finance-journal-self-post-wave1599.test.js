'use strict';
/**
 * W1599 — finance-module: post an unapproved journal entry (accounting fraud) via create.
 * A JournalEntry is posted only via POST /journal-entries/:id/approve (guarded status:'draft'
 * + is_balanced:true → stamps status:'posted' + approved_by/approved_at). But new JournalEntry
 * ({...req.body}) was raw → a caller could create an entry already status:'posted' with
 * approved_by/posted_by/posted_at, skipping the approval gate. ChartOfAccount create likewise
 * let a caller set current_balance / is_active. Now stripped.
 */
const fs=require('fs'),path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','routes','finance-module.routes.js'),'utf8');
const CODE=SRC.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
describe('W1599 finance journal self-post',()=>{
  test('journal + account creates strip lifecycle/posting fields',()=>{
    expect(CODE).toMatch(/new JournalEntry\(\{\s*\.\.\.stripFinanceFields\(req\.body, JOURNAL_PROTECTED\)/);
    expect(CODE).toMatch(/new ChartOfAccount\(\{\s*\.\.\.stripFinanceFields\(req\.body, ACCOUNT_PROTECTED\)/);
    expect(CODE).not.toMatch(/new JournalEntry\(\{\s*\.\.\.req\.body/);
  });
  test('journal protected set covers posting/approval fields',()=>{ for(const f of ['status','posted_by','approved_by','approved_at']) expect(CODE).toMatch(new RegExp("'"+f+"'")); });
});
