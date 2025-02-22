// @babel/preset-env version: ^7.21.0
// @babel/preset-typescript version: ^7.21.0
// @vue/babel-preset-app version: ^5.0.0

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          chrome: '90',
          firefox: '88', 
          safari: '14',
          edge: '90'
        },
        modules: false,
        useBuiltIns: 'usage',
        corejs: 3
      }
    ],
    '@babel/preset-typescript',
    [
      '@vue/babel-preset-app',
      {
        useBuiltIns: 'usage',
        corejs: 3
      }
    ]
  ],
  plugins: [],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            }
          }
        ],
        '@babel/preset-typescript'
      ]
    }
  }
}