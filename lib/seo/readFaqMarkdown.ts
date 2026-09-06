import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import { FaqJsonLdError, FAQ_MARKDOWN_REL_PATH, MAX_FAQ_BYTES } from './jsonld';

export function readFaqMarkdown(relPath: string = FAQ_MARKDOWN_REL_PATH): string {
  const root = resolve(process.cwd());
  const allowed = resolve(root, FAQ_MARKDOWN_REL_PATH);
  const filePath = isAbsolute(relPath) ? resolve(relPath) : resolve(root, relPath);

  if (filePath !== allowed) {
    throw new FaqJsonLdError(`FAQ source path is not allowed: ${relPath}`);
  }

  let source: string;
  try {
    source = readFileSync(filePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new FaqJsonLdError(`FAQ source not found: ${filePath}`);
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new FaqJsonLdError(`Failed to read FAQ source ${filePath}: ${message}`);
  }

  if (Buffer.byteLength(source, 'utf-8') > MAX_FAQ_BYTES) {
    throw new FaqJsonLdError(`FAQ source exceeds ${MAX_FAQ_BYTES} bytes: ${filePath}`);
  }

  return source;
}
