const BoxSDK = require('box-node-sdk');
import fs from 'fs';

export async function uploadToBox({ clientId, clientSecret, accessToken, filePath, boxFolderId, name }: {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  filePath: string;
  boxFolderId: string;
  name: string;
}) {
  const sdk = new BoxSDK();
  const client = sdk.getBasicClient(accessToken);
  const stream = fs.createReadStream(filePath);
  const res = await client.files.uploadFile(boxFolderId, name, stream);
  return res.entries[0].id;
}
