'use strict';

const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: "production",
  entry: path.resolve(__dirname, "default_entry.js"),
  output: {
    filename: "default_bundle.js",
    path: __dirname,
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
