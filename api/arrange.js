// Serverless function for Vercel: Generate bracelet arrangement based on five-element target ratios
// Usage: POST { numBeads: number, ratios: { goal: {metal,wood,water,fire,earth}, colors: {...} }, seed?: number }
const DEFAULT_COLOR = '#ccc';

// Simple seedable PRNG (mulberry32)
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shuffle array in-place using provided random function
function shuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Build bracelet bead list based on goal ratios and colors
function buildBracelet(numBeads, goal, colors) {
  const elements = ['metal','wood','water','fire','earth'];
  // Compute float counts
  const floats = elements.map(key => ({ key, floatCount: (goal[key] || 0) * numBeads / 100 }));
  // Floor and remainders
  const counts = floats.map(({ key, floatCount }) => ({
    key,
    count: Math.floor(floatCount),
    rem: floatCount - Math.floor(floatCount)
  }));
  // Adjust to match numBeads
  let total = counts.reduce((sum, e) => sum + e.count, 0);
  let diff = numBeads - total;
  if (diff > 0) {
    counts.sort((a, b) => b.rem - a.rem);
    for (let i = 0; i < diff; i++) counts[i].count++;
  } else if (diff < 0) {
    counts.sort((a, b) => a.rem - b.rem);
    for (let i = 0; i < -diff; i++) counts[i].count = Math.max(0, counts[i].count - 1);
  }
  // Build list
  const beads = [];
  counts.forEach(({ key, count }) => {
    const color = (colors && colors[key]) || DEFAULT_COLOR;
    for (let i = 0; i < count; i++) beads.push({ color });
  });
  // Pad if needed
  while (beads.length < numBeads) beads.push({ color: DEFAULT_COLOR });
  return beads;
}

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { numBeads, ratios, seed } = req.body;
  if (!numBeads || !ratios || !ratios.goal || !ratios.colors) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }
  // Build and shuffle
  let beads = buildBracelet(numBeads, ratios.goal, ratios.colors);
  const rng = seed != null ? mulberry32(parseInt(seed, 10)) : Math.random;
  shuffle(beads, rng);
  // Return array of hex colors
  res.status(200).json({ beads: beads.map(b => b.color) });
};

// Extend function timeout if needed
module.exports.config = {
  maxDuration: 60
};