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
    <a href="#paycrest">Paycrest</a>
    <a href="#idrx">IDRX</a>
    <a href="#yellowcard">Yellow Card</a>
  </div>

  <h1 id="overview">Migration & Integration Guide</h1>
  <p>This documentation tracks the status and usage of the new backend services.</p>

  ${paycrestDocs}
  
  ${idrxDocs}

  <h2 id="yellowcard">Yellow Card <span class="badge pending">Pending</span></h2>
  <p>Migration pending.</p>

  <div style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #eee; color: #888; font-size: 0.9em;">
    Generated by NedaPay Backend Migration
  </div>
</body>
</html>
  `;
  res.send(html);
});

export default router;
