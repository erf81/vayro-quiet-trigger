/**
 * Fast local search engine for ZAU Console.
 * Supports exact, prefix, word-boundary, partial, multi-token, fuzzy subsequence,
 * keyword, alias (English + Persian), category filtering, and favorite/recent ranking.
 */
'use strict';

const { normalizeText, expandPersianQuery } = require('./persianAliases');

/**
 * Computes fuzzy subsequence score between query and target (0 if no match).
 */
function fuzzySubsequenceScore(query, target) {
  if (!query || !target || query.length > target.length) return 0;
  let qi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  let firstMatchIdx = -1;
  let wordStarts = 0;

  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) {
      if (firstMatchIdx === -1) firstMatchIdx = ti;
      if (ti === 0 || target[ti - 1] === ' ' || target[ti - 1] === '-' || target[ti - 1] === '/') {
        wordStarts++;
      }
      consecutive++;
      if (consecutive > maxConsecutive) maxConsecutive = consecutive;
      qi++;
    } else {
      consecutive = 0;
    }
  }

  if (qi < query.length) return 0;

  const tightness = query.length / target.length;
  return 20 + maxConsecutive * 4 + wordStarts * 5 + Math.round(tightness * 15) - Math.min(firstMatchIdx, 15);
}

class SearchEngine {
  constructor(commands = []) {
    this._index = [];
    this.setCommands(commands);
  }

  setCommands(commands) {
    this._index = (commands || []).map((cmd) => {
      const nameNorm = normalizeText(cmd.name);
      const categoryNorm = normalizeText(cmd.category);
      const subNorm = normalizeText(cmd.subcategory || '');
      const descNorm = normalizeText(cmd.description || '');
      const keywordsNorm = (cmd.keywords || []).map(normalizeText);
      const aliasesNorm = (cmd.aliases || []).map(normalizeText);
      const allTokensText = [nameNorm, categoryNorm, subNorm, ...keywordsNorm, ...aliasesNorm, descNorm].join(' ');
      return {
        command: cmd,
        nameNorm,
        categoryNorm,
        subNorm,
        descNorm,
        keywordsNorm,
        aliasesNorm,
        allTokensText,
      };
    });
  }

  _scoreItem(entry, queryNorm, extraTerms) {
    let best = 0;

    // 1. Direct name matching
    if (entry.nameNorm === queryNorm) {
      best = Math.max(best, 140);
    } else if (entry.nameNorm.startsWith(queryNorm)) {
      best = Math.max(best, 115);
    } else if (entry.nameNorm.includes(` ${queryNorm}`)) {
      best = Math.max(best, 100);
    } else if (entry.nameNorm.includes(queryNorm)) {
      best = Math.max(best, 88);
    }

    // 2. Alias matching
    for (const alias of entry.aliasesNorm) {
      if (!alias) continue;
      if (alias === queryNorm) {
        best = Math.max(best, 120);
      } else if (alias.startsWith(queryNorm)) {
        best = Math.max(best, 95);
      } else if (alias.includes(queryNorm)) {
        best = Math.max(best, 80);
      }
    }

    // 3. Keyword matching
    for (const kw of entry.keywordsNorm) {
      if (!kw) continue;
      if (kw === queryNorm) {
        best = Math.max(best, 98);
      } else if (kw.startsWith(queryNorm)) {
        best = Math.max(best, 84);
      } else if (kw.includes(queryNorm)) {
        best = Math.max(best, 70);
      }
    }

    // 4. Category / subcategory / description
    if (entry.categoryNorm.startsWith(queryNorm) || entry.subNorm.startsWith(queryNorm)) {
      best = Math.max(best, 62);
    } else if (entry.descNorm.includes(queryNorm)) {
      best = Math.max(best, 50);
    }

    // 5. Multi-word token matching (all words must appear somewhere)
    const tokens = queryNorm.split(' ').filter(Boolean);
    if (tokens.length > 1) {
      let matchedTokens = 0;
      let tokenScore = 0;
      for (const tok of tokens) {
        if (entry.nameNorm.includes(tok)) {
          matchedTokens++;
          tokenScore += 32;
        } else if (entry.allTokensText.includes(tok)) {
          matchedTokens++;
          tokenScore += 20;
        } else {
          const fz = fuzzySubsequenceScore(tok, entry.nameNorm);
          if (fz > 0) {
            matchedTokens++;
            tokenScore += Math.round(fz * 0.5);
          }
        }
      }
      if (matchedTokens === tokens.length) {
        best = Math.max(best, 60 + Math.min(tokenScore, 60));
      }
    }

    // 6. Fuzzy subsequence on name
    if (best === 0 && queryNorm.length >= 2) {
      const fz = fuzzySubsequenceScore(queryNorm, entry.nameNorm);
      if (fz > 0) {
        best = Math.max(best, fz);
      }
    }

    // 7. Persian alias expansion terms
    if (extraTerms && extraTerms.length > 0) {
      for (const term of extraTerms) {
        const subScore = this._scoreItem(entry, term, null);
        if (subScore > 0) {
          best = Math.max(best, subScore - 4);
        }
      }
    }

    return best;
  }

  /**
   * Search commands with filtering and ranking.
   * @param {string} query
   * @param {object} options
   * @returns {Array<{ command, score, isFavorite, isRecent }>}
   */
  search(query, options = {}) {
    const {
      category = 'All',
      favorites = [],
      recentCommands = [],
      disabledCategories = [],
      limit = 50,
    } = options;

    const favSet = new Set(favorites);
    const favOrder = new Map(favorites.map((id, i) => [id, i]));
    const recentOrder = new Map(recentCommands.map((id, i) => [id, i]));
    const disabledSet = new Set(disabledCategories);

    const queryNorm = normalizeText(query);
    const extraTerms = expandPersianQuery(queryNorm);

    const results = [];

    for (const entry of this._index) {
      const cmd = entry.command;
      if (disabledSet.has(cmd.category)) continue;

      if (category === 'Favorites') {
        if (!favSet.has(cmd.id)) continue;
      } else if (category === 'Recent') {
        if (!recentOrder.has(cmd.id)) continue;
      } else if (category && category !== 'All' && cmd.category !== category) {
        continue;
      }

      const isFavorite = favSet.has(cmd.id);
      const isRecent = recentOrder.has(cmd.id);

      if (!queryNorm) {
        // Empty query: show Favorites first (in saved order), then Recents, then default registry order
        let score = 10;
        if (isFavorite) {
          score += 1000 - (favOrder.get(cmd.id) || 0);
        }
        if (isRecent) {
          score += 500 - (recentOrder.get(cmd.id) || 0) * 5;
        }
        results.push({ command: cmd, score, isFavorite, isRecent });
        continue;
      }

      const baseScore = this._scoreItem(entry, queryNorm, extraTerms);
      if (baseScore <= 0) continue;

      let finalScore = baseScore;
      if (isFavorite) finalScore += 14;
      if (isRecent) {
        const recIdx = recentOrder.get(cmd.id);
        finalScore += Math.max(2, 10 - recIdx);
      }

      results.push({ command: cmd, score: finalScore, isFavorite, isRecent });
    }

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.command.name.localeCompare(b.command.name);
    });

    return limit > 0 ? results.slice(0, limit) : results;
  }
}

module.exports = {
  SearchEngine,
  fuzzySubsequenceScore,
};
