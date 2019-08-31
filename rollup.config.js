import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'

export default {
  input: 'packages/mjml-core/src/index.js',
  output: {
    file: 'web/src/index.js',
    format: 'cjs',
  },
  plugins: [
    babel({ runtimeHelpers: true }),
    commonjs(),
    resolve({ only: [/^mjml.*$/ ] }),
  ],
}
