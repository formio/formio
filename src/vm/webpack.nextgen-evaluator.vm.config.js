'use strict';

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    'nextgen-evaluator': path.resolve(__dirname, 'entries/nextgen-evaluator.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'bundles'),
    library: {
      type: 'global',
    },
    globalObject: 'globalThis',
  },
  optimization: {
    minimize: true,
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
