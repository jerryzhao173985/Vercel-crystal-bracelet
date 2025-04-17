const express = require('express');
const router = express.Router();

// Pretend these are your available bead styles
const beadData = [
  { id: 1, color: 'goldenrod' },
  { id: 2, color: 'lightgreen' },
  { id: 3, color: 'orange' },
  { id: 4, color: 'white' },
  { id: 5, color: 'darkgreen' },
];

router.get('/', (req, res) => {
  res.json(beadData);
});

module.exports = router;
