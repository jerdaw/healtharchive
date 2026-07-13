"use strict";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- LHCI loads CommonJS config.
const { createLighthouseConfig } = require("./scripts/lighthouse-config.cjs");

module.exports = createLighthouseConfig(process.env.HEALTHARCHIVE_LIGHTHOUSE_ORIGIN);
