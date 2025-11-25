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
  { name: "Goblin Stadium", trophies: "0+", img: "images/download-1.jpg" },
  { name: "Bone Pit", trophies: "300+", img: "images/download.jpg" },
  { name: "Barbarian Bowl", trophies: "600+", img: "images/download-2.jpg" },
  { name: "P.E.K.K.A's Playhouse", trophies: "1000+", img: "images/download-3.jpg" },
  { name: "Spell Valley", trophies: "1300+", img: "images/download-4.jpg" },
  { name: "Builder's Workshop", trophies: "1600+", img: "images/download-5.jpg" },
  { name: "Royal Arena", trophies: "2000+", img: "images/download-6.jpg" },
  { name: "Frozen Peak", trophies: "2300+", img: "images/download-7.jpg" },
  { name: "Jungle Arena", trophies: "2600+", img: "images/download-8.jpg" },
  { name: "Hog Mountain", trophies: "3000+", img: "images/download-9.jpg" },
  { name: "Electro Valley", trophies: "3400+", img: "images/download-10.jpg" },
  { name: "Spooky Town", trophies: "3800+", img: "images/download-11.jpg" },
  { name: "Rascal's Hideout", trophies: "4200+", img: "images/download-12.jpg" },
  { name: "Serenity Peak", trophies: "4600+", img: "images/download-13.jpg" },
  { name: "Miner's Mine", trophies: "5000+", img: "images/download-14.jpg" },
  { name: "Legendary", trophies: "5500+", img: "images/download-15.jpg" }
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

      const cardNameById = {};
      cards.forEach(d => {
          cardNameById[d["team.card1.id"]] = d["team.card1.name"];
      });

      const cardCounts = {};
      function addCard(id) {
          if (!id) return;
          if (!cardCounts[id]) cardCounts[id] = 0;
          cardCounts[id] += 1;
      }

      battles.forEach(row => {
          for (let i = 1; i <= 8; i++) {
              addCard(row[`winner.card${i}.id`]);
              addCard(row[`loser.card${i}.id`]);
          }
      });

      const cardData = Object.keys(cardCounts).map(id => ({
          id,
          name: cardNameById[id] || "Unknown",
          count: cardCounts[id]
      }));

      cardData.sort((a, b) => b.count - a.count);

      const svgWidth = 800;
      const svgHeight = 500; // visible viewport
      const margin = { top: 30, right: 60, bottom: 40, left: 150 };
      const chartWidth = svgWidth - margin.left - margin.right;
      const chartHeight = svgHeight - margin.top - margin.bottom;

      const barHeight = 30;
      const totalHeight = cardData.length * (barHeight + 5); // spacing

      const svg = d3.select("#chart")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

      // Group for scrolling
      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .domain([0, d3.max(cardData, d => d.count)])
        .range([0, chartWidth - 50]);

      const y = d3.scaleBand()
        .domain(cardData.map(d => d.name))
        .range([0, totalHeight])
        .padding(0.1);

      // Bars
      g.selectAll(".bar")
        .data(cardData, d => d.id)
        .join("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.name))
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.count))
        .attr("fill", "#4A90E2");

      // Card name
      g.selectAll(".barLabel")
        .data(cardData, d => d.id)
        .join("text")
        .attr("class", "barLabel")
        .attr("x", -10)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
        .attr("text-anchor", "end")
        .attr("fill", "#333")
        .text(d => d.name);

      // Count label
      g.selectAll(".countLabel")
        .data(cardData, d => d.id)
        .join("text")
        .attr("class", "countLabel")
        .attr("x", d => x(d.count) + 5)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
        .text(d => d.count);

      // Scroll via wheel
      let scrollOffset = 0;
      const maxOffset = Math.max(0, totalHeight - chartHeight);

      svg.on("wheel", (event) => {
          event.preventDefault();
          scrollOffset += event.deltaY;
          scrollOffset = Math.max(0, Math.min(scrollOffset, maxOffset));
          g.attr("transform", `translate(${margin.left},${margin.top - scrollOffset})`);
      });

  }).catch(err => console.error("Error loading CSV files:", err));
});
