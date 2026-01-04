import { Router } from 'express';

const router = Router();

const css = `
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 2rem; }
  h1 { border-bottom: 2px solid #eaeaea; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
  h2 { margin-top: 3rem; border-bottom: 1px solid #eaeaea; padding-bottom: 0.3rem; }
  h3 { margin-top: 1.5rem; color: #555; }
  code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
  pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; border: 1px solid #eee; }
  ul { padding-left: 1.5rem; }
  li { margin-bottom: 0.5rem; }
  .endpoint { margin-bottom: 1rem; padding: 1rem; border: 1px solid #ddd; border-radius: 6px; background: #fff; }
  .method { font-weight: bold; display: inline-block; width: 60px; font-family: monospace; }
  .get { color: #0070f3; }
  .post { color: #008000; }
  .put { color: #d38100; }
  .delete { color: #d00000; }
  .nav { position: sticky; top: 0; background: rgba(255,255,255,0.9); backdrop-filter: blur(5px); border-bottom: 1px solid #eee; padding: 1rem 0; margin-bottom: 2rem; z-index: 100; }
  .nav a { margin-right: 1.5rem; color: #444; text-decoration: none; font-weight: 500; }
  .nav a:hover { color: #0070f3; }
  .nav strong { margin-right: 2rem; font-size: 1.2rem; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; background: #eee; color: #555; vertical-align: middle; margin-left: 0.5rem; }
  .badge.completed { background: #e6fffa; color: #008000; }
  .badge.pending { background: #fff5f5; color: #c53030; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #eaeaea; }
  th { background: #fafafa; font-weight: 600; }
</style>
`;

const appsDocs = `
<h2 id="apps">Apps & API Keys <span class="badge completed">Completed</span></h2>
<p>Manage application credentials for frontend clients and server-to-server communication.</p>

<h3>Authentication</h3>
<p>All API endpoints protected by API Key must include the following header:</p>
<pre>x-api-key: np_live_...</pre>
<p>Or via Bearer token:</p>
<pre>Authorization: Bearer np_live_...</pre>

<h3>API Endpoints</h3>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/apps</code>
  <p>List all registered applications and their API key counts.</p>
</div>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/apps</code>
  <p>Register a new application.</p>
  <pre>{
  "name": "webapp",
  "description": "Main Web Application",
  "webhookUrl": "https://..."
}</pre>
</div>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/apps/:id/keys</code>
  <p>Generate a new API Key for an application. <strong>The key is returned only once.</strong></p>
  <pre>{
  "name": "Production Key",
  "environment": "live"
}</pre>
</div>
`;

const paycrestDocs = `
<h2 id="paycrest">Paycrest Integration (Off-Ramp) <span class="badge completed">Completed</span></h2>
<p>Full integration with Paycrest API for global off-ramp operations (Crypto to Fiat).</p>

<h3>Configuration</h3>
<p>The following environment variables are required:</p>
<table>
  <tr>
    <th>Variable</th>
    <th>Description</th>
    <th>Required</th>
  </tr>
  <tr>
    <td><code>PAYCREST_API_URL</code></td>
    <td>Base URL for Paycrest API (e.g., https://api.paycrest.io)</td>
    <td>Yes</td>
  </tr>
  <tr>
    <td><code>PAYCREST_API_KEY</code></td>
    <td>API Key for authentication</td>
    <td>Yes</td>
  </tr>
  <tr>
    <td><code>PAYCREST_CLIENT_SECRET</code></td>
    <td>Secret used to verify webhook signatures</td>
    <td>Yes</td>
  </tr>
</table>

<h3>API Endpoints</h3>

<h4>Orders</h4>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/paycrest/orders</code>
  <p>Create a new payment order. Requires <code>amount</code>, <code>token</code>, <code>network</code>, <code>recipient</code> details.</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/paycrest/orders</code>
  <p>List user's payment orders history from local database. <strong>Requires JWT authentication.</strong></p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/paycrest/orders/:orderId</code>
  <p>Get details of a specific order. Fetches fresh status from Paycrest. <strong>Requires JWT authentication.</strong></p>
</div>

<h4>Paycrest Transactions (by Wallet Address)</h4>
<p>Retrieve transaction history using wallet address. <strong>Requires API Key authentication.</strong></p>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/paycrest/transactions</code>
  <p>Get Paycrest transactions by wallet address.</p>
  <p><strong>Query Parameters:</strong></p>
  <ul>
    <li><code>wallet</code> (required): Ethereum wallet address (merchantId)</li>
    <li><code>status</code>: Filter by status (pending, processing, settled, refunded, expired, failed)</li>
    <li><code>currency</code>: Filter by currency (NGN, KES, GHS, etc.)</li>
    <li><code>startDate</code>: Start date filter (ISO 8601)</li>
    <li><code>endDate</code>: End date filter (ISO 8601)</li>
    <li><code>page</code>: Page number (default: 1)</li>
    <li><code>pageSize</code>: Items per page (default: 20, max: 100)</li>
    <li><code>includeSummary</code>: Include summary statistics (true/false)</li>
  </ul>
  <p><strong>Example:</strong></p>
  <pre>GET /api/v1/ramp/paycrest/transactions?wallet=0x123...&status=settled&page=1&pageSize=20</pre>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/paycrest/transactions/:transactionId</code>
  <p>Get a single transaction by ID.</p>
  <p><strong>Query Parameters:</strong></p>
  <ul>
    <li><code>wallet</code> (optional): Wallet address for ownership verification</li>
  </ul>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/paycrest/transactions/summary/:wallet</code>
  <p>Get transaction summary/statistics for a wallet address.</p>
  <p><strong>Response includes:</strong></p>
  <ul>
    <li><code>totalTransactions</code>: Total transaction count</li>
    <li><code>totalVolume</code>: Sum of all transaction amounts</li>
    <li><code>byStatus</code>: Count breakdown by status</li>
    <li><code>byCurrency</code>: Count and volume breakdown by currency</li>
  </ul>
</div>

<h4>Rates & Verification</h4>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/paycrest/rates/:token/:amount/:currency</code>
  <p>Get exchange rate for a specific token amount to fiat currency.</p>
</div>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/paycrest/verify-account</code>
  <p>Verify a bank or mobile money account. Requires <code>institution</code> and <code>accountIdentifier</code>.</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/paycrest/institutions/:currency</code>
  <p>Get supported financial institutions for a specific currency (e.g. NGN).</p>
</div>

<h4>System</h4>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/paycrest/currencies</code>
  <p>Fetch supported fiat currencies and their details from Paycrest.</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/paycrest/networks</code>
  <p>Fetch supported blockchain networks.</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/paycrest/health</code>
  <p>Check health status of Paycrest service.</p>
</div>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/paycrest/webhook</code>
  <p>Webhook endpoint for Paycrest events. Handles signature verification automatically.</p>
</div>

<h3>Webhook Integration</h3>
<p>The system handles the following webhook events via <code>PaycrestService</code>:</p>
<ul>
  <li><code>payment_order.pending</code>: Upserts transaction with 'pending' status.</li>
  <li><code>payment_order.settled</code>: 
    <ul>
      <li>Updates transaction to 'settled'</li>
      <li>Creates in-app notification for user</li>
      <li>Sends "Payment Settled" email via <code>EmailService</code></li>
    </ul>
  </li>
  <li><code>payment_order.refunded</code>:
    <ul>
      <li>Updates transaction to 'refunded'</li>
      <li>Creates in-app notification</li>
      <li>Sends "Payment Refunded" email</li>
    </ul>
  </li>
  <li><code>payment_order.expired</code> / <code>payment_order.failed</code>: Updates status accordingly.</li>
</ul>

<h3>Data Models</h3>
<p>Transactions are stored in <code>OffRampTransaction</code> table. Webhooks are logged in <code>WebhookLog</code>.</p>
`;

const pretiumDocs = `
<h2 id="pretium">Pretium Integration (On/Off-Ramp) <span class="badge completed">Completed</span></h2>
<p>Integration with Pretium API for African markets (MWK, CDF, ETB, GHS, UGX, KES).</p>

<h3>Configuration</h3>
<table>
  <tr>
    <th>Variable</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><code>PRETIUM_BASE_URL</code></td>
    <td>Base URL for Pretium API</td>
  </tr>
  <tr>
    <td><code>PRETIUM_API_KEY</code></td>
    <td>API Key for authentication</td>
  </tr>
  <tr>
    <td><code>PRETIUM_WEBHOOK_SECRET</code></td>
    <td>Secret for webhook verification</td>
  </tr>
</table>

<h3>API Endpoints</h3>

<h4>Quotes & Rates</h4>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/pretium/quote</code>
  <p>Get a quote for a transaction.</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/pretium/rates</code>
  <p>Get exchange rates (USD base).</p>
</div>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/pretium/exchange-rate</code>
  <p>Get exchange rate for a specific currency code.</p>
</div>

<h4>On-Ramp (Deposit)</h4>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/pretium/onramp</code>
  <p>Initiate a mobile money deposit.</p>
</div>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/pretium/status</code>
  <p>Check transaction status (On-Ramp).</p>
</div>

<h4>Off-Ramp (Disbursement)</h4>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/pretium/disburse</code>
  <p>Initiate a disbursement (payout).</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/pretium/disburse/:id</code>
  <p>Get disbursement status.</p>
</div>

<h4>Transactions</h4>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/pretium/transactions</code>
  <p>Get transaction history. Supports pagination and filtering.</p>
  <p><strong>Query Parameters:</strong></p>
  <ul>
    <li><code>type</code>: COLLECTION or DISBURSEMENT</li>
    <li><code>status</code>: Transaction status</li>
    <li><code>page</code>: Page number (default 1)</li>
    <li><code>limit</code>: Items per page (default 20)</li>
  </ul>
</div>

<h4>Utilities</h4>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/pretium/networks</code>
  <p>Get supported networks and countries.</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/pretium/account</code>
  <p>Get Pretium account details.</p>
</div>
`;

const idrxDocs = `
<h2 id="idrx">IDRX Integration (On/Off-Ramp) <span class="badge pending">In Progress</span></h2>
<p>Integration with IDRX for Indonesian Rupiah (IDR) on-ramp and off-ramp operations.</p>

<h3>Configuration</h3>
<table>
  <tr>
    <th>Variable</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><code>IDRXCO_API_URL</code></td>
    <td>Base URL for IDRX API</td>
  </tr>
  <tr>
    <td><code>IDRXCO_API_KEY</code></td>
    <td>Master API Key</td>
  </tr>
  <tr>
    <td><code>IDRXCO_SECRET_KEY</code></td>
    <td>Master Secret Key for signatures</td>
  </tr>
</table>

<h3>Current Implementation Status</h3>
<ul>
  <li>✅ <strong>Core Service</strong>: Signature generation, Request handling</li>
  <li>✅ <strong>Sync Service</strong>: Member synchronization, credential encryption</li>
  <li>⏳ <strong>Onboarding</strong>: Pending migration</li>
  <li>⏳ <strong>Bank Accounts</strong>: Pending migration</li>
  <li>⏳ <strong>Mint/Redeem</strong>: Pending migration</li>
</ul>

<h3>API Endpoints</h3>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/idrx/sync</code>
  <p><strong>Admin Only</strong>. Trigger synchronization of IDRX members to local database.</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/idrx/methods</code>
  <p>Get supported payment methods.</p>
</div>
`;

const yellowCardDocs = `
<h2 id="yellowcard">Yellow Card Integration (On/Off-Ramp) <span class="badge completed">Completed</span></h2>
<p>Direct integration with Yellow Card for African markets (NGN, KES, GHS, ZAR, etc.). Supports both collections (on-ramp) and payments (off-ramp) via crypto settlement.</p>

<h3>Configuration</h3>
<table>
  <tr>
    <th>Variable</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><code>YELLOWCARD_API_URL</code></td>
    <td>Base URL for Yellow Card API (Sandbox/Production)</td>
  </tr>
  <tr>
    <td><code>YELLOWCARD_API_KEY</code></td>
    <td>API Key for authentication</td>
  </tr>
  <tr>
    <td><code>YELLOWCARD_SECRET_KEY</code></td>
    <td>Secret Key for request signing and webhook verification</td>
  </tr>
</table>

<h3>API Endpoints</h3>

<h4>Information & Rates</h4>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/yellowcard/channels</code>
  <p>Get available payment channels.</p>
  <p><strong>Query Parameters:</strong></p>
  <ul>
    <li><code>country</code>: Filter by country code (e.g. NG, KE)</li>
    <li><code>type</code>: collection (on-ramp) or payment (off-ramp)</li>
  </ul>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/yellowcard/networks</code>
  <p>Get available networks (banks, mobile money).</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/yellowcard/rates</code>
  <p>Get exchange rates.</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/yellowcard/crypto-channels</code>
  <p>Get supported cryptocurrencies and networks.</p>
  <p><strong>Query Parameters:</strong></p>
  <ul>
    <li><code>evm_only</code>: boolean (default true)</li>
    <li><code>l2_only</code>: boolean (default false)</li>
  </ul>
</div>

<h4>Collection (On-Ramp)</h4>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/yellowcard/collection</code>
  <p>Create a collection request (Fiat -> Crypto).</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/yellowcard/collection</code>
  <p>Get collection status by ID.</p>
</div>

<h4>Payment (Off-Ramp)</h4>
<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/yellowcard/payment</code>
  <p>Create a payment request (Crypto -> Fiat).</p>
</div>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/yellowcard/payment</code>
  <p>Get payment status by ID.</p>
</div>

<h4>Transactions</h4>
<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/yellowcard/transactions</code>
  <p>Get transaction history.</p>
</div>
`;

router.get('/', (_req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>NedaPay Backend Migration Guide</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${css}
</head>
<body>
  <div class="nav">
    <strong>NedaPay Backend</strong>
    <a href="#overview">Overview</a>
    <a href="#apps">Apps & Keys</a>
    <a href="#paycrest">Paycrest</a>
    <a href="#pretium">Pretium</a>
    <a href="#idrx">IDRX</a>
    <a href="#yellowcard">Yellow Card</a>
  </div>

  <h1 id="overview">Migration & Integration Guide</h1>
  <p>This documentation tracks the status and usage of the new backend services.</p>

  ${appsDocs}

  ${paycrestDocs}

  ${pretiumDocs}
  
  ${idrxDocs}

  ${yellowCardDocs}

  <div style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #eee; color: #888; font-size: 0.9em;">
    Generated by NedaPay Backend Migration
  </div>
</body>
</html>
  `;
  res.send(html);
});

export default router;
