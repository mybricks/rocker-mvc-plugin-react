const {BUILD_PATH} = require("../src/constants")
const path = require('path')
const webpack = require('webpack')

const ignoreWarningPlugin = require('./ignoreWarningPlugin')

const HappyPack = require('happypack');

const tsConfig = require('./tsconfig')

module.exports = {
  entry: {},
  cache: {
    type: "filesystem", 
  },
  mode: "development",// "production" | "development" | "none"
  output: {
    filename: "[name].js",
    path: path.join(process.cwd(), BUILD_PATH),
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {

    }
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: ['happypack/loader?id=babel']
      },
      {
        test: /\.tsx?$/,
        use: [
          'happypack/loader?id=babel',
          {
            loader: 'ts-loader',
            options: tsConfig
          }
        ]
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.less$/i,
        use: [
          {loader: 'style-loader'},
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[local]-[hash:5]'
              }
            }
          },
          {loader: 'less-loader'}
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }),
    new webpack.ProvidePlugin({
      'React': 'react'
    }),
    new ignoreWarningPlugin(),   // All warnings will be ignored
    new HappyPack({
      id: 'babel',
      loaders: [{
        loader: 'babel-loader',
        options: {
          presets: [
            '@babel/preset-react'
          ],
          plugins: [
            ['@babel/plugin-proposal-class-properties', {'loose': true}]
          ],
          cacheDirectory: true,
        }
      }],
    }),
  ]
}
