/**
 * Pretium Routes
 * 
 * On-ramp and Off-ramp operations via Pretium API
 */

import { Router, Request, Response, NextFunction } from 'express';
import { apiKeyAuth } from '../../middleware/apiKeyAuth.js';
import { pretiumService, PRETIUM_NETWORKS, SUPPORTED_COUNTRIES, SUPPORTED_FIAT_CURRENCIES } from '../../services/ramp/pretium.service.js';
import { prisma } from '../../repositories/prisma.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// =============================================================================
// QUOTES & RATES
// =============================================================================

/**
 * Get a quote for a transaction
 * POST /api/v1/ramp/pretium/quote
 */
router.post('/quote', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { source_currency, target_currency, amount, type } = req.body;

    const result = await pretiumService.getQuote({
      source_currency,
      target_currency,
      amount,
      type
    });

    if (result.status === 'error') {
      return res.status(result.code || 400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

/**
 * Get exchange rate for specific currency (On-Ramp)
 * POST /api/v1/ramp/pretium/exchange-rate
 */
router.post('/exchange-rate', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currency_code } = req.body;
    const result = await pretiumService.getExchangeRate(currency_code);
    if (result.status === 'error') {
      return res.status(result.code || result.statusCode || 400).json(result);
    }

    const data: any = result.data;
    const buying = Number(data?.buying_rate);
    const selling = Number(data?.selling_rate);
    const existingQuoted = Number(data?.quoted_rate);

    const quoted_rate = Number.isFinite(existingQuoted) && existingQuoted > 0
      ? existingQuoted
      : (Number.isFinite(buying) && Number.isFinite(selling) ? (buying + selling) / 2 : undefined);

    return res.json({
      ...result,
      data: {
        ...(data || {}),
        ...(quoted_rate !== undefined ? { quoted_rate } : {})
      }
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Get exchange rates (General)
 * GET /api/v1/ramp/pretium/rates
 */
router.get('/rates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { base } = req.query;
    const result = await pretiumService.getRates(base as string);
    if (result.status === 'error') {
      return res.status(result.code || result.statusCode || 400).json(result);
    }
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// =============================================================================
// ON-RAMP (DEPOSIT)
// =============================================================================

/**
 * Create an on-ramp transaction
 * POST /api/v1/ramp/pretium/onramp
 */
router.post('/onramp', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currency_code, shortcode, amount, mobile_network, chain, asset, address } = req.body;
    const userId = req.user?.id; // Optional - may be undefined for app-level API keys

    // Call Pretium API
    const result = await pretiumService.createOnramp({
      currency_code,
      shortcode,
      amount,
      mobile_network,
      chain,
      asset,
      address
    });

    if (result.status === 'error') {
      return res.status(result.code || 400).json(result);
    }

    // Record transaction in DB (only if userId exists)
    if (userId) {
      try {
        await prisma.pretiumTransaction.create({
          data: {
            userId,
          pretiumId: result.data?.transaction_code, // Use transaction_code as pretiumId for onramp
          type: 'COLLECTION',
          status: 'PENDING',
          sourceAmount: amount.toString(),
          sourceCurrency: currency_code, // e.g. KES
          targetAmount: amount.toString(), // For onramp, usually same amount or crypto equiv
          targetCurrency: asset, // e.g. USDT
          // fee: result.data?.fee, // Response doesn't explicitly return fee usually?
          
          destinationType: 'mobile_money',
          networkCode: mobile_network,
          accountNumber: shortcode,
          country: currency_code === 'KES' ? 'KE' : currency_code.substring(0, 2), // Rough guess or derive
          
          metadata: result.data ? JSON.parse(JSON.stringify(result.data)) : undefined,
        }
        });
      } catch (dbError) {
        logger.error('Failed to save Pretium on-ramp transaction', dbError);
        // Don't fail the request if DB save fails, but log it
      }
    }

    logger.info('Pretium on-ramp initiated', {
      userId: userId || 'anonymous',
      walletAddress: address,
      transactionCode: result.data?.transaction_code,
      amount,
      currency: currency_code
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

/**
 * Get transaction status (On-Ramp)
 * POST /api/v1/ramp/pretium/status
 */
router.post('/status', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currency_code, transaction_code } = req.body;
    const result = await pretiumService.getStatus(currency_code, transaction_code);

    if (result.status === 'error') {
      return res.status(result.code || result.statusCode || 400).json(result);
    }

    // If status is complete/failed, update local DB if needed
    // In a real scenario, we might want to sync the status here if webhook missed it
    if (result.data?.status && result.data.transaction_code) {
        // e.g. update prisma.pretiumTransaction
        const statusUpper = result.data.status.toUpperCase();
        let dbStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'PROCESSING' | 'CANCELLED' | undefined;
        
        if (statusUpper === 'COMPLETE' || statusUpper === 'COMPLETED' || statusUpper === 'SUCCESS') dbStatus = 'COMPLETED';
        else if (statusUpper === 'FAILED' || statusUpper === 'FAIL') dbStatus = 'FAILED';
        else if (statusUpper === 'PENDING') dbStatus = 'PENDING';

        if (dbStatus) {
            await prisma.pretiumTransaction.updateMany({
                where: { pretiumId: result.data.transaction_code },
                data: { status: dbStatus }
            }).catch(e => logger.warn('Failed to update pretium status on poll', e));
        }
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// =============================================================================
// OFF-RAMP (DISBURSEMENT)
// =============================================================================

/**
 * Create a disbursement (off-ramp)
 * POST /api/v1/ramp/pretium/disburse
 */
router.post('/disburse', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      quote_id, 
      destination, 
      reference, 
      transaction_hash, 
      chain, 
      target_amount 
    } = req.body;
    const userId = req.user!.id;

    const result = await pretiumService.createDisbursement({
      quote_id,
      destination,
      reference,
      transaction_hash,
      chain,
      target_amount
    });

    if (result.status === 'error') {
      return res.status(result.code || 400).json(result);
    }

    // Save to PretiumTransaction table
    if (result.data?.id) {
      try {
        await prisma.pretiumTransaction.create({
          data: {
            userId,
            pretiumId: result.data.id,
            quoteId: quote_id,
            reference: reference || result.data.reference,
            type: 'DISBURSEMENT',
            status: 'PENDING',
            
            // Amounts - Assuming target_amount is what we send in Fiat
            // We assume source was USDT/USDC. Ideally we get this from quote or request.
            sourceAmount: '0', // Placeholder or calculate if we have rate
            sourceCurrency: 'USDT', // Default assumption or pass in request
            targetAmount: target_amount?.toString() || '0',
            targetCurrency: destination.country === 'MW' ? 'MWK' : 
                     destination.country === 'CD' ? 'CDF' : 
                     destination.country === 'ET' ? 'ETB' :
                     destination.country === 'GH' ? 'GHS' : 
                     destination.country === 'UG' ? 'UGX' : 
                     destination.country === 'KE' ? 'KES' : 'USD',
            
            destinationType: destination.type,
            networkCode: destination.network_code,
            accountNumber: destination.account_number,
            accountName: destination.account_name,
            country: destination.country,
            
            txHash: transaction_hash,
            
            metadata: result.data ? JSON.parse(JSON.stringify(result.data)) : undefined,
          }
        });
      } catch (err) {
        logger.error('Failed to save Pretium transaction to DB', err);
      }
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

/**
 * Get disbursement status
 * GET /api/v1/ramp/pretium/disburse/:id
 */
router.get('/disburse/:id', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ status: 'error', message: 'ID is required' });
    }
    const result = await pretiumService.getDisbursementStatus(id);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// =============================================================================
// TRANSACTIONS
// =============================================================================

/**
 * Get Pretium transactions
 * GET /api/v1/ramp/pretium/transactions
 */
router.get('/transactions', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { type, status, page = 1, limit = 20 } = req.query;

    const where: any = { userId };

    if (type) {
      where.type = type; // COLLECTION or DISBURSEMENT
    }

    if (status) {
      where.status = status;
    }

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const [transactions, total] = await Promise.all([
      prisma.pretiumTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.pretiumTransaction.count({ where })
    ]);

    return res.json({
      success: true,
      statusCode: 200,
      message: 'success',
      data: {
        transactions,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      },
      // Flattened for compatibility with some frontend hooks if needed, 
      // but sticking to standard wrapper format mostly. 
      // The hook uses data.transactions directly check if wrapper is data object or top level.
      // Hook code: const data = await pretiumRes.value.json(); if (data.success && data.transactions)
      // So transactions should be at top level or inside data? 
      // The hook code implies `data.transactions` exists on the parsed JSON body.
      // So we should return { success: true, transactions: [...] } at root.
      transactions 
    });
  } catch (error) {
    return next(error);
  }
});

// =============================================================================
// UTILS
// =============================================================================

/**
 * Get supported networks
 * GET /api/v1/ramp/pretium/networks
 */
router.get('/networks', apiKeyAuth, async (req: Request, res: Response) => {
  const { country } = req.query;

  if (country && typeof country === 'string') {
    const code = country.toUpperCase();
    const networks = PRETIUM_NETWORKS[code];

    if (networks) {
      return res.json({
        status: 'success',
        statusCode: 200,
        message: 'success',
        data: networks
      });
    }

    return res.status(404).json({
      status: 'error',
      statusCode: 404,
      message: `No networks found for country: ${country}`
    });
  }

  return res.json({
    status: 'success',
    statusCode: 200,
    message: 'success',
    data: {
      networks: PRETIUM_NETWORKS,
      countries: SUPPORTED_COUNTRIES,
      currencies: SUPPORTED_FIAT_CURRENCIES
    }
  });
});

/**
 * Get account detail
 * GET /api/v1/ramp/pretium/account
 */
router.get('/account', apiKeyAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pretiumService.getAccountDetail();
    if (result.status === 'error') {
      return res.status(result.code || result.statusCode || 400).json(result);
    }
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// =============================================================================
// WEBHOOK
// =============================================================================

/**
 * Handle Pretium webhooks
 * POST /api/v1/ramp/pretium/webhook
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Basic logging of webhook
    logger.info('Pretium webhook received', { 
      body: req.body,
      query: req.query 
    });

    // Extract data
    const data = req.body;
    
    // Process status update if recognizable structure
    if (data.transaction_code && data.status) {
       // Find transaction by ID or reference and update status
       // This depends on how we map Pretium IDs to our DB IDs
       
       // Example: Update OffRampTransaction
       // If data.id or data.reference matches our records
       
       // For now, we just log it as successful receipt
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Pretium webhook error', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
