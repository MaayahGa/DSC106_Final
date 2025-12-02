// explore.js
// Data exploration playground for Season 18.
//
// Features (from the project manual):
// 1. Display a bar plot similar to the story slides.
// 2. Let users search for cards by name / keyword.
// 3. Let users add searched cards to each of the two bins.
// 4. Let users filter cards by elixir, rarity, and card type. :contentReference[oaicite:1]{index=1}
//
// Assumes common.js exposes:
//   - loadCardData() -> Promise<rows>
//   - ARENA_CONFIG (array of { name, key, index })
//   - getWinsForArena(row, arenaNameOrKey)
//   - getCardBin(name)

(function () {
  "use strict";

  let allCards = [];
  let arenaConfig = [];
  let selectedArenaName = null;

  const state = {
    toxicBin: new Set(), // card_name strings
    spellBin: new Set(),
  };

  function initExplorer() {
    const controlsEl = document.querySelector("#explorer-controls");
    const chartEl = document.querySelector("#explorer-chart");
    if (!controlsEl || !chartEl) return;
    if (typeof window.loadCardData !== "function") return;

    window.loadCardData().then((rows) => {
      allCards = rows || [];
      arenaConfig = window.ARENA_CONFIG || [];

      // Default arena: last one (Legendary Arena)
      selectedArenaName =
        (arenaConfig[arenaConfig.length - 1] || arenaConfig[0] || {}).name ||
        null;

      inferInitialBins();
      buildExplorerUI();
      updateBinLists();
      updateSearchResults();
      updateExplorerChart();
    });
  }

  // Seed bins from the story classification (bin field in CARD_DATA from common.js)
  function inferInitialBins() {
    state.toxicBin.clear();
    state.spellBin.clear();

    allCards.forEach((row) => {
      if (row.bin === "toxic_troop") {
        state.toxicBin.add(row.card_name);
      } else if (row.bin === "cheap_spell") {
        state.spellBin.add(row.card_name);
      }
    });
  }

  // ---------- UI BUILDING ----------

  function buildExplorerUI() {
    const controls = d3.select("#explorer-controls");
    controls.selectAll("*").remove();

    // --- Section 1: Arena selector ---
    const arenaSection = controls
      .append("div")
      .attr("class", "explorer-section");

    arenaSection
      .append("div")
      .attr("class", "explorer-section-title")
      .text("1. Choose an arena");

    const arenaSelect = arenaSection
      .append("select")
      .attr("id", "explorer-arena-select")
      .attr("class", "explorer-select");

    arenaSelect
      .selectAll("option")
      .data(arenaConfig)
      .join("option")
      .attr("value", (d) => d.name)
      .property("selected", (d) => d.name === selectedArenaName)
      .text((d) => d.name);

    arenaSelect.on("change", function () {
      selectedArenaName = this.value;
      updateExplorerChart();
      updateSearchResults();
    });

    // --- Section 2: Search & filters ---
    const filterSection = controls
      .append("div")
      .attr("class", "explorer-section");

    filterSection
      .append("div")
      .attr("class", "explorer-section-title")
      .text("2. Search & filter cards");

    filterSection
      .append("p")
      .attr("class", "explorer-helper-text")
      .text(
        "Search by name or keyword, then add cards into each bin. Filters apply to the search results."
      );

    const searchInput = filterSection
      .append("input")
      .attr("type", "text")
      .attr("id", "explorer-search-input")
      .attr("class", "explorer-input")
      .attr(
        "placeholder",
        "Search by name or keyword (e.g. 'Mega', 'spell', 'zap')"
      );

    const filterRow = filterSection
      .append("div")
      .attr("class", "explorer-filter-row");

    // unique values from data
    const uniqueElixirs = Array.from(
      new Set(
        allCards
          .map((d) => d.elixir)
          .filter((v) => v !== null && v !== undefined && v !== "")
      )
    ).sort((a, b) => a - b);

    const uniqueRarities = Array.from(
      new Set(
        allCards
          .map((d) => d.rarity)
          .filter((v) => v !== null && v !== undefined && v !== "")
      )
    ).sort();

    const uniqueTypes = Array.from(
      new Set(
        allCards
          .map((d) => d.card_type)
          .filter((v) => v !== null && v !== undefined && v !== "")
      )
    ).sort();

    // Elixir filter
    const elixirSelect = filterRow
      .append("select")
      .attr("id", "explorer-elixir-filter")
      .attr("class", "explorer-select explorer-select--small");

    elixirSelect.append("option").attr("value", "").text("Any elixir");
    elixirSelect
      .selectAll("option.elixir-option")
      .data(uniqueElixirs)
      .join("option")
      .attr("class", "elixir-option")
      .attr("value", (d) => d)
      .text((d) => `${d} elixir`);

    // Rarity filter
    const raritySelect = filterRow
      .append("select")
      .attr("id", "explorer-rarity-filter")
      .attr("class", "explorer-select explorer-select--small");

    raritySelect.append("option").attr("value", "").text("Any rarity");
    raritySelect
      .selectAll("option.rarity-option")
      .data(uniqueRarities)
      .join("option")
      .attr("class", "rarity-option")
      .attr("value", (d) => d)
      .text((d) => d);

    // Type filter
    const typeSelect = filterRow
      .append("select")
      .attr("id", "explorer-type-filter")
      .attr("class", "explorer-select explorer-select--small");

    typeSelect.append("option").attr("value", "").text("Any type");
    typeSelect
      .selectAll("option.type-option")
      .data(uniqueTypes)
      .join("option")
      .attr("class", "type-option")
      .attr("value", (d) => d)
      .text((d) => d);

    // Search results container
    filterSection
      .append("div")
      .attr("class", "explorer-section-subtitle")
      .text("Search results");

    filterSection
      .append("div")
      .attr("id", "explorer-search-results")
      .attr("class", "explorer-search-results");

    // --- Section 3: Bin overview + reset buttons ---
    const binsSection = controls
      .append("div")
      .attr("class", "explorer-section explorer-section--bins");

    binsSection
      .append("div")
      .attr("class", "explorer-section-title")
      .text("3. Build your two bins");

    const binsRow = binsSection
      .append("div")
      .attr("class", "explorer-bins-row");

    const toxicCol = binsRow
      .append("div")
      .attr("class", "explorer-bin explorer-bin--toxic");

    toxicCol
      .append("div")
      .attr("class", "explorer-bin-title")
      .text("“Toxic troop” bin");

    toxicCol
      .append("div")
      .attr("id", "explorer-toxic-bin-list")
      .attr("class", "explorer-bin-list");

    const spellCol = binsRow
      .append("div")
      .attr("class", "explorer-bin explorer-bin--spell");

    spellCol
      .append("div")
      .attr("class", "explorer-bin-title")
      .text("“Cheap spell” bin");

    spellCol
      .append("div")
      .attr("id", "explorer-spell-bin-list")
      .attr("class", "explorer-bin-list");

    const resetRow = binsSection
      .append("div")
      .attr("class", "explorer-reset-row");

    resetRow
      .append("button")
      .attr("type", "button")
      .attr("class", "explorer-button")
      .text("Reset to default bins")
      .on("click", () => {
        inferInitialBins();
        updateBinLists();
        updateSearchResults();
        updateExplorerChart();
      });

    resetRow
      .append("button")
      .attr("type", "button")
      .attr("class", "explorer-button explorer-button--ghost")
      .text("Clear both bins")
      .on("click", () => {
        state.toxicBin.clear();
        state.spellBin.clear();
        updateBinLists();
        updateSearchResults();
        updateExplorerChart();
      });

    // Hook up filter change events
    function handleFilterChange() {
      updateSearchResults();
    }

    searchInput.on("input", handleFilterChange);
    elixirSelect.on("change", handleFilterChange);
    raritySelect.on("change", handleFilterChange);
    typeSelect.on("change", handleFilterChange);
  }

  // ---------- SEARCH + FILTER LOGIC ----------

  function getFilteredCards() {
    const term = (d3
      .select("#explorer-search-input")
      .property("value") || ""
    ).toLowerCase();

    const elixirFilter = d3
      .select("#explorer-elixir-filter")
      .property("value");
    const rarityFilter = d3
      .select("#explorer-rarity-filter")
      .property("value");
    const typeFilter = d3
      .select("#explorer-type-filter")
      .property("value");

    let filtered = allCards.slice();

    // Only show cards that are available (have wins) in the selected arena
    if (selectedArenaName && typeof window.getWinsForArena === "function") {
      filtered = filtered.filter(
        (row) => window.getWinsForArena(row, selectedArenaName) > 0
      );
    }

    if (term) {
      filtered = filtered.filter((row) => {
        const name = (row.card_name || "").toLowerCase();
        const type = (row.card_type || "").toLowerCase();
        const rarity = (row.rarity || "").toLowerCase();
        return (
          name.includes(term) || type.includes(term) || rarity.includes(term)
        );
      });
    }

    if (elixirFilter !== "") {
      const elixirVal = Number(elixirFilter);
      filtered = filtered.filter((row) => Number(row.elixir) === elixirVal);
    }

    if (rarityFilter !== "") {
      filtered = filtered.filter((row) => row.rarity === rarityFilter);
    }

    if (typeFilter !== "") {
      filtered = filtered.filter((row) => row.card_type === typeFilter);
    }

    // Sort by wins in the chosen arena, descending
    if (selectedArenaName && typeof window.getWinsForArena === "function") {
      filtered.sort((a, b) =>
        d3.descending(
          window.getWinsForArena(a, selectedArenaName),
          window.getWinsForArena(b, selectedArenaName)
        )
      );
    }

    return filtered;
  }

  function updateSearchResults() {
    const container = d3.select("#explorer-search-results");
    if (container.empty()) return;

    const cards = getFilteredCards().slice(0, 40); // cap list length

    container.selectAll("*").remove();

    if (!cards.length) {
      container
        .append("div")
        .attr("class", "explorer-search-empty")
        .text("No cards match these filters in this arena.");
      return;
    }

    const rows = container
      .selectAll(".explorer-search-card")
      .data(cards, (d) => d.card_name)
      .join("div")
      .attr("class", "explorer-search-card");

    rows.each(function (d) {
      const rowSel = d3.select(this);
      rowSel.selectAll("*").remove();

      const info = rowSel
        .append("div")
        .attr("class", "explorer-search-card-info");

      info
        .append("div")
        .attr("class", "explorer-search-card-name")
        .text(d.card_name);

      const metaParts = [];
      if (d.card_type) metaParts.push(d.card_type);
      if (d.rarity) metaParts.push(d.rarity);
      if (d.elixir !== undefined && d.elixir !== null) {
        metaParts.push(`${d.elixir} elixir`);
      }

      info
        .append("div")
        .attr("class", "explorer-search-card-meta")
        .text(metaParts.join(" · "));

      const buttons = rowSel
        .append("div")
        .attr("class", "explorer-search-card-buttons");

      // Toxic bin button
      const inToxic = state.toxicBin.has(d.card_name);
      const toxicBtn = buttons
        .append("button")
        .attr("type", "button")
        .attr(
          "class",
          "explorer-button explorer-button--tiny explorer-button--toxic"
        )
        .text(inToxic ? "In toxic bin" : "Add to toxic");

      if (inToxic) {
        toxicBtn.attr("disabled", true);
      } else {
        toxicBtn.on("click", (event) => {
          event.stopPropagation();
          addToBin("toxic", d.card_name);
        });
      }

      // Cheap spell bin button
      const inSpell = state.spellBin.has(d.card_name);
      const spellBtn = buttons
        .append("button")
        .attr("type", "button")
        .attr(
          "class",
          "explorer-button explorer-button--tiny explorer-button--spell"
        )
        .text(inSpell ? "In cheap bin" : "Add to cheap");

      if (inSpell) {
        spellBtn.attr("disabled", true);
      } else {
        spellBtn.on("click", (event) => {
          event.stopPropagation();
          addToBin("spell", d.card_name);
        });
      }
    });
  }

  // ---------- BIN MANAGEMENT ----------

  function addToBin(binKey, cardName) {
    if (!cardName) return;

    if (binKey === "toxic") {
      state.spellBin.delete(cardName);
      state.toxicBin.add(cardName);
    } else if (binKey === "spell") {
      state.toxicBin.delete(cardName);
      state.spellBin.add(cardName);
    }

    updateBinLists();
    updateSearchResults();
    updateExplorerChart();
  }

  function updateBinLists() {
    const toxicList = d3.select("#explorer-toxic-bin-list");
    const spellList = d3.select("#explorer-spell-bin-list");

    if (toxicList.empty() || spellList.empty()) return;

    toxicList.selectAll("*").remove();
    spellList.selectAll("*").remove();

    const toxicCards = Array.from(state.toxicBin).sort();
    const spellCards = Array.from(state.spellBin).sort();

    if (!toxicCards.length) {
      toxicList
        .append("div")
        .attr("class", "explorer-bin-empty")
        .text("No cards yet. Add from the search results.");
    } else {
      const items = toxicList
        .selectAll(".explorer-bin-pill")
        .data(toxicCards, (d) => d)
        .join("div")
        .attr("class", "explorer-bin-pill explorer-bin-pill--toxic");

      items
        .append("span")
        .attr("class", "explorer-bin-pill-label")
        .text((d) => d);

      items
        .append("button")
        .attr("type", "button")
        .attr("class", "explorer-bin-pill-remove")
        .text("×")
        .on("click", (event, d) => {
          event.stopPropagation();
          state.toxicBin.delete(d);
          updateBinLists();
          updateSearchResults();
          updateExplorerChart();
        });
    }

    if (!spellCards.length) {
      spellList
        .append("div")
        .attr("class", "explorer-bin-empty")
        .text("No cards yet. Add from the search results.");
    } else {
      const items = spellList
        .selectAll(".explorer-bin-pill")
        .data(spellCards, (d) => d)
        .join("div")
        .attr("class", "explorer-bin-pill explorer-bin-pill--spell");

      items
        .append("span")
        .attr("class", "explorer-bin-pill-label")
        .text((d) => d);

      items
        .append("button")
        .attr("type", "button")
        .attr("class", "explorer-bin-pill-remove")
        .text("×")
        .on("click", (event, d) => {
          event.stopPropagation();
          state.spellBin.delete(d);
          updateBinLists();
          updateSearchResults();
          updateExplorerChart();
        });
    }
  }

  // ---------- CHART RENDERING ----------

  function buildChartDataForArena() {
    if (!selectedArenaName) return [];

    const byName = new Map(allCards.map((row) => [row.card_name, row]));
    const combined = [];

    state.toxicBin.forEach((name) => {
      const row = byName.get(name);
      if (!row) return;
      const wins = window.getWinsForArena
        ? window.getWinsForArena(row, selectedArenaName)
        : 0;
      if (wins <= 0) return;
      combined.push({
        card_name: name,
        bin: "toxic_troop",
        wins,
      });
    });

    state.spellBin.forEach((name) => {
      const row = byName.get(name);
      if (!row) return;
      const wins = window.getWinsForArena
        ? window.getWinsForArena(row, selectedArenaName)
        : 0;
      if (wins <= 0) return;
      combined.push({
        card_name: name,
        bin: "cheap_spell",
        wins,
      });
    });

    // Sort by wins, tallest on the left (like the story slides)
    combined.sort((a, b) => d3.descending(a.wins, b.wins));

    return combined;
  }

  function updateExplorerChart() {
    const container = d3.select("#explorer-chart");
    if (container.empty()) return;

    container.selectAll("*").remove();

    if (!selectedArenaName) {
      container
        .append("div")
        .attr("class", "explorer-chart-empty")
        .text("Select an arena to see the comparison.");
      return;
    }

    const data = buildChartDataForArena();

    if (!data.length) {
      container
        .append("div")
        .attr("class", "explorer-chart-empty")
        .text(
          "No cards in your bins have wins in this arena. Try adding cards or switching arenas."
        );
      return;
    }

    const node = container.node();
    const fullWidth = Math.max(320, node.clientWidth || 320);
    const margin = { top: 32, right: 40, bottom: 80, left: 60 };
    const width = fullWidth - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

    const svg = container
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.card_name))
      .range([0, width])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.wins) || 1])
      .nice()
      .range([height, 0]);

    const color = d3
      .scaleOrdinal()
      .domain(["toxic_troop", "cheap_spell"])
      .range(["#d62728", "#1f77b4"]);

    // Bars
    g.selectAll(".explorer-bar")
      .data(data, (d) => d.card_name)
      .join("rect")
      .attr("class", "explorer-bar")
      .attr("x", (d) => x(d.card_name))
      .attr("y", (d) => y(d.wins))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.wins))
      .attr("fill", (d) => color(d.bin));

    // Axes
    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("class", "axis-label")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-35)")
      .attr("dx", "-0.45em")
      .attr("dy", "0.7em");

    g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y).ticks(5));

    // Mean lines per bin
    const toxicValues = data
      .filter((d) => d.bin === "toxic_troop")
      .map((d) => d.wins);
    const spellValues = data
      .filter((d) => d.bin === "cheap_spell")
      .map((d) => d.wins);

    const toxicMean = toxicValues.length ? d3.mean(toxicValues) : null;
    const spellMean = spellValues.length ? d3.mean(spellValues) : null;

    const meanGroup = g.append("g").attr("class", "means");

    if (toxicMean != null) {
      meanGroup
        .append("line")
        .attr("class", "mean-line mean-line--toxic")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(toxicMean))
        .attr("y2", y(toxicMean));

      meanGroup
        .append("text")
        .attr("class", "mean-label mean-label--toxic")
        .attr("x", width)
        .attr("y", y(toxicMean) - 4)
        .attr("text-anchor", "end")
        .text("Toxic troop mean");
    }

    if (spellMean != null) {
      meanGroup
        .append("line")
        .attr("class", "mean-line mean-line--spell")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(spellMean))
        .attr("y2", y(spellMean));

      meanGroup
        .append("text")
        .attr("class", "mean-label mean-label--spell")
        .attr("x", width)
        .attr("y", y(spellMean) - 4)
        .attr("text-anchor", "end")
        .text("Cheap spell mean");
    }

    // Legend
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${margin.left}, ${margin.top - 16})`
      );

    const legendItems = [
      { label: "Toxic troop", key: "toxic_troop" },
      { label: "Cheap spell", key: "cheap_spell" },
    ];

    const legendEntry = legend
      .selectAll(".legend-item")
      .data(legendItems)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(${i * 140}, 0)`);

    legendEntry
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("fill", (d) => color(d.key));

    legendEntry
      .append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("class", "legend-label")
      .text((d) => d.label);
  }

  // ---------- INIT ----------

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExplorer);
  } else {
    initExplorer();
  }
})();
