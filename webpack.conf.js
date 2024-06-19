const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

const ROOT = __dirname

module.exports = {
  mode: 'production',
  target: 'node',
  entry: {
    index: "./src/index.ts",
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: "[name].js" // <--- Will be compiled to this single file
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  devtool: false,
  optimization: {
    minimize: false,
  },
  resolve: {
    symlinks: true,
    extensions: ['.ts', '.mjs', '.js', '.json'],
    plugins: [
      // This plugin is required to make webpack resolve modules according to `baseUrl` and `paths` in tsconfig.json .
      new TsconfigPathsPlugin({
        configFile: path.join(ROOT, 'tsconfig.json')
      }),
    ]
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.m?js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        },
      },
    ]
  }
};
