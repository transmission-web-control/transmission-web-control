module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  plugins: ['unicorn', 'simple-import-sort', 'vue'],
  extends: ['standard-with-typescript', 'prettier'],
  parserOptions: {
    extraFileExtensions: ['.vue'],
    project: './tsconfig.json',
    ecmaVersion: 'latest',
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
      },
    ],
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
    '@typescript-eslint/no-this-alias': 0,
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
  overrides: [
    {
      files: ['*.vue'],
      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: './tsconfig.json',
        sourceType: 'module',
      },
      extends: [
        // add more generic rulesets here, such as:
        // 'eslint:recommended',
        'plugin:vue/vue3-recommended',
        // 'plugin:vue/recommended' // Use this if you are using Vue.js 2.x.
      ],
      rules: {
        'vue/multi-word-component-names': 0,
        'vue/multiline-html-element-content-newline': [
          'error',
          {
            ignoreWhenEmpty: true,
            ignores: ['pre', 'textarea'],
            allowEmptyLines: false,
          },
        ],
      },
    },
  ],
};
