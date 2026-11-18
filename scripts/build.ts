import { build, type BuildOptions } from 'esbuild';

const common: BuildOptions = {
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
  logLevel: 'info',
};

async function main(): Promise<void> {
  await Promise.all([
    build({ ...common, entryPoints: ['src/landing.ts'], outfile: 'public/landing.js' }),
    build({ ...common, entryPoints: ['src/login.ts'], outfile: 'public/login.js' }),
    // Bundel admin disimpan di private/ dan hanya dilayani setelah login (api/admin.ts)
    build({ ...common, entryPoints: ['src/admin.ts'], outfile: 'private/app.js' }),
  ]);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
