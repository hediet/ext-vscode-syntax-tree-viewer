var webpack = require('webpack');
var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var SplitByPathPlugin = require('webpack-split-by-path');

var r = file => path.resolve(__dirname, file[0]);

var config = {
  entry: r`src/index.tsx`,
  output: {
    path: r`dist`,
    filename: "[name].js",
    chunkFilename: "[name].js"
  },
  devtool: 'source-map',
  module: {
    loaders: [
      { test: /\.css$/, loader: "style-loader!css-loader" },
      { test: /\.scss$/, loader: "style!css!sass" },
      { test: /\.(jpe?g|png|gif)$/i, loader: "file" },
      { test: /\.tsx?$/, loader: 'ts-loader' }
    ],
    preLoaders: [
      /*
       * bundled js ---[sourcemap 1]--> js ---[sourcemap 2]--> ts
       * The source-map-loader combines both sourcemaps.
       */
      { test: /\.js$/, loader: "source-map-loader" }
    ]
  },
  plugins: [
    // generates an index.html
    new HtmlWebpackPlugin()
  ]
};

module.exports = config;
