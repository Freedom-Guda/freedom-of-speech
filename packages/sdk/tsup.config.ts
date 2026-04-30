import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/auto.ts'],
  format: ['esm', 'iife'],
  globalName: 'FoS',
  outDir: 'dist',
  dts: true,
  sourcemap: true,
  minify: true,
  splitting: false,
  treeshake: true,
  clean: true,
  // Hard zero-dependency rule: bundle is a single file with nothing pulled
  // from npm at runtime.
  noExternal: [/.*/],
  target: ['es2020', 'chrome90', 'firefox90', 'safari14'],
});
