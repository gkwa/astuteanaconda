const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    content: './src/content.js',
    popup: './src/popup.js',
    socialsparrow: './src/socialsparrow-bundle.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  mode: 'development',  // Changed from production to development for better debugging
  devtool: 'inline-source-map',  // Changed to inline-source-map to avoid external map files
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/popup.html', to: 'popup.html' },
        { from: 'icons', to: 'icons' }
      ],
    }),
  ],
  performance: {
    hints: false
  }
};
