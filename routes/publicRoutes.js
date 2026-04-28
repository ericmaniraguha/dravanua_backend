const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');
const TeamMember = require('../models/TeamMember');
const { getPublicMarketingAssets, getPublicPartners, getPublicOfficeLocation } = require('../controllers/adminController');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Public gallery fetch
router.get('/gallery', cacheMiddleware(60), async (req, res) => {
  try {
    const items = await Gallery.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch gallery' });
  }
});

// Public team fetch
router.get('/team', cacheMiddleware(60), async (req, res) => {
  try {
    const team = await TeamMember.findAll({ 
      where: { isHired: true },
      order: [['order', 'ASC'], ['createdAt', 'ASC']] 
    });
    res.status(200).json({ success: true, data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch team' });
  }
});

// Public API index — GET /api/v1/public
router.get('/', cacheMiddleware(300), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DRAVANUA Public API',
    endpoints: {
      gallery:   '/api/v1/public/gallery',
      team:      '/api/v1/public/team',
      marketing: '/api/v1/public/marketing',
      partners:  '/api/v1/public/partners',
    },
  });
});

// Public office location
router.get('/office-location', cacheMiddleware(60), getPublicOfficeLocation);

// Public marketing assets
router.get('/marketing', cacheMiddleware(60), getPublicMarketingAssets);

// Public partners
router.get('/partners', cacheMiddleware(60), getPublicPartners);

module.exports = router;
