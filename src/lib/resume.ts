import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const RESUME_FILE = 'Kiran_Vadlapally_Resume.pdf';

let warned = false;

// TODO(Kiran) T1 (blocks launch): remove the phone number from the PDF and check its metadata before adding it.
/** Checked at build time, so adding the PDF flips the CTA with no code change (PLAN D3). */
export function hasResume(): boolean {
  const present = existsSync(join(process.cwd(), 'public', RESUME_FILE));
  if (!present && !warned) {
    warned = true;
    console.warn(`[resume] public/${RESUME_FILE} is missing, the CTA reads "Request resume"`);
  }
  return present;
}
