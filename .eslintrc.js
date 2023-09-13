module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    "parser": '@typescript-eslint/parser',
    "plugins": ['@typescript-eslint'],
    "root": true,
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/ban-types":"off",
        "no-case-declarations": "off",
        "prefer-const": "off",
        "no-empty": "off",
        "no-var": "off",
        "curly": "error"
    }
};