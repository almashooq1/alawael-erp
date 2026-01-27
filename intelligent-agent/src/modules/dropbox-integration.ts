import { Dropbox } from 'dropbox';
import fs from 'fs';

export async function uploadToDropbox({ accessToken, filePath, dropboxPath }: {
  accessToken: string;
  filePath: string;
  dropboxPath: string;
}) {
  const dbx = new Dropbox({ accessToken, fetch });
  const fileContent = fs.readFileSync(filePath);
  const res = await dbx.filesUpload({ path: dropboxPath, contents: fileContent });
  return res.result.id;
}
