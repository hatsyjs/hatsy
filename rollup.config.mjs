import nodeResolve from '@rollup/plugin-node-resolve';
import { externalModules } from '@run-z/rollup-helpers';
import path from 'node:path';
import { defineConfig } from 'rollup';
import flatDts from 'rollup-plugin-flat-dts';
import sourcemaps from 'rollup-plugin-sourcemaps';
import ts from 'rollup-plugin-typescript2';
import typescript from 'typescript';

export default defineConfig({
  input: {
    hatsy: './src/index.ts',
    'hatsy.impl': './src/impl/index.ts',
    'hatsy.core': './src/core/index.ts',
    'hatsy.testing': './src/testing/index.ts',
  },
  plugins: [
    ts({
      typescript,
      tsconfig: 'tsconfig.main.json',
      cacheRoot: 'target/.rts2_cache',
    }),
    nodeResolve(),
    sourcemaps(),
  ],
  external: externalModules(),
  manualChunks(id) {
    if (id.startsWith(path.resolve('src', 'testing') + path.sep)) {
      return 'hatsy.testing';
    }
    if (id.startsWith(path.resolve('src', 'core') + path.sep)) {
      return 'hatsy.core';
    }
    if (id.startsWith(path.resolve('src', 'impl') + path.sep)) {
      return 'hatsy.impl';
    }

    return 'hatsy';
  },
  output: {
    dir: '.',
    format: 'esm',
    sourcemap: true,
    entryFileNames: 'dist/[name].js',
    chunkFileNames: 'dist/_[name].js',
    plugins: [
      flatDts({
        tsconfig: 'tsconfig.main.json',
        lib: true,
        compilerOptions: {
          declarationMap: true,
        },
        entries: {
          core: {
            file: 'core/index.d.ts',
          },
          testing: {
            file: 'testing/index.d.ts',
          },
        },
      }),
    ],
  },
});
