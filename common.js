// common.js
// Shared data loading + helpers for story.js (and later explore.js)
//
// CardList.csv columns (from your description):
//   - card_name: name of the card
//   - card_type: troop / spell / building
//   - elixir: elixir cost
//   - rarity: Common / Rare / Epic / Legendary
//   - count_0: # wins in Spooky Town
//   - count_1: # wins in Rascal's Hideout
//   - count_2: # wins in Serenity Peak
//   - count_3: # wins in Miner's Mine
//   - count_4: # wins in Legendary Arena
//   - overall_count: total # wins across these arenas
//
// This file exposes on `window`:
//   - ARENA_CONFIG: metadata for each arena
//   - loadCardData(): Promise<cardRows[]>
//   - getCardBin(cardName): 'toxic_troop' | 'cheap_spell' | 'other'
//   - getWinsForArena(cardRow, arenaNameOrKey): number
//   - loadStoryData(): Promise<STORY_CHART_DATA>
//   - STORY_CHART_DATA: { [arenaName]: [{ card_name, bin, wins, ... }, ...] }
//
// Story charts follow your plan: for each arena, bar chart with
// #wins as y-axis, cards in two bins, and mean lines per bin. :contentReference[oaicite:0]{index=0}

(function () {
  "use strict";

  // ---------- CONFIG ----------

  const CARD_DATA_PATH = "data/CardList.csv";

  // Bins from your project plan (current version: 4 toxic troops, 2 cheap spells)
  const TOXIC_TROOPS = [
    "Skeleton Army",
    "Wizard",
    "Valkyrie",
    "Mega Knight",
  ];

  const CHEAP_SPELLS = [
    "The Log",
    "Zap",
  ];

  // Union order used for x-axis ordering in the arena charts
  const BIN_CARD_ORDER = TOXIC_TROOPS.concat(CHEAP_SPELLS);

  // Arena metadata (names MUST match story.html & story.js) :contentReference[oaicite:1]{index=1}
  const ARENA_CONFIG = [
    { index: 0, key: "count_0", name: "Spooky Town" },
    { index: 1, key: "count_1", name: "Rascal's Hideout" },
    { index: 2, key: "count_2", name: "Serenity Peak" },
    { index: 3, key: "count_3", name: "Miner's Mine" },
    { index: 4, key: "count_4", name: "Legendary Arena" },
  ];

  // ---------- INTERNAL STATE ----------

  let cardDataPromise = null;

  // Lowercased lookup sets for bins
  const toxicSet = new Set(TOXIC_TROOPS.map((n) => n.toLowerCase()));
  const cheapSet = new Set(CHEAP_SPELLS.map((n) => n.toLowerCase()));

  // ---------- HELPERS ----------

  function getCardBin(cardName) {
    const key = (cardName || "").toLowerCase();
    if (toxicSet.has(key)) return "toxic_troop";
    if (cheapSet.has(key)) return "cheap_spell";
    return "other";
  }

  // Load CardList.csv once, cache the result, annotate rows with bin
  function loadCardData() {
    if (!cardDataPromise) {
      cardDataPromise = d3
        .csv(CARD_DATA_PATH, d3.autoType)
        .then((rows) => {
          rows.forEach((row) => {
            row.bin = getCardBin(row.card_name);
          });

          // Expose for explore.js and debugging later
          window.CARD_DATA = rows;
          window.ARENA_CONFIG = ARENA_CONFIG;
          return rows;
        })
        .catch((err) => {
          console.error("Error loading CardList.csv:", err);
          throw err;
        });
    }
    return cardDataPromise;
  }

  /**
   * Get #wins for a card in a specific arena.
   * arenaNameOrKey can be:
   *   - "Spooky Town" (matches ARENA_CONFIG.name)
   *   - "count_0"     (matches ARENA_CONFIG.key)
   */
  function getWinsForArena(cardRow, arenaNameOrKey) {
    if (!cardRow) return 0;

    let key = arenaNameOrKey;
    if (!key) return 0;

    // If we were passed an arena NAME, look up its key
    if (!/^count_/.test(key)) {
      const arenaMeta = ARENA_CONFIG.find((a) => a.name === key);
      key = arenaMeta ? arenaMeta.key : null;
    }

    if (!key) return 0;

    const value = cardRow[key];
    if (typeof value === "number" && isFinite(value)) {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // Build the story chart data:
  // STORY_CHART_DATA = { [arenaName]: [{ card_name, bin, wins, ... }, ...] }
  function buildStoryChartData(rows) {
    const byName = new Map(
      rows.map((r) => [String(r.card_name || "").toLowerCase(), r])
    );

    const storyData = {};

    ARENA_CONFIG.forEach((arena) => {
      const arenaRows = [];

      BIN_CARD_ORDER.forEach((name) => {
        const rec = byName.get(String(name).toLowerCase()) || null;
        if (!rec) {
          // If one of our bin cards is missing from the CSV, just skip it.
          return;
        }

        const wins = getWinsForArena(rec, arena.key);

        // If you ever add explicit availability flags, you can refine this filter.
        if (wins <= 0) {
          // Treat non-positive wins as "not available / not meaningful" in this arena.
          return;
        }

        const bin = getCardBin(rec.card_name);
        if (bin === "other") {
          // Shouldn't happen for cards in BIN_CARD_ORDER, but be safe.
          return;
        }

        arenaRows.push({
          card_name: rec.card_name,
          bin,
          wins,
          arena: arena.name,
          card_type: rec.card_type,
          elixir: rec.elixir,
          rarity: rec.rarity,
        });
      });

      storyData[arena.name] = arenaRows;
    });

    return storyData;
  }

  function loadStoryData() {
    // If we've already built STORY_CHART_DATA once, just reuse it.
    if (window.STORY_CHART_DATA) {
      return Promise.resolve(window.STORY_CHART_DATA);
    }

    return loadCardData().then((rows) => {
      const storyData = buildStoryChartData(rows);
      window.STORY_CHART_DATA = storyData;
      return storyData;
    });
  }

  // ---------- EXPOSE GLOBAL API ----------

  window.ARENA_CONFIG = ARENA_CONFIG;
  window.loadCardData = loadCardData;
  window.getCardBin = getCardBin;
  window.getWinsForArena = getWinsForArena;
  window.loadStoryData = loadStoryData;
})();
