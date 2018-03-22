const merge = require('webpack-merge')
const webpack = require('webpack')
const common = require('./webpack.common.js')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = merge(common, {
  mode: 'production',
  plugins: [
    new webpack.DefinePlugin({
      DEV: false
    }),
    new UglifyJsPlugin()
  ]
})
