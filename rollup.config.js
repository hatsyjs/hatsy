import { externalModules } from '@proc7ts/rollup-helpers';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import sourcemaps from 'rollup-plugin-sourcemaps';
import ts from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import pkg from './package.json';

export default {
  input: './src/index.ts',
  plugins: [
    commonjs(),
    ts({
      typescript,
      tsconfig: 'tsconfig.main.json',
      cacheRoot: 'target/.rts2_cache',
      useTsconfigDeclarationDir: true,
    }),
    nodeResolve(),
    sourcemaps(),
  ],
  external: externalModules(),
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      hoistTransitiveImports: true,
    },
    {
      file: pkg.module,
      format: 'esm',
      sourcemap: true,
      hoistTransitiveImports: true,
    },
  ],
};
