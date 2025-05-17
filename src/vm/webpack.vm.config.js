'use strict';

const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: "production",
  entry: {
    'core-lodash-moment-inputmask': path.resolve(__dirname, 'entries/core-lodash-moment-inputmask.js'),
    'core-lodash-moment-inputmask-nunjucks': path.resolve(__dirname, 'entries/core-lodash-moment-inputmask-nunjucks.js')
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "bundles"),
    library: {
      type: "global",
    },
    globalObject: "globalThis",
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
  target: ["web"],
  plugins: [],
};
