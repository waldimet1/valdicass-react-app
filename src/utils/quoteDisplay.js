// src/utils/quoteDisplay.js
export const quoteDisplayId = (q, id) =>
  q?.number || q?.quoteNumber || q?.customId || id;
