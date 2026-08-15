import { access, cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stdout } from 'node:process';

const pagefindOutput = resolve('dist/pagefind');

const vercelStaticOutput = resolve('.vercel/output/static');

async function exists(path) {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}

if (!(await exists(pagefindOutput))) {
  throw new Error('Pagefind output was not generated at dist/pagefind.');
}

if (await exists(vercelStaticOutput)) {
  const target = resolve(vercelStaticOutput, 'pagefind');

  await rm(target, {
    recursive: true,
    force: true,
  });

  await cp(pagefindOutput, target, {
    recursive: true,
    force: true,
  });

  stdout.write('[pagefind] synced search bundle to Vercel static output\n');
} else {
  stdout.write('[pagefind] no Vercel static output detected, skipping sync\n');
}
