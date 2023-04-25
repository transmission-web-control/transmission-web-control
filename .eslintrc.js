module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  plugins: ['unicorn', 'simple-import-sort'],
  extends: ['standard-with-typescript', 'prettier'],
  overrides: [],
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 'latest',
  },
  rules: {
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'prefer-const': 'error',
    'unicorn/prefer-string-slice': 'error',
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/no-non-null-assertion': 1,
    '@typescript-eslint/consistent-type-assertions': 0,
    '@typescript-eslint/strict-boolean-expressions': 0,
    'object-shorthand': ['error', 'always'],
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/method-signature-style': 0,
    curly: ['error', 'all'],
    'no-var': 0,
    eqeqeq: 0,
    'no-fallthrough': 0,
    'no-redeclare': 0,
    'n/no-callback-literal': 0,
    'no-caller': 0,
    'no-extend-native': 0,
    'no-useless-escape': 0,
    'no-unused-expressions': 0,
    camelcase: 0,
    'no-eval': 0,
    'no-unused-vars': 0,
    'no-new': 0,
    'no-undef': 0,
  },
};
