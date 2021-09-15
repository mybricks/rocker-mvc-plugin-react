const {BUILD_PATH} = require("../src/constants")
const path = require('path')
const webpack = require('webpack')

const ignoreWarningPlugin = require('./ignoreWarningPlugin')
const tsConfig = require('./tsconfig')

module.exports = {
  entry: {},
  cache: {
    type: "filesystem", 
  },
  mode: "production",// "production" | "development" | "none"
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
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-react'  // jsx支持
                //['@babel/preset-env', { useBuiltIns: 'usage', corejs: 2 }] // 按需使用polyfill
              ],
              plugins: [
                ['@babel/plugin-proposal-class-properties', {'loose': true}] // class中的箭头函数中的this指向组件
              ],
              cacheDirectory: true // 加快编译速度
            }
          }
        ]
      },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-react'  // jsx支持
                //['@babel/preset-env', { useBuiltIns: 'usage', corejs: 2 }] // 按需使用polyfill
              ],
              plugins: [
                ['@babel/plugin-proposal-class-properties', {'loose': true}] // class中的箭头函数中的this指向组件
              ],
              cacheDirectory: true // 加快编译速度
            }
          },
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
    new ignoreWarningPlugin()   // All warnings will be ignored

  ]
}
