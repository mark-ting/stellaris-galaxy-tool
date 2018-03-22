const merge = require('webpack-merge')
const webpack = require('webpack')
const common = require('./webpack.common.js')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = merge(common, {
  mode: 'development',
  plugins: [
    new webpack.DefinePlugin({
      DEV: true
    }),
    new BundleAnalyzerPlugin()
  ]
})
