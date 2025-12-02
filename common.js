const toxicTroops = ["Skeleton Army", "Wizard", "Valkyrie", "Mega Knight"];
const cheapSpells = ["The Log", "Zap", "Barbarian Barrel"];

const cardBins = {};
toxicTroops.forEach(c => cardBins[c] = "Toxic Troop");
cheapSpells.forEach(c => cardBins[c] = "Cheap Spell");

// Map arena div → CSV count column
const arenaColumnMap = {
  "chart-spooky-town": "count_0",
  "chart-rascals-hideout": "count_1",
  "chart-serenity-peak": "count_2",
  "chart-miners-mine": "count_3",
  "chart-legendary-arena": "count_4"
};

// Load CSV once
d3.csv("CardList.csv").then(data => {
  data.forEach(d => {
    // Convert numeric fields
    for (let k of ["count_0","count_1","count_2","count_3","count_4"]) {
      d[k] = +d[k];
    }
  });

  // Render chart for each arena container
  d3.selectAll(".chart--arena").each(function() {
    const container = d3.select(this);
    const id = container.attr("id");
    const column = arenaColumnMap[id];

    if (!column) return; // skip unknown divs

    renderArenaChart(container, data, column);
  });
});


// Render one arena's bar chart
function renderArenaChart(container, data, colName) {
  // Filter only the cards in the 2 bins
  const filtered = data.filter(d => cardBins[d["team.card1.name"]]);

  // Aggregate by card for this arena
  const aggregated = d3.rollups(
    filtered,
    v => d3.sum(v, d => d[colName]),
    d => d["team.card1.name"]
  ).map(([card, wins]) => ({
    card,
    wins,
    bin: cardBins[card]
  }));

  // ---- DRAW THE CHART ----
  const margin = { top: 20, right: 20, bottom: 70, left: 50 };
  const width = 500 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(aggregated.map(d => d.card))
    .range([0, width])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(aggregated, d => d.wins)])
    .nice()
    .range([height, 0]);

  // Bars
  svg
    .selectAll("rect")
    .data(aggregated)
    .enter()
    .append("rect")
    .attr("x", d => x(d.card))
    .attr("y", d => y(d.wins))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.wins))
    .attr("fill", d => (d.bin === "Toxic Troop" ? "#c0392b" : "#27ae60"));

  // X-axis
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-0.5em")
    .attr("dy", "0.15em")
    .attr("transform", "rotate(-40)");

  // Y-axis
  svg.append("g").call(d3.axisLeft(y));

  // Title (use container’s data-arena attribute)
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text(container.attr("data-arena") + " — Wins by Card");
}