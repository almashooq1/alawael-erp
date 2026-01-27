// استيراد بيانات التعلم من Airtable
// مبدئي: يستخدم airtable
import Airtable from 'airtable';

export async function importFromAirtable({
  baseId,
  tableName,
  apiKey
}: {
  baseId: string;
  tableName: string;
  apiKey: string;
}) {
  const base = new Airtable({ apiKey }).base(baseId);
  const records: any[] = [];
    await base(tableName).select().eachPage((page: any, fetchNextPage: any) => {
    records.push(...page);
    fetchNextPage();
  });
  return records.map(r => ({ id: r.id, fields: r.fields }));
}
