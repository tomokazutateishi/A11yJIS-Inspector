module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  plugins: ['simple-import-sort', 'import'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',
    'import/order': 'off',
    'no-console': 'off'
  },
  settings: {
    'import/resolver': {
      typescript: true
    }
  },
  ignorePatterns: ['dist/**']
};

