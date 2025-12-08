import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @route GET /api/v1/ens
 * @desc  Get user's ENS subname
 * @access Private
 */
router.get('/', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement get ENS subname
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/ens/availability
 * @desc  Check ENS subname availability
 * @access Private
 */
router.get('/availability', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement check availability
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/ens/create
 * @desc  Create ENS subname
 * @access Private
 */
router.post('/create', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement create subname
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/ens/subname
 * @desc  Get subname details
 * @access Private
 */
router.get('/subname', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement get subname
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/v1/ens/subname
 * @desc  Update subname records
 * @access Private
 */
router.put('/subname', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement update subname
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/ens/avatar
 * @desc  Get ENS avatar
 * @access Private
 */
router.get('/avatar', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement get avatar
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/v1/ens/avatar
 * @desc  Update ENS avatar
 * @access Private
 */
router.put('/avatar', authenticate, async (_req, res, next) => {
  try {
    // TODO: Implement update avatar
    res.status(501).json({ message: 'Not implemented' });
  } catch (error) {
    next(error);
  }
});

export default router;
