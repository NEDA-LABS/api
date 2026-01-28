/**
 * Snaville Routes
 * 
 * Tanzania USDT On-Ramp/Off-Ramp via Mobile Money
 * API Docs: https://api.snaville.com/docs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../repositories/prisma.js';
import { logger } from '../../utils/logger.js';
import { snavilleService, SNAVILLE_CONFIG, SnavilleWebhookPayload } from '../../services/ramp/snaville.service.js';

const router = Router();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Status type matching Prisma enum
type SnavilleTxStatusType = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

/**
 * Map Snaville status to Prisma enum
 */
function mapStatus(status: string): SnavilleTxStatusType {
  const statusMap: Record<string, SnavilleTxStatusType> = {
    pending: 'PENDING',
    processing: 'PROCESSING',
    completed: 'COMPLETED',
    failed: 'FAILED',
    expired: 'EXPIRED',
    cancelled: 'CANCELLED',
  };
  return statusMap[status.toLowerCase()] || 'PENDING';
}

// =============================================================================
// RATES & PAYMENT METHODS
// =============================================================================

/**
 * Get current exchange rates
 * GET /api/v1/ramp/snaville/rates
 */
router.get('/rates', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await snavilleService.getRates();

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to fetch rates' });
    }

    return res.json(result.data);
  } catch (error) {
    return next(error);
  }
});

/**
 * Get available payment methods
 * GET /api/v1/ramp/snaville/payment-methods
 */
router.get('/payment-methods', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await snavilleService.getPaymentMethods();

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to fetch payment methods' });
    }

    return res.json(result.data);
  } catch (error) {
    return next(error);
  }
});

// =============================================================================
// ON-RAMP (BUY USDT)
// =============================================================================

/**
 * Create a buy order
 * POST /api/v1/ramp/snaville/onramp
 */
router.post('/onramp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      amount_usdt,
      destination_address,
      payment_method_id,
      user_full_name,
      user_phone,
      network = 'BEP20',
      user_id, // Optional user ID
    } = req.body;

    // Validation
    if (!amount_usdt || amount_usdt < SNAVILLE_CONFIG.MIN_AMOUNT_USDT) {
      return res.status(400).json({ error: `Minimum amount is ${SNAVILLE_CONFIG.MIN_AMOUNT_USDT} USDT` });
    }

    if (amount_usdt > SNAVILLE_CONFIG.MAX_AMOUNT_USDT) {
      return res.status(400).json({ error: `Maximum amount is ${SNAVILLE_CONFIG.MAX_AMOUNT_USDT} USDT` });
    }

    if (!destination_address) {
      return res.status(400).json({ error: 'Destination address is required' });
    }

    if (!payment_method_id) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    if (!user_full_name) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (!user_phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const partnerOrderId = snavilleService.generateOrderId('NEDA');

    const result = await snavilleService.createBuyOrder({
      partner_order_id: partnerOrderId,
      amount_usdt: Number(amount_usdt),
      destination_address,
      payment_method_id,
      user_full_name,
      user_phone,
      network,
      idempotency_key: partnerOrderId, // Use partner_order_id as idempotency key to prevent duplicates
      mismatch_policy: 'auto_process', // Auto-process if user pays slightly more/less
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to create order' });
    }

    const order = result.data?.order;
    if (!order) {
      return res.status(400).json({ error: 'No order data returned' });
    }

    // Store transaction in database
    const transaction = await prisma.snavilleTransaction.create({
      data: {
        userId: user_id || null,
        orderNumber: order.order_number,
        partnerOrderId,
        type: 'BUY',
        status: 'PENDING',
        amountUsdt: order.amount_usdt,
        amountTzs: order.amount_tzs,
        rate: order.amount_tzs / order.amount_usdt,
        paymentMethodId: payment_method_id,
        paymentProvider: order.payment_instructions.provider,
        paymentAccountNumber: order.payment_instructions.account_number,
        paymentAccountName: order.payment_instructions.account_name,
        destinationAddress: destination_address,
        network: network === 'TRC20' ? 'TRC20' : 'BEP20',
        userFullName: user_full_name,
        userPhone: user_phone,
        expiresAt: order.expires_at ? new Date(order.expires_at) : null,
      },
    });

    logger.info('[Snaville] Created transaction:', { id: transaction.id, orderNumber: order.order_number });

    return res.json({
      success: true,
      order,
      partner_order_id: partnerOrderId,
      transaction_id: transaction.id,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Verify payment
 * POST /api/v1/ramp/snaville/onramp/verify
 */
router.post('/onramp/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { order_number, transaction_id } = req.body;

    if (!order_number) {
      return res.status(400).json({ error: 'Order number is required' });
    }

    if (!transaction_id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const result = await snavilleService.verifyPayment({
      order_number,
      transaction_id,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to verify payment' });
    }

    // Update transaction with mobile money transaction ID
    await prisma.snavilleTransaction.updateMany({
      where: { orderNumber: order_number },
      data: {
        transactionId: transaction_id,
        status: 'PROCESSING',
      },
    });

    logger.info('[Snaville] Payment verification submitted:', { orderNumber: order_number });

    return res.json({
      success: true,
      message: 'Payment verification submitted',
    });
  } catch (error) {
    return next(error);
  }
});

// =============================================================================
// ORDER STATUS
// =============================================================================

/**
 * Get order status
 * GET /api/v1/ramp/snaville/orders/:orderNumber
 */
router.get('/orders/:orderNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderNumber } = req.params;

    if (!orderNumber) {
      return res.status(400).json({ error: 'Order number is required' });
    }

    const result = await snavilleService.getOrderStatus(orderNumber);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to fetch order status' });
    }

    return res.json(result.data);
  } catch (error) {
    return next(error);
  }
});

// =============================================================================
// P2P WEBHOOK - Main webhook endpoint for Snaville events
// =============================================================================

/**
 * Snaville Webhook Handler
 * POST /api/v1/ramp/snaville/p2p/webhook
 * 
 * Receives webhook events from Snaville and updates the database.
 * Events: order.completed, order.payment_received, order.failed, order.expired
 */
router.post('/p2p/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string || '';
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify signature
    const verified = snavilleService.verifyWebhookSignature(rawBody, signature);
    
    if (!verified) {
      logger.error('[Snaville Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload: SnavilleWebhookPayload = typeof req.body === 'string' 
      ? JSON.parse(req.body) 
      : req.body;
    
    logger.info('[Snaville Webhook] Received event:', {
      event: payload.event,
      orderNumber: payload.order.order_number,
      status: payload.order.status,
    });

    // Find existing transaction by order number or partner order ID
    const existingTransaction = await prisma.snavilleTransaction.findFirst({
      where: {
        OR: [
          { orderNumber: payload.order.order_number },
          { partnerOrderId: payload.order.partner_order_id },
        ],
      },
    });

    // Store webhook event
    const webhookEvent = await prisma.snavilleWebhookEvent.create({
      data: {
        transactionId: existingTransaction?.id || null,
        event: payload.event,
        orderNumber: payload.order.order_number,
        partnerOrderId: payload.order.partner_order_id,
        snavilleOrderId: payload.order.snaville_order_id,
        payload: payload as any,
        signature: signature || null,
        verified,
        processed: false,
      },
    });

    logger.info('[Snaville Webhook] Stored event:', { eventId: webhookEvent.id });

    // Update transaction if it exists
    if (existingTransaction) {
      const updateData: any = {
        status: mapStatus(payload.order.status),
        snavilleOrderId: payload.order.snaville_order_id,
      };

      // Add completion data for completed orders
      if (payload.event === 'order.completed') {
        updateData.completedAt = new Date();
        updateData.txHash = payload.order.tx_hash || null;
        updateData.explorerUrl = payload.order.explorer_url || null;
      }

      await prisma.snavilleTransaction.update({
        where: { id: existingTransaction.id },
        data: updateData,
      });

      // Mark webhook as processed
      await prisma.snavilleWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      logger.info('[Snaville Webhook] Updated transaction:', { 
        transactionId: existingTransaction.id,
        newStatus: updateData.status,
      });
    } else {
      logger.warn('[Snaville Webhook] No matching transaction found for order:', {
        orderNumber: payload.order.order_number,
      });
    }

    // Log event type
    switch (payload.event) {
      case 'order.completed':
        logger.info('[Snaville Webhook] Order completed:', {
          orderNumber: payload.order.order_number,
          type: payload.order.type,
          txHash: payload.order.tx_hash,
        });
        break;

      case 'order.payment_received':
        logger.info('[Snaville Webhook] Payment received, processing USDT transfer:', {
          orderNumber: payload.order.order_number,
          type: payload.order.type,
        });
        break;

      case 'order.failed':
        logger.warn('[Snaville Webhook] Order failed:', {
          orderNumber: payload.order.order_number,
          type: payload.order.type,
        });
        break;

      case 'order.expired':
        logger.warn('[Snaville Webhook] Order expired:', {
          orderNumber: payload.order.order_number,
          type: payload.order.type,
        });
        break;

      default:
        logger.info('[Snaville Webhook] Unknown event:', { event: payload.event });
    }

    return res.json({ received: true, eventId: webhookEvent.id });
  } catch (error) {
    logger.error('[Snaville Webhook] Error processing webhook:', error);
    return next(error);
  }
});

// =============================================================================
// TRANSACTION HISTORY
// =============================================================================

/**
 * Get user's Snaville transactions
 * GET /api/v1/ramp/snaville/transactions
 */
router.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, limit = '20', offset = '0' } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const transactions = await prisma.snavilleTransaction.findMany({
      where: { userId: user_id as string },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
      include: {
        webhookEvents: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    const total = await prisma.snavilleTransaction.count({
      where: { userId: user_id as string },
    });

    return res.json({
      transactions,
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
