'use strict';

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

// Separate config from webpack.vm.config.js (the core bundles) because nextgen
// drags in heavy UI deps that warrant their own build step. Wired into `build`
// after build:vm so the nextgen render bundle exists whenever NEXTGEN_VALIDATOR
// is enabled. Emits into the shared bundles/ dir alongside the core bundles.
module.exports = {
  mode: 'production',
  entry: {
    'nextgen-render': path.resolve(__dirname, 'entries/nextgen-render.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'bundles'),
    library: {
      type: 'global',
    },
    globalObject: 'globalThis',
    // Avoid webpack's browser-only auto-publicPath probe (document.currentScript).
    publicPath: '',
  },
  module: {
    // The isolate loads ONE file and has no chunk loader, so every dynamic
    // import() the renderer uses to lazy-load UI components must be inlined into
    // the single bundle rather than split into separately-fetched chunks.
    parser: {
      javascript: { dynamicImportMode: 'eager' },
    },
    rules: [
      // @formio/nextgen pulls in component CSS (quill/tippy); the isolate has
      // no styling, so stub these imports as inert source strings.
      { test: /\.css$/, type: 'asset/source' },
    ],
  },
  optimization: {
    minimize: true,
    // The isolate loads a single self-contained file; don't split shared code.
    splitChunks: false,
    runtimeChunk: false,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  target: ['web'],
  plugins: [],
};
