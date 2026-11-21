// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * Persian (Farsi) to English search alias expansion table.
 * Normalizes Persian/Arabic character variants so users can type natural Persian queries.
 */
'use strict';

const PERSIAN_QUERY_ALIASES = Object.freeze({
  'بلور': 'blur',
  'محو': 'blur',
  'شارپ': 'sharpen',
  'وضوح': 'sharpen',
  'ماسک': 'mask',
  'رنگ': 'color',
  'برش': 'crop',
  'کراپ': 'crop',
  'لایه': 'layer',
  'انتخاب': 'select',
  'زوم': 'zoom',
  'خروجی': 'export',
  'ذخیره': 'save',
  'نویز': 'noise',
  'براش': 'brush',
  'قلم': 'brush',
  'پاک کن': 'eraser',
  'متن': 'type',
  'تایپ': 'type',
  'گرادینت': 'gradient',
  'کنتراست': 'contrast',
  'روشنایی': 'brightness',
  'نوردهی': 'exposure',
  'منحنی': 'curves',
  'سیاه و سفید': 'black white',
  'ادغام': 'merge',
  'گروه': 'group',
  'قفل': 'lock',
  'چرخش': 'rotate',
  'قرینه': 'flip',
  'راهنما': 'guides',
  'خط کش': 'rulers',
  'شبکه': 'grid',
});

function normalizeText(input) {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .replace(/\u064A/g, '\u06CC') // Arabic Yeh -> Persian Yeh
    .replace(/\u0643/g, '\u06A9') // Arabic Kaf -> Persian Kaf
    .replace(/[\u200C\u200F]/g, ' ') // ZWNJ / RLM -> space
    .replace(/\s+/g, ' ')
    .trim();
}

function expandPersianQuery(normalizedQuery) {
  if (!normalizedQuery) return [];
  const expansions = [];
  for (const [fa, en] of Object.entries(PERSIAN_QUERY_ALIASES)) {
    if (normalizedQuery.includes(fa)) {
      expansions.push(en);
    }
  }
  return expansions;
}

module.exports = {
  PERSIAN_QUERY_ALIASES,
  normalizeText,
  expandPersianQuery,
};
