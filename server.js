const express = require('express');
const path = require('path');
const app = express();

// Import your beads route
const beadRoutes = require('./routes/beads');

// JSON parsing middleware
app.use(express.json());

// Serve React static files (once the client is built)
app.use(express.static(path.join(__dirname, 'client', 'build')));

// Use the beads route
app.use('/api/beads', beadRoutes);

// Fallback to React index.html for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
