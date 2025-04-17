// Serverless function for Vercel: returns bead data
// Equivalent to routes/beads.js but as a Vercel serverless handler
module.exports = (req, res) => {
  // Define bead data
  const beadData = [
    { id: 1, color: 'goldenrod' },
    { id: 2, color: 'lightgreen' },
    { id: 3, color: 'orange' },
    { id: 4, color: 'white' },
    { id: 5, color: 'darkgreen' }
  ];
  // Only GET is supported
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.status(200).json(beadData);
};