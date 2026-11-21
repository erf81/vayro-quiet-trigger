// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * Safe environment adapter for Adobe Photoshop UXP APIs.
 * Allows the core modules to run both inside Photoshop UXP and in Node.js unit tests.
 */
'use strict';

let _mockEnv = null;

function setMockEnv(mock) {
  _mockEnv = mock;
}

function getPhotoshop() {
  if (_mockEnv && _mockEnv.photoshop) return _mockEnv.photoshop;
  try {
    return require('photoshop');
  } catch (_) {
    return null;
  }
}

function getUXP() {
  if (_mockEnv && _mockEnv.uxp) return _mockEnv.uxp;
  try {
    return require('uxp');
  } catch (_) {
    return null;
  }
}

function isUXPEnvironment() {
  return Boolean(getPhotoshop());
}

module.exports = {
  setMockEnv,
  getPhotoshop,
  getUXP,
  isUXPEnvironment,
};
