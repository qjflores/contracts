'use strict'

const path = require('path')

module.exports = {
  entry: './src/log-utils.js',
  output: {
    libraryTarget: 'var',
    library: 'Log',
    filename: './dist/ipfslog.min.js'
  },
  devtool: 'source-map',
  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ]
  },
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules')
    ],
    moduleExtensions: ['-loader']
  },
  node: {
    console: false,
    Buffer: true
  },
  plugins: [],
  target: 'web'
}
