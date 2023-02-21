const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const package = require('./package.json');
const VERSION = package.version;

console.log(`Using version: ${VERSION}`);

module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  devtool: 'source-map',
  entry: {
    main: './src/index.ts',
  },
  output: {
    publicPath: '/',
    path: path.resolve(__dirname, 'public'),
  },
  module: {
    rules: [
      {
        test: /\.worker\.ts$/,
        use: {
          loader: 'worker-loader',
          options: {
            name: '[name].js?[contenthash]',
          }
        }
      },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
          }
        ],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          },
        ]
      },
      {
        test: /\.(ttf|eot|woff|woff2)$/,
        use: {
          loader: "file-loader",
          options: {
            name: "fonts/[name].[ext]",
          },
        },
      },
    ]
  },
  optimization: {
    minimize: false,
    splitChunks: {
      cacheGroups: {
        commons: {
          name: 'commons',
          chunks: 'initial',
          minChunks: 2
        }
      },
      chunks: 'all',
    },
  },
  mode: process.env.NODE_ENV || 'development',
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(VERSION)
    }),
    new HtmlWebpackPlugin({
      title: 'Terranova'
    }),
  ],
  devServer: {
    port: 1234,
    historyApiFallback: true,
    watchOptions: {
      ignored: /node_modules/,
    },
    // using headers to enable again SharedArrayBuffer
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  }
};
