// Recreate every text index whose language_override is the doc's own "language"
// field (or default) so an Arabic ('ar') language value can't break inserts.
// Preserves key (incl. compound prefixes), weights, default_language; only the
// language_override changes to a non-existent field. Dry-run unless --apply.
const path=require('path');const mongoose=require('mongoose');
require('dotenv').config({path:path.join(__dirname,'..','.env')});
const APPLY=process.argv.includes('--apply');
const SAFE_OVERRIDE='searchLanguage';
(async()=>{
  await mongoose.connect(process.env.MONGODB_URI);
  const db=mongoose.connection.db;
  const colls=await db.listCollections().toArray();
  let changed=0,skipped=0;
  for(const c of colls){
    let ix; try{ix=await db.collection(c.name).indexes();}catch(e){continue;}
    for(const i of ix){
      const isText=i.textIndexVersion||(i.key&&i.key._fts);
      if(!isText) continue;
      const lo=i.language_override||'language';
      if(lo===SAFE_OVERRIDE){skipped++;continue;}
      if(lo!=='language'){skipped++;continue;} // only touch the risky default
      // reconstruct key: keep non-fts fields, add each weights field as 'text'
      const key={};
      for(const k of Object.keys(i.key||{})) if(k!=='_fts'&&k!=='_ftsx') key[k]=i.key[k];
      for(const w of Object.keys(i.weights||{})) key[w]='text';
      const opts={name:i.name,weights:i.weights,language_override:SAFE_OVERRIDE};
      if(i.default_language) opts.default_language=i.default_language;
      if(i.partialFilterExpression) opts.partialFilterExpression=i.partialFilterExpression;
      console.log((APPLY?'FIX ':'WOULD-FIX ')+c.name+' / '+i.name+'  key='+JSON.stringify(key));
      if(APPLY){
        try{ await db.collection(c.name).dropIndex(i.name); await db.collection(c.name).createIndex(key,opts); changed++; }
        catch(e){ console.log('   ERROR '+c.name+': '+e.message); }
      } else changed++;
    }
  }
  console.log((APPLY?'APPLIED ':'DRY-RUN ')+'text indexes to fix: '+changed+' (already-safe/other skipped: '+skipped+')');
  await mongoose.disconnect();process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
