module.exports = {
    extends: [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:react/jsx-runtime",
        "plugin:@typescript-eslint/recommended",
        "prettier",
    ],
    env: {
        browser: true,
        node: true,
        es6: true,
    },
    parserOptions: {
        ecmaVersion: 8,
    },
    plugins: ["react", "@typescript-eslint"],
    rules: {
        "react/prop-types": "off",
    },
    settings: {
        react: {
            version: "detect",
        },
    },
};
