/**
 * Paycrest Routes
 * 
 * Off-ramp operations via Paycrest API
 * Supports: Orders, Rates, Account Verification, Webhooks
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { paycrestService } from '../../services/ramp/paycrest.service.js';
import { prisma } from '../../repositories/prisma.js';
import { logger } from '../../utils/logger.js';
import { createPaymentNotificationService } from '../../services/email/index.js';

const router = Router();

// =============================================================================
// ORDER MANAGEMENT
// =============================================================================

/**
 * Create a payment order (off-ramp)
 * POST /api/v1/ramp/paycrest/orders
 */
router.post('/orders', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, rate, network, token, recipient, returnAddress, reference } = req.body;
    const userId = req.user!.id;

    // Create order with Paycrest
    const orderResponse = await paycrestService.createOrder({
      amount,
      rate,
      network,
      token,
      recipient,
      returnAddress,
      reference,
    });

    // Store in database
    await prisma.offRampTransaction.create({
      data: {
        id: orderResponse.data.id,
        merchantId: userId,
        status: 'pending',
        amount: amount.toString(),
        rate: rate?.toString(),
        currency: recipient?.currency || 'NGN',
        accountName: recipient?.accountName,
        accountNumber: recipient?.accountIdentifier,
        institution: recipient?.institution,
      },
    });

    logger.info('Paycrest order created', {
      userId,
      orderId: orderResponse.data.id,
      amount,
      token,
    });

    res.status(201).json({
      success: true,
      data: orderResponse.data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get order by ID
 * GET /api/v1/ramp/paycrest/orders/:orderId
 */
router.get('/orders/:orderId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const localOrder = await prisma.offRampTransaction.findFirst({
      where: { id: orderId, merchantId: userId },
    });

    if (!localOrder) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Get fresh status from Paycrest
    const order = await paycrestService.getOrder(orderId!);

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * List user's orders
 * GET /api/v1/ramp/paycrest/orders
 */
router.get('/orders', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { status, page, pageSize, startDate, endDate } = req.query;

    // Get user's local transactions
    const transactions = await prisma.offRampTransaction.findMany({
      where: {
        merchantId: userId,
        ...(status && { status: status as string }),
        ...(startDate && { createdAt: { gte: new Date(startDate as string) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate as string) } }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(pageSize as string) || 20,
      skip: ((parseInt(page as string) || 1) - 1) * (parseInt(pageSize as string) || 20),
    });

    const total = await prisma.offRampTransaction.count({
      where: { merchantId: userId },
    });

    res.json({
      success: true,
      data: {
        orders: transactions,
        total,
        page: parseInt(page as string) || 1,
        pageSize: parseInt(pageSize as string) || 20,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// RATES
// =============================================================================

/**
 * Get exchange rate
 * GET /api/v1/ramp/paycrest/rates/:token/:amount/:currency
 */
router.get('/rates/:token/:amount/:currency', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, amount, currency } = req.params;
    const { network } = req.query;

    const rate = await paycrestService.getRate(
      token!,
      parseFloat(amount!),
      currency!,
      network as string | undefined
    );

    res.json({
      success: true,
      data: {
        token,
        amount: parseFloat(amount!),
        currency,
        rate,
        network: network || 'default',
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// ACCOUNT VERIFICATION
// =============================================================================

/**
 * Verify bank/mobile money account
 * POST /api/v1/ramp/paycrest/verify-account
 */
router.post('/verify-account', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { institution, accountIdentifier } = req.body;

    const verification = await paycrestService.verifyAccount(institution, accountIdentifier);

    res.json({
      success: true,
      data: verification,
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// INSTITUTIONS & CURRENCIES
// =============================================================================

/**
 * Get supported institutions for a currency
 * GET /api/v1/ramp/paycrest/institutions/:currency
 */
router.get('/institutions/:currency', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currency } = req.params;

    const institutions = await paycrestService.getInstitutions(currency!);

    res.json({
      success: true,
      data: institutions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get supported currencies
 * GET /api/v1/ramp/paycrest/currencies
 */
router.get('/currencies', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const currencies = await paycrestService.getCurrencies();

    res.json({
      success: true,
      data: currencies,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get supported networks
 * GET /api/v1/ramp/paycrest/networks
 */
router.get('/networks', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const networks = await paycrestService.getNetworks();

    res.json({
      success: true,
      data: networks,
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// WEBHOOKS
// =============================================================================

/**
 * Handle Paycrest webhooks
 * POST /api/v1/ramp/paycrest/webhook
 */
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-paycrest-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    // Verify and parse webhook
    const webhook = paycrestService.parseWebhook(rawBody, signature);

    if (!webhook) {
      logger.warn('Invalid Paycrest webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const { event, data } = webhook;

    // Log webhook
    await prisma.webhookLog.create({
      data: {
        source: 'PAYCREST',
        type: event,
        payload: req.body,
        headers: JSON.parse(JSON.stringify(req.headers)),
        relatedId: data.id,
      },
    });

    // Process based on event type
    switch (event) {
      case 'payment_order.pending':
        await prisma.offRampTransaction.upsert({
          where: { id: data.id },
          update: { status: 'pending' },
          create: {
            id: data.id,
            merchantId: data.fromAddress,
            status: 'pending',
            amount: data.amount,
            rate: data.rate,
            currency: data.recipient?.institution,
            accountName: data.recipient?.accountName,
            accountNumber: data.recipient?.accountIdentifier,
            institution: data.recipient?.institution,
          },
        });
        break;

      case 'payment_order.initiated':
      case 'payment_order.processing':
        await prisma.offRampTransaction.updateMany({
          where: { id: data.id },
          data: { status: 'processing' },
        });
        break;

      case 'payment_order.settled':
        // Upsert transaction status to settled
        await prisma.offRampTransaction.upsert({
          where: { id: data.id },
          update: {
            status: 'settled',
            merchantId: data.fromAddress,
            amount: data.amount,
            rate: data.rate,
            currency: data.recipient?.currency,
            accountName: data.recipient?.accountName,
            accountNumber: data.recipient?.accountIdentifier,
            institution: data.recipient?.institution,
          },
          create: {
            id: data.id,
            merchantId: data.fromAddress,
            status: 'settled',
            amount: data.amount,
            rate: data.rate,
            currency: data.recipient?.currency,
            accountName: data.recipient?.accountName,
            accountNumber: data.recipient?.accountIdentifier,
            institution: data.recipient?.institution,
          },
        });

        // Create notification and send email for user
        const settledTx = await prisma.offRampTransaction.findUnique({
          where: { id: data.id },
        });

        if (settledTx?.merchantId) {
          const user = await prisma.user.findFirst({
            where: { wallet: settledTx.merchantId },
          });

          if (user) {
            // Create in-app notification
            await prisma.notification.create({
              data: {
                recipient: user.wallet || user.id,
                type: 'OFFRAMP_COMPLETE',
                status: 'unread',
                message: `Your withdrawal of ${data.amount} ${data.recipient?.currency || ''} has been settled to ${data.recipient?.accountName}`,
              },
            });

            // Send settlement email notification
            try {
              const notificationService = createPaymentNotificationService(prisma);
              await notificationService.sendPaymentSettledEmail({
                transactionId: data.id,
                walletAddress: settledTx.merchantId,
                amount: data.amount || settledTx.amount,
                currency: data.recipient?.currency || settledTx.currency || 'USD',
                accountName: data.recipient?.accountName || settledTx.accountName || 'N/A',
                accountNumber: data.recipient?.accountIdentifier || settledTx.accountNumber || 'N/A',
                institution: data.recipient?.institution || settledTx.institution || 'N/A',
                rate: data.rate || settledTx.rate,
              });
              logger.info('Payment settled email sent', { transactionId: data.id });
            } catch (emailError) {
              logger.error('Failed to send settlement email', emailError as Error);
              // Don't fail the webhook if email fails
            }
          }
        }
        break;

      case 'payment_order.refunded':
        // Upsert transaction status to refunded
        await prisma.offRampTransaction.upsert({
          where: { id: data.id },
          update: {
            status: 'refunded',
            merchantId: data.fromAddress,
            amount: data.amount,
            rate: data.rate,
            currency: data.recipient?.currency,
            accountName: data.recipient?.accountName,
            accountNumber: data.recipient?.accountIdentifier,
            institution: data.recipient?.institution,
          },
          create: {
            id: data.id,
            merchantId: data.fromAddress,
            status: 'refunded',
            amount: data.amount,
            rate: data.rate,
            currency: data.recipient?.currency,
            accountName: data.recipient?.accountName,
            accountNumber: data.recipient?.accountIdentifier,
            institution: data.recipient?.institution,
          },
        });

        // Create in-app notification and send refund email
        const refundedTx = await prisma.offRampTransaction.findUnique({
          where: { id: data.id },
        });

        if (refundedTx?.merchantId) {
          const refundUser = await prisma.user.findFirst({
            where: { wallet: refundedTx.merchantId },
          });

          if (refundUser) {
            // Create in-app notification
            await prisma.notification.create({
              data: {
                recipient: refundUser.wallet || refundUser.id,
                type: 'OFFRAMP_REFUNDED',
                status: 'unread',
                message: `Your withdrawal of ${data.amount} ${data.recipient?.currency || ''} has been refunded`,
              },
            });
          }

          // Send refund email notification
          try {
            const notificationService = createPaymentNotificationService(prisma);
            await notificationService.sendPaymentRefundedEmail({
              transactionId: data.id,
              walletAddress: refundedTx.merchantId,
              amount: data.amount || refundedTx.amount,
              currency: data.recipient?.currency || refundedTx.currency || 'USD',
              accountName: data.recipient?.accountName || refundedTx.accountName || 'N/A',
              accountNumber: data.recipient?.accountIdentifier || refundedTx.accountNumber || 'N/A',
              refundReason: (data as { reason?: string }).reason || 'Payment order was refunded by the system',
            });
            logger.info('Payment refunded email sent', { transactionId: data.id });
          } catch (emailError) {
            logger.error('Failed to send refund email', emailError as Error);
          }
        }
        break;

      case 'payment_order.expired':
        // Upsert transaction status to expired
        await prisma.offRampTransaction.upsert({
          where: { id: data.id },
          update: {
            status: 'expired',
            merchantId: data.fromAddress,
            amount: data.amount,
            rate: data.rate,
            currency: data.recipient?.currency,
            accountName: data.recipient?.accountName,
            accountNumber: data.recipient?.accountIdentifier,
            institution: data.recipient?.institution,
          },
          create: {
            id: data.id,
            merchantId: data.fromAddress,
            status: 'expired',
            amount: data.amount,
            rate: data.rate,
            currency: data.recipient?.currency,
            accountName: data.recipient?.accountName,
            accountNumber: data.recipient?.accountIdentifier,
            institution: data.recipient?.institution,
          },
        });
        break;

      case 'payment_order.failed':
        // Upsert transaction status to failed
        await prisma.offRampTransaction.upsert({
          where: { id: data.id },
          update: {
            status: 'failed',
            merchantId: data.fromAddress,
            amount: data.amount,
            rate: data.rate,
            currency: data.recipient?.currency,
            accountName: data.recipient?.accountName,
            accountNumber: data.recipient?.accountIdentifier,
            institution: data.recipient?.institution,
          },
          create: {
            id: data.id,
            merchantId: data.fromAddress,
            status: 'failed',
            amount: data.amount,
            rate: data.rate,
            currency: data.recipient?.currency,
            accountName: data.recipient?.accountName,
            accountNumber: data.recipient?.accountIdentifier,
            institution: data.recipient?.institution,
          },
        });
        break;

      default:
        logger.warn('Unknown Paycrest webhook event', { event });
    }

    // Mark webhook as processed
    await prisma.webhookLog.updateMany({
      where: { relatedId: data.id, source: 'PAYCREST' },
      data: {
        processed: true,
        processedAt: new Date(),
        success: true,
      },
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Paycrest webhook processing error', error as Error);
    return next(error);
  }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Health check for Paycrest service
 * GET /api/v1/ramp/paycrest/health
 */
router.get('/health', async (_req: Request, res: Response) => {
  const health = await paycrestService.healthCheck();

  res.status(health.healthy ? 200 : 503).json({
    service: 'paycrest',
    ...health,
  });
});

export default router;
