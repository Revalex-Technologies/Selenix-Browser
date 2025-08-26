/* eslint-disable */
const {
  getConfig,
  applyEntries,
  getBaseConfig,
  dev,
} = require('./webpack.config.base');
const { join } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const webpack = require('webpack');
/* eslint-enable */

const PORT = 4444;

const appConfig = getConfig(getBaseConfig('app'), {
  target: 'web',

  devServer: {
    static: {
      directory: join(__dirname, 'build'),
    },
    port: PORT,
    hot: true,
    allowedHosts: 'all',
  },

  plugins: dev
    ? [
        new webpack.HotModuleReplacementPlugin(),
        new ReactRefreshWebpackPlugin(),
      ]
    : [],

  externals: {},

  resolve: {
    alias: {
      ...(getBaseConfig('app').resolve?.alias || {}),
      electron: '@electron/remote',
    },
  },
});

applyEntries(appConfig, [
  ...(process.env.ENABLE_AUTOFILL ? ['form-fill', 'credentials'] : []),
  'app',
  'permissions',
  'auth',
  'find',
  'menu',
  'search',
  'preview',
  'tabgroup',
  'downloads-dialog',
  'add-bookmark',
  'zoom',
  'settings',
  'history',
  'newtab',
  'bookmarks',
]);

module.exports = appConfig;
