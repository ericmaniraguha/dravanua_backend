const express = require('express');
const router = express.Router();
const dailyOps = require('../controllers/dailyOpsController');

const resources = [
  { path: 'daily-reports', handler: dailyOps.reports },
  { path: 'expenses', handler: dailyOps.expenses },
  { path: 'purchases', handler: dailyOps.purchases },
  { path: 'float', handler: dailyOps.float },
  { path: 'requests', handler: dailyOps.requests },
  { path: 'operations', handler: dailyOps.operations },
  { path: 'tasks', handler: dailyOps.tasks },
  { path: 'schedule', handler: dailyOps.schedule }
];

resources.forEach(r => {
  if (r.handler.getAll) router.get(`/${r.path}`, r.handler.getAll);
  if (r.handler.create) router.post(`/${r.path}`, r.handler.create);
  if (r.handler.update) router.put(`/${r.path}/:id`, r.handler.update);
  if (r.handler.delete) router.delete(`/${r.path}/:id`, r.handler.delete);
});

module.exports = router;
