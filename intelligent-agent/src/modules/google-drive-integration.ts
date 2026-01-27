import { google } from 'googleapis';
import fs from 'fs';

export async function uploadToGoogleDrive({ credentials, token, filePath, mimeType, name }: {
  credentials: any;
  token: any;
  filePath: string;
  mimeType: string;
  name: string;
}) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });
  const fileMetadata = { name };
  const media = { mimeType, body: fs.createReadStream(filePath) };
  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id',
  });
  return res.data.id;
}
