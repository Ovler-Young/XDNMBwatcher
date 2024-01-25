// webpack.config.js
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  target: "webworker",
  entry: "./index.js",
  mode: "production",
  resolve: {
    fallback: {
      fs: false
    }
  },
  plugins: [new NodePolyfillPlugin()],
  performance: {
    hints: false
  },
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto"
      },
      {
        test: /\.md$/,
        use: { loader: "raw-loader" }
      }
    ]
  },
  optimization: {
    minimize: false
},
};
