module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        browsers: [
          'chrome >= 80',
          'firefox >= 90',
          'edge >= 80',
          'safari >= 14'
        ]
      },
      modules: false,
      loose: true
    }]
  ]
};
