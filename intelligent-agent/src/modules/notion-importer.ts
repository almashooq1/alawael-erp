// استيراد بيانات التعلم من Notion
// مبدئي: يستخدم notion-sdk-js
import { Client } from '@notionhq/client';

export async function importFromNotion({
  databaseId,
  notionApiKey
}: {
  databaseId: string;
  notionApiKey: string;
}) {
  const notion = new Client({ auth: notionApiKey });
  const response = await (notion.databases as any).query({ database_id: databaseId });
  // تحويل النتائج إلى صيغة موحدة
  return (response.results as any[]).map((page: any) => ({
    id: page.id,
    properties: page.properties
  }));
}
