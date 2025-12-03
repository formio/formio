import path from 'path';
import CopyPlugin from 'copy-webpack-plugin';
import fs from 'fs';
import webpack from 'webpack';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = import.meta.dirname;

// Read the package.json file directly
const formiojsPath = require.resolve('@formio/js');
const formiojsPackageJsonPath = path.join(path.dirname(formiojsPath), 'package.json');
const formiojsPackage = JSON.parse(fs.readFileSync(formiojsPackageJsonPath, 'utf8'));

const formioReactPath = require.resolve('@formio/react');
const reactPackageJsonPath = path.join(`${path.dirname(formioReactPath)}/..`, 'package.json');
const reactPackage = JSON.parse(fs.readFileSync(reactPackageJsonPath, 'utf8'));

export default {
  entry: './src/index.tsx',
  mode: 'development',
  devtool: 'eval-source-map',
  cache: false,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
        ],
      },
      {
        test: /\.woff2?$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'public' }],
    }),
    new webpack.DefinePlugin({
      FORMIO_JS_VERSION: JSON.stringify(formiojsPackage.version),
      REACT_FORMIO_VERSION: JSON.stringify(reactPackage.version),
    }),
  ],
};
