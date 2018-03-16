const path = require('path')
const webpack = require('webpack')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require(path.join(__dirname, 'package.json')).version)
    }),
    new CleanWebpackPlugin(['dist']),
    new UglifyJsPlugin()
  ],
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist')
  }
}
