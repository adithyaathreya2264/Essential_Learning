import { File } from 'expo-file-system';

export async function extractTxtText(uri: string): Promise<string> {
  const file = new File(uri);
  return file.text();
}
