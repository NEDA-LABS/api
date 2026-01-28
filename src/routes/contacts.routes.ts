/**
 * Contacts Routes
 * API endpoints for managing user contacts
 */

import { Router, Request, Response, NextFunction } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import { contactsService } from '../services/contacts.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/v1/contacts
 * List all contacts for authenticated user
 */
router.get('/', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { search, country, favorite, isNedaPayUser, limit, offset } = req.query;

    const filters = {
      search: search as string | undefined,
      country: country as string | undefined,
      favorite: favorite !== undefined ? favorite === 'true' : undefined,
      isNedaPayUser: isNedaPayUser !== undefined ? isNedaPayUser === 'true' : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    };

    const result = await contactsService.getContacts(userId, filters);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching contacts', { error });
    return next(error);
  }
});

/**
 * GET /api/v1/contacts/:id
 * Get a single contact by ID
 */
router.get('/:id', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const contactId = req.params.id as string;
    const contact = await contactsService.getContact(userId, contactId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    return res.json({
      success: true,
      contact,
    });
  } catch (error) {
    logger.error('Error fetching contact', { error, contactId: req.params.id });
    return next(error);
  }
});

/**
 * POST /api/v1/contacts
 * Create a new contact
 */
router.post('/', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { name, nickname, country, notes, linkedUserId, isNedaPayUser, favorite, bankAccounts, phoneNumbers, cryptoAddresses } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name is required' }
      });
    }

    const contact = await contactsService.createContact(userId, {
      name: name.trim(),
      nickname,
      country,
      notes,
      linkedUserId,
      isNedaPayUser,
      favorite,
      bankAccounts,
      phoneNumbers,
      cryptoAddresses,
    });

    return res.status(201).json({
      success: true,
      contact,
      message: 'Contact created successfully',
    });
  } catch (error) {
    logger.error('Error creating contact', { error });
    return next(error);
  }
});

/**
 * PUT /api/v1/contacts/:id
 * Update a contact
 */
router.put('/:id', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { name, nickname, country, notes, linkedUserId, isNedaPayUser, favorite } = req.body;

    const contactId = req.params.id as string;
    const contact = await contactsService.updateContact(userId, contactId, {
      name,
      nickname,
      country,
      notes,
      linkedUserId,
      isNedaPayUser,
      favorite,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    return res.json({
      success: true,
      contact,
      message: 'Contact updated successfully',
    });
  } catch (error) {
    logger.error('Error updating contact', { error, contactId: req.params.id });
    return next(error);
  }
});

/**
 * DELETE /api/v1/contacts/:id
 * Delete a contact
 */
router.delete('/:id', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const contactId = req.params.id as string;
    const deleted = await contactsService.deleteContact(userId, contactId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    return res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting contact', { error, contactId: req.params.id });
    return next(error);
  }
});

/**
 * POST /api/v1/contacts/:id/favorite
 * Toggle favorite status
 */
router.post('/:id/favorite', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const contactId = req.params.id as string;
    const contact = await contactsService.toggleFavorite(userId, contactId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    return res.json({
      success: true,
      favorite: contact.favorite,
      contact,
    });
  } catch (error) {
    logger.error('Error toggling favorite', { error, contactId: req.params.id });
    return next(error);
  }
});

/**
 * POST /api/v1/contacts/:id/last-used
 * Update last used timestamp
 */
router.post('/:id/last-used', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const contactId = req.params.id as string;
    const contact = await contactsService.updateLastUsed(userId, contactId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    return res.json({
      success: true,
      contact,
    });
  } catch (error) {
    logger.error('Error updating last used', { error, contactId: req.params.id });
    return next(error);
  }
});

// ============ Payment Methods Routes ============

/**
 * POST /api/v1/contacts/:id/bank-accounts
 * Add a bank account to a contact
 */
router.post('/:id/bank-accounts', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { accountNumber, accountName, bankName, bankCode, currency, isPrimary, label } = req.body;

    if (!accountNumber || !accountName || !bankName) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'accountNumber, accountName, and bankName are required' }
      });
    }

    const contactId = req.params.id as string;
    const bankAccount = await contactsService.addBankAccount(userId, contactId, {
      accountNumber,
      accountName,
      bankName,
      bankCode,
      currency,
      isPrimary,
      label,
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    return res.status(201).json({
      success: true,
      bankAccount,
      message: 'Bank account added successfully',
    });
  } catch (error) {
    logger.error('Error adding bank account', { error, contactId: req.params.id });
    return next(error);
  }
});

/**
 * DELETE /api/v1/contacts/:id/bank-accounts/:bankAccountId
 * Remove a bank account from a contact
 */
router.delete('/:id/bank-accounts/:bankAccountId', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const contactId = req.params.id as string;
    const bankAccountId = req.params.bankAccountId as string;
    const deleted = await contactsService.removeBankAccount(userId, contactId, bankAccountId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact or bank account not found' }
      });
    }

    return res.json({
      success: true,
      message: 'Bank account removed successfully',
    });
  } catch (error) {
    logger.error('Error removing bank account', { error, contactId: req.params.id });
    return next(error);
  }
});

/**
 * POST /api/v1/contacts/:id/phone-numbers
 * Add a phone number to a contact
 */
router.post('/:id/phone-numbers', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { phoneNumber, provider, country, isPrimary, label } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'phoneNumber is required' }
      });
    }

    const contactId = req.params.id as string;
    const phone = await contactsService.addPhoneNumber(userId, contactId, {
      phoneNumber,
      provider,
      country,
      isPrimary,
      label,
    });

    if (!phone) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    return res.status(201).json({
      success: true,
      phoneNumber: phone,
      message: 'Phone number added successfully',
    });
  } catch (error) {
    logger.error('Error adding phone number', { error, contactId: req.params.id });
    return next(error);
  }
});

/**
 * DELETE /api/v1/contacts/:id/phone-numbers/:phoneNumberId
 * Remove a phone number from a contact
 */
router.delete('/:id/phone-numbers/:phoneNumberId', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const contactId = req.params.id as string;
    const phoneNumberId = req.params.phoneNumberId as string;
    const deleted = await contactsService.removePhoneNumber(userId, contactId, phoneNumberId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact or phone number not found' }
      });
    }

    return res.json({
      success: true,
      message: 'Phone number removed successfully',
    });
  } catch (error) {
    logger.error('Error removing phone number', { error, contactId: req.params.id });
    return next(error);
  }
});

/**
 * POST /api/v1/contacts/:id/crypto-addresses
 * Add a crypto address to a contact
 */
router.post('/:id/crypto-addresses', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { address, ensName, chainId, isPrimary, label } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'address is required' }
      });
    }

    const contactId = req.params.id as string;
    const cryptoAddress = await contactsService.addCryptoAddress(userId, contactId, {
      address,
      ensName,
      chainId,
      isPrimary,
      label,
    });

    if (!cryptoAddress) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    return res.status(201).json({
      success: true,
      cryptoAddress,
      message: 'Crypto address added successfully',
    });
  } catch (error) {
    logger.error('Error adding crypto address', { error, contactId: req.params.id });
    return next(error);
  }
});

/**
 * DELETE /api/v1/contacts/:id/crypto-addresses/:cryptoAddressId
 * Remove a crypto address from a contact
 */
router.delete('/:id/crypto-addresses/:cryptoAddressId', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const contactId = req.params.id as string;
    const cryptoAddressId = req.params.cryptoAddressId as string;
    const deleted = await contactsService.removeCryptoAddress(userId, contactId, cryptoAddressId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact or crypto address not found' }
      });
    }

    return res.json({
      success: true,
      message: 'Crypto address removed successfully',
    });
  } catch (error) {
    logger.error('Error removing crypto address', { error, contactId: req.params.id });
    return next(error);
  }
});

/**
 * POST /api/v1/contacts/search-users
 * Search for NedaPay users to link as contacts
 */
router.post('/search-users', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { query, type } = req.body;

    if (!query || !type) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'query and type are required' }
      });
    }

    if (!['wallet', 'email', 'name'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'type must be wallet, email, or name' }
      });
    }

    const users = await contactsService.searchUsers(query, type);

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    logger.error('Error searching users', { error });
    return next(error);
  }
});

export default router;
