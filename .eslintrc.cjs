module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    // Node グローバルはデフォルトでは無効（ツール系でのみ有効化）
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:@figma/figma-plugins/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'simple-import-sort', 'import', '@figma/figma-plugins'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    // 型情報が必要なルール向けに、プラグイン用/ツール用の両プロジェクトを指定
    project: ['./tsconfig.json', './tsconfig.tools.json']
  },
  rules: {
    'no-undef': 'off',
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',
    'import/order': 'off',
    'no-console': 'off'
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      }
    }
  },
  ignorePatterns: ['dist/**', 'tmp_tests/**'],
  overrides: [
    // Node（ツール・設定ファイル）向け: Node 環境と Node 型を使用
    {
      files: [
        '*.cjs',
        '*.mjs',
        '*.js',
        '*.config.*',
        'scripts/**/*',
        'build/**/*',
        'tools/**/*'
      ],
      env: { node: true, browser: false },
      parserOptions: {
        project: './tsconfig.tools.json'
      }
    },
    // テストコード向け: Node 環境 + 専用tsconfig
    {
      files: ['tests/**/*.ts'],
      env: { node: true, browser: false },
      parserOptions: {
        project: './tsconfig.tests.json'
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        'simple-import-sort/imports': 'off'
      }
    },
    // プラグイン（Figma ランタイム）向け: ブラウザ/DOM + Figma 型のみ
    {
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      env: { browser: true, node: false },
      parserOptions: {
        project: './tsconfig.json'
      }
    }
  ]
};
