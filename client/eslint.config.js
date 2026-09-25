import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
	{ ignores: ["build/"] },
	{
		files: ["**/*.{js,jsx}"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: globals.browser,
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		settings: { react: { version: "detect" } },
		plugins: { react, "react-hooks": reactHooks },
		rules: {
			...js.configs.recommended.rules,
			"react/jsx-uses-vars": "error",
			"react/jsx-uses-react": "error",
			"react/jsx-key": "warn",
			"react/jsx-no-target-blank": "warn",
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
			"no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
		},
	},
];
