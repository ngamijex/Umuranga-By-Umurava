"use strict";

const coreWebVitals = require("eslint-config-next/core-web-vitals");
const typescript = require("eslint-config-next/typescript");

module.exports = [
  {
    ignores: [
      "eslint.config.js",
      "next.config.ts",
      "postcss.config.js",
      "tailwind.config.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];
