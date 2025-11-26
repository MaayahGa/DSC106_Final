// -----------------------
// Miscellaneous Clash Royale Stats (Mock Data)
// -----------------------
const mockData = [
  { card: "Mega Knight", winrate: 56, elixir: 7 },
  { card: "Hog Rider", winrate: 52, elixir: 4 },
  { card: "Miner", winrate: 54, elixir: 3 },
  { card: "Royal Giant", winrate: 51, elixir: 6 },
  { card: "Firecracker", winrate: 49, elixir: 3 },
  { card: "Valkyrie", winrate: 53, elixir: 4 }
];

const average = arr => arr.reduce((a, b) => a + b) / arr.length;

// Card stats calculations
const mostPopularCard = mockData[0].card;
const avgElixir = average(mockData.map(d => d.elixir)).toFixed(1);
const highestWinrate = mockData.reduce((a, b) => (a.winrate > b.winrate ? a : b));
const totalCards = mockData.length;

// Fill text elements
document.getElementById("popular-card").textContent = mostPopularCard;
document.getElementById("avg-elixir").textContent = avgElixir;
document.getElementById("winrate-card").textContent = highestWinrate.card;
document.getElementById("card-count").textContent = totalCards;

// -----------------------
// Arena Journey
// -----------------------
const arenas = [
  { name: "Goblin Stadium", min: 0, max: 299, img: "images/download-1.jpg" },
  { name: "Bone Pit", min: 300, max: 599, img: "images/download.jpg" },
  { name: "Barbarian Bowl", min: 600, max: 999, img: "images/download-2.jpg" },
  { name: "P.E.K.K.A's Playhouse", min: 1000, max: 1299, img: "images/download-3.jpg" },
  { name: "Spell Valley", min: 1300, max: 1599, img: "images/download-4.jpg" },
  { name: "Builder's Workshop", min: 1600, max: 1999, img: "images/download-5.jpg" },
  { name: "Royal Arena", min: 2000, max: 2299, img: "images/download-6.jpg" },
  { name: "Frozen Peak", min: 2300, max: 2599, img: "images/download-7.jpg" },
  { name: "Jungle Arena", min: 2600, max: 2999, img: "images/download-8.jpg" },
  { name: "Hog Mountain", min: 3000, max: 3399, img: "images/download-9.jpg" },
  { name: "Electro Valley", min: 3400, max: 3799, img: "images/download-10.jpg" },
  { name: "Spooky Town", min: 3800, max: 4199, img: "images/download-11.jpg" },
  { name: "Rascal's Hideout", min: 4200, max: 4599, img: "images/download-12.jpg" },
  { name: "Serenity Peak", min: 4600, max: 4999, img: "images/download-13.jpg" },
  { name: "Miner's Mine", min: 5000, max: 5499, img: "images/download-14.jpg" },
  { name: "Legendary", min: 5500, max: Infinity, img: "images/download-15.jpg" }
];

const arenaContainer = document.getElementById("arena-container");
arenas.forEach(arena => {
  const div = document.createElement("div");
  div.className = "arena-card";
  div.innerHTML = `
    <h3>${arena.name}</h3>
    <p class="trophies">Trophies: ${arena.trophies}</p>
    <div class="arena-image">
      <img src="${arena.img}" alt="${arena.name} image" />
    </div>
  `;
  arenaContainer.appendChild(div);
});

// -----------------------
// Interactive Card Usage Chart
// -----------------------
document.addEventListener("DOMContentLoaded", () => {
  Promise.all([
      d3.csv("archive/CardMasterListSeason18_12082020.csv"),
      d3.csv("archive/Wincons.csv"),
      d3.csv("archive/BattlesStaging_12312020_WL_tagged/BattlesStaging_sample.csv")
  ]).then(([cards, wincons, battles]) => {

      // Map card ID -> Name
      const cardNameById = {};
      cards.forEach(d => {
          cardNameById[d["team.card1.id"]] = d["team.card1.name"];
      });

      // Function: compute card counts for a given set of battles
      function computeCardCounts(filteredBattles) {
          const counts = {};

          function add(id) {
              if (!id) return;
              if (!counts[id]) counts[id] = 0;
              counts[id] += 1;
          }

          filteredBattles.forEach(row => {
              for (let i = 1; i <= 8; i++) {
                  add(row[`winner.card${i}.id`]);
                  add(row[`loser.card${i}.id`]);
              }
          });

          return Object.keys(counts).map(id => ({
              id,
              name: cardNameById[id] || "Unknown",
              count: counts[id]
          })).sort((a, b) => b.count - a.count);
      }

      // Initial card data (all battles)
      let cardData = computeCardCounts(battles);

      // Chart dimensions
      const svgWidth = 800;
      const svgHeight = 500;
      const margin = { top: 30, right: 60, bottom: 40, left: 150 };
      const chartWidth = svgWidth - margin.left - margin.right;

      const barHeight = 30;

      const svg = d3.select("#chart")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .range([0, chartWidth - 50]);

      const y = d3.scaleBand()
        .padding(0.1);

      // Chart update function
      function updateChart(data) {
          x.domain([0, d3.max(data, d => d.count)]);
          y.domain(data.map(d => d.name))
            .range([0, data.length * (barHeight + 5)]);

          // Bars
          const bars = g.selectAll(".bar")
              .data(data, d => d.id);

          bars.join(
              enter => enter.append("rect")
                  .attr("class", "bar")
                  .attr("y", d => y(d.name))
                  .attr("height", y.bandwidth())
                  .attr("width", d => x(d.count))
                  .attr("fill", "#4A90E2"),
              update => update.transition().duration(500)
                  .attr("y", d => y(d.name))
                  .attr("width", d => x(d.count)),
              exit => exit.remove()
          );

          // Bar labels (name)
          const labels = g.selectAll(".barLabel")
              .data(data, d => d.id);

          labels.join(
              enter => enter.append("text")
                  .attr("class", "barLabel")
                  .attr("x", -10)
                  .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
                  .attr("text-anchor", "end")
                  .text(d => d.name),
              update => update.transition().duration(500)
                  .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5),
              exit => exit.remove()
          );

          // Count labels
          const countLabels = g.selectAll(".countLabel")
              .data(data, d => d.id);

          countLabels.join(
              enter => enter.append("text")
                  .attr("class", "countLabel")
                  .attr("x", d => x(d.count) + 5)
                  .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
                  .text(d => d.count),
              update => update.transition().duration(500)
                  .attr("x", d => x(d.count) + 5)
                  .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
                  .text(d => d.count),
              exit => exit.remove()
          );
      }

      // INITIAL DRAW
      updateChart(cardData);

      // Hook arena click → filter chart
      const arenaDivs = arenaContainer.querySelectorAll(".arena-card");

      arenaDivs.forEach((div, index) => {
          const arena = arenas[index];

          div.addEventListener("click", () => {
              const min = arena.min;
              const max = arena.max;

              const filteredBattles = battles.filter(row => {
                  const t = +row["winner.startingTrophies"];
                  return t >= min && t <= max;
              });

              const newCardData = computeCardCounts(filteredBattles);

              updateChart(newCardData);
          });
      });

  }).catch(err => console.error("Error loading CSV files:", err));
});