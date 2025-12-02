// story.js
// Handles: discrete slide navigation + rendering arena charts
// Assumes common.js provides either:
//   - loadStoryData(): Promise that resolves when STORY_CHART_DATA is ready
//   - and a global STORY_CHART_DATA object shaped like:
//       {
//         "Spooky Town": [
//           { card_name: "Skeleton Army", bin: "toxic_troop", wins: 123 },
//           { card_name: "The Log",        bin: "cheap_spell",  wins: 95  },
//           ...
//         ],
//         "Rascal's Hideout": [...],
//         "Serenity Peak": [...],
//         "Legendary Arena": [...]
//       }

(function () {
  "use strict";

  let slides = [];
  let currentIndex = 0;

  const STORY_ARENAS = [
    { id: "#chart-spooky-town", arenaName: "Spooky Town" },
    { id: "#chart-rascals-hideout", arenaName: "Rascal's Hideout" },
    { id: "#chart-serenity-peak", arenaName: "Serenity Peak" },
    { id: "#chart-miners-mine", arenaName: "Miner's Mine" },
    { id: "#chart-legendary-arena", arenaName: "Legendary Arena" },
  ];

  // ---------- SLIDE NAVIGATION ----------

  function showSlide(index) {
    if (!slides.length) return;

    const clamped = Math.max(0, Math.min(index, slides.length - 1));

    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === clamped);
    });

    currentIndex = clamped;
    updateNavButtons();
    updateClickHint();
  }

  function nextSlide() {
    if (currentIndex < slides.length - 1) {
      showSlide(currentIndex + 1);
    }
  }

  function handleClickToAdvance(event) {
    // Don’t auto-advance when user is interacting with explorer controls
    const explorerSlideEl = document.querySelector(".slide--explorer");
    const isExplorerActive =
      explorerSlideEl?.classList.contains("is-active") || false;

    const clickedInsideExplorer =
      event.target.closest(".explorer-controls") ||
      event.target.closest(".explorer-chart");

    const clickedNav = event.target.closest(".site-nav");

    if (isExplorerActive && (clickedInsideExplorer || clickedNav)) {
      return;
    }

    // Otherwise, click anywhere advances (until final slide)
    nextSlide();
  }

  function setupNavButtons() {
    const navButtons = document.querySelectorAll(".nav-link");
    navButtons.forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation(); // prevent also advancing by click handler
        const idx = parseInt(btn.getAttribute("data-target-slide"), 10);
        if (!Number.isNaN(idx)) {
          showSlide(idx);
        }
      });
    });
  }

  function updateNavButtons() {
    const navButtons = document.querySelectorAll(".nav-link");
    navButtons.forEach((btn) => {
      const idx = parseInt(btn.getAttribute("data-target-slide"), 10);
      btn.classList.toggle("nav-link--active", idx === currentIndex);
    });
  }

  function updateClickHint() {
    const hint = document.querySelector(".click-advance-hint");
    if (!hint) return;

    if (currentIndex >= slides.length - 1) {
      hint.classList.add("is-hidden");
    } else {
      hint.classList.remove("is-hidden");
    }
  }

  function initSlides() {
    slides = Array.from(document.querySelectorAll(".slide"));

    if (!slides.length) return;

    // Ensure only the first slide starts active
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === 0);
    });
    currentIndex = 0;

    setupNavButtons();
    updateNavButtons();
    updateClickHint();

    const app = document.querySelector("#app");
    if (app) {
      app.addEventListener("click", handleClickToAdvance);
    }
  }

  // ---------- ARENA CHARTS ----------

  function getArenaData(arenaName) {
    if (!window.STORY_CHART_DATA) {
      console.warn("STORY_CHART_DATA is not defined (from common.js).");
      return [];
    }

    const arenaData = window.STORY_CHART_DATA[arenaName] || [];
    // Focus only on the two bins we care about
    return arenaData.filter(
      (d) => d.bin === "toxic_troop" || d.bin === "cheap_spell"
    );
  }



  function renderArenaChart(containerSelector, arenaName) {
    const container = d3.select(containerSelector);
    if (container.empty()) return;

    const data = getArenaData(arenaName);
    if (!data.length) {
      container.text("No data available for this arena yet.");
      return;
    }

    // NEW: sort bars by wins (descending) so tallest is on the left
    const sortedData = data.slice().sort((a, b) => d3.descending(a.wins, b.wins));

    // Clear previous render (for resize)
    container.selectAll("*").remove();

    const node = container.node();
    const fullWidth = Math.max(320, node.clientWidth || 320);
    const margin = { top: 30, right: 40, bottom: 80, left: 60 };
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
      .domain(sortedData.map((d) => d.card_name))   // use sorted order
      .range([0, width])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(sortedData, (d) => d.wins) || 1])
      .nice()
      .range([height, 0]);

    const color = d3
      .scaleOrdinal()
      .domain(["toxic_troop", "cheap_spell"])
      .range(["#d62728", "#1f77b4"]); // toxic = red, cheap spells = blue

    // Bars
    g.selectAll(".bar")
      .data(sortedData, (d) => d.card_name)
      .join("rect")
      .attr("class", "bar")
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

    // Mean lines for each bin (using sortedData is fine – order doesn’t matter)
    const toxicValues = sortedData
      .filter((d) => d.bin === "toxic_troop")
      .map((d) => d.wins);
    const spellValues = sortedData
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

    // Simple legend (unchanged)
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${margin.left}, 10)`);

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
  function renderStoryCharts() {
    STORY_ARENAS.forEach((cfg) => {
      renderArenaChart(cfg.id, cfg.arenaName);
    });
  }

  // ---------- INIT ----------

  function initStory() {
    initSlides();

    if (typeof window.loadStoryData === "function") {
      // common.js will probably read CSVs, compute STORY_CHART_DATA, etc.
      window.loadStoryData().then(renderStoryCharts);
    } else {
      // If data is already on the page, just try to render immediately
      renderStoryCharts();
    }

    // Re-render charts when window size changes
    window.addEventListener("resize", () => {
      renderStoryCharts();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStory);
  } else {
    initStory();
  }
})();
