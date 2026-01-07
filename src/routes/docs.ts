import { Router } from 'express';

const router = Router();

const css = `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --success: #10b981;
    --error: #ef4444;
    --warning: #f59e0b;
    --bg-primary: #ffffff;
    --bg-secondary: #f9fafb;
    --bg-tertiary: #f3f4f6;
    --text-primary: #111827;
    --text-secondary: #6b7280;
    --border: #e5e7eb;
    --code-bg: #1e293b;
    --sidebar-width: 280px;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--bg-secondary);
  }
  .container {
    display: flex;
    min-height: 100vh;
  }
  
  /* Sidebar */
  .sidebar {
    width: var(--sidebar-width);
    background: var(--bg-primary);
    border-right: 1px solid var(--border);
    position: fixed;
    height: 100vh;
    overflow-y: auto;
    padding: 2rem 0;
  }
  .sidebar-header {
    padding: 0 1.5rem 1.5rem;
    border-bottom: 1px solid var(--border);
  }
  .sidebar-header h1 {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary);
  }
  .sidebar-header p {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }
  .sidebar-nav {
    padding: 1.5rem 0;
  }
  .nav-section {
    margin-bottom: 1.5rem;
  }
  .nav-section-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    padding: 0 1.5rem;
    margin-bottom: 0.5rem;
    letter-spacing: 0.05em;
  }
  .nav-link {
    display: block;
    padding: 0.5rem 1.5rem;
    color: var(--text-primary);
    text-decoration: none;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  .nav-link:hover {
    background: var(--bg-secondary);
    color: var(--primary);
  }
  .nav-link.active {
    background: var(--bg-secondary);
    color: var(--primary);
    font-weight: 600;
    border-left: 3px solid var(--primary);
    padding-left: calc(1.5rem - 3px);
  }
  
  /* Main Content */
  .main-content {
    flex: 1;
    margin-left: var(--sidebar-width);
    padding: 2rem 3rem;
    max-width: 1200px;
  }
  
  /* API Key Manager */
  .api-key-manager {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }
  .api-key-manager h3 {
    font-size: 1.125rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .api-key-input-group {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }
  .api-key-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 8px;
    background: rgba(255,255,255,0.1);
    color: white;
    font-size: 0.875rem;
    font-family: monospace;
    transition: all 0.2s;
  }
  .api-key-input::placeholder {
    color: rgba(255,255,255,0.6);
  }
  .api-key-input:focus {
    outline: none;
    background: rgba(255,255,255,0.15);
    border-color: rgba(255,255,255,0.5);
  }
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .btn-primary {
    background: white;
    color: var(--primary);
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .btn-secondary {
    background: rgba(255,255,255,0.2);
    color: white;
  }
  .btn-secondary:hover {
    background: rgba(255,255,255,0.3);
  }
  .api-key-status {
    margin-top: 0.75rem;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--success);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  /* Typography */
  h1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary); }
  h2 { font-size: 1.875rem; font-weight: 700; margin: 3rem 0 1.5rem; color: var(--text-primary); padding-bottom: 0.75rem; border-bottom: 2px solid var(--border); }
  h3 { font-size: 1.5rem; font-weight: 600; margin: 2rem 0 1rem; color: var(--text-primary); }
  h4 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 1rem; color: var(--text-primary); }
  p { margin-bottom: 1rem; color: var(--text-secondary); }
  
  /* Code */
  code {
    background: var(--bg-tertiary);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875em;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    color: var(--primary);
  }
  pre {
    background: var(--code-bg);
    color: #e2e8f0;
    padding: 1.25rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1rem 0;
    font-size: 0.875rem;
    line-height: 1.7;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  pre code {
    background: transparent;
    color: inherit;
    padding: 0;
  }
  
  /* Endpoint Cards */
  .endpoint {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    transition: all 0.2s;
  }
  .endpoint:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    border-color: var(--primary);
  }
  .endpoint-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .method {
    font-weight: 700;
    font-size: 0.75rem;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .method.get { background: #dbeafe; color: #1e40af; }
  .method.post { background: #d1fae5; color: #065f46; }
  .method.put { background: #fef3c7; color: #92400e; }
  .method.delete { background: #fee2e2; color: #991b1b; }
  .endpoint-path {
    font-family: monospace;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  .try-it-btn {
    margin-left: auto;
    padding: 0.5rem 1rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .try-it-btn:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
  }
  .try-it-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* API Tester */
  .api-tester {
    margin-top: 1rem;
    padding: 1.5rem;
    background: var(--bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  .api-tester-header {
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }
  .form-group {
    margin-bottom: 1rem;
  }
  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }
  .form-input, .form-textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: monospace;
    background: var(--bg-primary);
    transition: all 0.2s;
  }
  .form-input:focus, .form-textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  .form-textarea {
    min-height: 120px;
    resize: vertical;
  }
  .api-response {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--code-bg);
    border-radius: 8px;
    color: #e2e8f0;
    font-family: monospace;
    font-size: 0.875rem;
    max-height: 400px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .response-success { border-left: 4px solid var(--success); }
  .response-error { border-left: 4px solid var(--error); }
  .loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    background: var(--bg-primary);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  th, td {
    text-align: left;
    padding: 1rem;
    border-bottom: 1px solid var(--border);
  }
  th {
    background: var(--bg-tertiary);
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary);
  }
  td {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  tr:last-child td {
    border-bottom: none;
  }
  
  /* Badges */
  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .badge.completed { background: #d1fae5; color: #065f46; }
  .badge.pending { background: #fee2e2; color: #991b1b; }
  
  /* Lists */
  ul { padding-left: 1.5rem; margin: 1rem 0; }
  li { margin-bottom: 0.5rem; color: var(--text-secondary); }
  ol { padding-left: 1.5rem; margin: 1rem 0; }
  ol li { margin-bottom: 0.75rem; }
  
  /* Alert */
  .alert {
    padding: 1rem 1.25rem;
    border-radius: 8px;
    margin: 1rem 0;
    display: flex;
    align-items: start;
    gap: 0.75rem;
  }
  .alert-info { background: #dbeafe; border-left: 4px solid #3b82f6; color: #1e40af; }
  .alert-warning { background: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e; }
  .alert-error { background: #fee2e2; border-left: 4px solid #ef4444; color: #991b1b; }
  
  /* Responsive */
  @media (max-width: 1024px) {
    .sidebar { display: none; }
    .main-content { margin-left: 0; padding: 1.5rem; }
  }
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
<p>Integration with Pretium API for African markets. Supports mobile money deposits (on-ramp) and payouts (off-ramp).</p>

<h3>Supported Countries & Currencies</h3>
<table>
  <tr><th>Country</th><th>Code</th><th>Currency</th><th>Currency Code</th></tr>
  <tr><td>Malawi</td><td>MW</td><td>Malawian Kwacha</td><td>MWK</td></tr>
  <tr><td>DR Congo</td><td>CD</td><td>Congolese Franc</td><td>CDF</td></tr>
  <tr><td>Ethiopia</td><td>ET</td><td>Ethiopian Birr</td><td>ETB</td></tr>
  <tr><td>Kenya</td><td>KE</td><td>Kenyan Shilling</td><td>KES</td></tr>
  <tr><td>Ghana</td><td>GH</td><td>Ghanaian Cedi</td><td>GHS</td></tr>
  <tr><td>Uganda</td><td>UG</td><td>Ugandan Shilling</td><td>UGX</td></tr>
</table>

<h3>Configuration</h3>
<table>
  <tr><th>Variable</th><th>Description</th></tr>
  <tr><td><code>PRETIUM_BASE_URL</code></td><td>Base URL for Pretium API</td></tr>
  <tr><td><code>PRETIUM_API_KEY</code></td><td>API Key for authentication</td></tr>
  <tr><td><code>PRETIUM_WEBHOOK_SECRET</code></td><td>Secret for webhook verification</td></tr>
</table>

<h3>API Endpoints</h3>

<!-- ===================== UTILITIES ===================== -->
<h4>Utilities (No Auth Required for /networks)</h4>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method get">GET</span>
    <span class="endpoint-path">/api/v1/ramp/pretium/networks</span>
    <button class="try-it-btn" onclick="toggleTester('pretium-networks')">Try It</button>
  </div>
  <p>Get all supported countries, currencies, and mobile money networks. Use this to populate country/network selectors.</p>
  <p><strong>Query Parameters (optional):</strong></p>
  <ul>
    <li><code>country</code>: ISO country code (e.g., <code>MW</code>, <code>KE</code>) to filter networks for a specific country</li>
  </ul>
  
  <div id="pretium-networks" class="api-tester" style="display: none;">
    <div class="api-tester-header">Test this endpoint</div>
    <div class="form-group">
      <label class="form-label">Country Code (optional)</label>
      <input type="text" id="pretium-networks-country" class="form-input" placeholder="e.g., MW, KE (leave empty for all)" />
    </div>
    <button class="btn btn-primary" id="pretium-networks-submit" onclick="testPretiumNetworks()">Send Request</button>
    <div id="pretium-networks-response" class="api-response" style="display: none;"></div>
  </div>
  
  <p><strong>Response (no country filter):</strong></p>
  <pre>{
  "status": "success",
  "statusCode": 200,
  "message": "success",
  "data": {
    "countries": { "MW": "Malawi", "CD": "DR Congo", ... },
    "currencies": [
      { "country": "MW", "currency_code": "MWK" },
      { "country": "KE", "currency_code": "KES" }, ...
    ],
    "networks": {
      "MW": [
        { "code": "Airtel Money", "name": "Airtel Money", "type": "mobile_money", "country": "MW" },
        { "code": "TNM Mpamba", "name": "TNM Mpamba", "type": "mobile_money", "country": "MW" }
      ], ...
    }
  }
}</pre>
</div>

<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/pretium/account</code>
  <p>Get Pretium account details including settlement wallet addresses per chain. <strong>Auth required.</strong></p>
  <p><strong>Response:</strong></p>
  <pre>{
  "status": "success",
  "statusCode": 200,
  "data": {
    "networks": [
      { "name": "Base", "settlement_wallet_address": "0x..." },
      { "name": "Celo", "settlement_wallet_address": "0x..." }
    ]
  }
}</pre>
</div>

<!-- ===================== QUOTES & RATES ===================== -->
<h4>Quotes & Rates</h4>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method post">POST</span>
    <span class="endpoint-path">/api/v1/ramp/pretium/exchange-rate</span>
    <button class="try-it-btn" onclick="toggleTester('pretium-exchange-rate')">Try It</button>
  </div>
  <p>Get exchange rate for a specific fiat currency. <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "currency_code": "MWK"  // KES, MWK, CDF, GHS, UGX, ETB
}</pre>
  
  <div id="pretium-exchange-rate" class="api-tester" style="display: none;">
    <div class="api-tester-header">Test this endpoint</div>
    <div class="form-group">
      <label class="form-label">Request Body (JSON)</label>
      <textarea id="pretium-exchange-rate-body" class="form-textarea" placeholder='{"currency_code": "KES"}'>{"currency_code": "KES"}</textarea>
    </div>
    <button class="btn btn-primary" id="pretium-exchange-rate-submit" onclick="makeApiCall('pretium-exchange-rate', 'POST', '/api/v1/ramp/pretium/exchange-rate', true)">Send Request</button>
    <div id="pretium-exchange-rate-response" class="api-response" style="display: none;"></div>
  </div>
  
  <p><strong>Response:</strong></p>
  <pre>{
  "status": "success",
  "statusCode": 200,
  "data": {
    "buying_rate": 1720.50,
    "selling_rate": 1750.00,
    "quoted_rate": 1735.25  // Computed: (buying + selling) / 2
  }
}</pre>
</div>

<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/pretium/quote</code>
  <p>Get a quote for a transaction (off-ramp). <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "source_currency": "USDT",  // or USDC
  "target_currency": "MWK",   // Fiat currency code
  "amount": 100,              // Amount in source currency
  "type": "source"            // "source" or "target"
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{
  "status": "success",
  "statusCode": 200,
  "data": {
    "rate": 1720.50,
    "source_amount": 100,
    "target_amount": 172050,
    "fee": 0,
    "expires_at": "2024-01-01T12:15:00.000Z",
    "quote_id": "mock-quote-id-1234567890"
  }
}</pre>
</div>

<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/pretium/rates</code>
  <p>Get general exchange rates (USD base).</p>
</div>

<!-- ===================== ON-RAMP (DEPOSIT) ===================== -->
<h4>On-Ramp (Deposit) Flow</h4>
<p>Flow: User pays via mobile money → Receives stablecoin (USDC/USDT) to wallet.</p>

<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/pretium/onramp</code>
  <p>Initiate a mobile money deposit. Sends STK push to user's phone. <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "currency_code": "KES",         // Fiat currency (KES, MWK, CDF, GHS, UGX)
  "shortcode": "254712345678",    // Customer phone number
  "amount": 1000,                 // Amount in fiat currency
  "mobile_network": "Safaricom",  // Network code from /networks
  "chain": "BASE",                // Blockchain: BASE, CELO, POLYGON, SCROLL
  "asset": "USDC",                // USDC or USDT
  "address": "0x..."              // Recipient wallet address
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{
  "status": "success",
  "statusCode": 200,
  "data": {
    "status": "PENDING",
    "transaction_code": "TXN123456789",
    "message": "STK push sent"
  }
}</pre>
</div>

<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/pretium/status</code>
  <p>Check on-ramp transaction status. Poll this after initiating deposit. <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "currency_code": "KES",
  "transaction_code": "TXN123456789"
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{
  "status": "success",
  "statusCode": 200,
  "data": {
    "transaction_code": "TXN123456789",
    "status": "COMPLETE",  // PENDING, PROCESSING, COMPLETE, FAILED
    "amount": "1000",
    "amount_in_usd": "7.50",
    "shortcode": "254712345678",
    "receipt_number": "RCP123",
    "chain": "BASE",
    "asset": "USDC",
    "transaction_hash": "0x...",
    "is_released": true,
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}</pre>
</div>

<!-- ===================== OFF-RAMP (DISBURSEMENT) ===================== -->
<h4>Off-Ramp (Disbursement) Flow</h4>
<p>Flow: User sends stablecoin to settlement wallet → Receives fiat via mobile money.</p>

<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/pretium/disburse</code>
  <p>Initiate a disbursement (payout) after on-chain transfer. <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "quote_id": "mock-quote-id-1234567890",
  "transaction_hash": "0x...",    // Hash of on-chain transfer to settlement wallet
  "chain": "BASE",                // Blockchain used for transfer
  "target_amount": 172050,        // Fiat amount to disburse
  "destination": {
    "type": "mobile_money",       // or "bank_account"
    "account_number": "254712345678",
    "account_name": "John Doe",
    "network_code": "Safaricom",  // Network code from /networks
    "country": "KE"               // ISO country code
  }
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{
  "status": "success",
  "statusCode": 200,
  "data": {
    "id": "DISB123456",
    "status": "pending",
    "reference": "REF123",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}</pre>
</div>

<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/pretium/disburse/:id</code>
  <p>Get disbursement status by ID. <strong>Auth required.</strong></p>
  <p><strong>Response:</strong></p>
  <pre>{
  "status": "success",
  "statusCode": 200,
  "data": {
    "id": "DISB123456",
    "status": "completed",  // pending, processing, completed, failed
    "reference": "REF123",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}</pre>
</div>

<!-- ===================== TRANSACTIONS ===================== -->
<h4>Transactions</h4>

<div class="endpoint">
  <span class="method get">GET</span> <code>/api/v1/ramp/pretium/transactions</code>
  <p>Get user's Pretium transaction history. <strong>Auth required.</strong></p>
  <p><strong>Query Parameters:</strong></p>
  <ul>
    <li><code>type</code>: <code>COLLECTION</code> (on-ramp) or <code>DISBURSEMENT</code> (off-ramp)</li>
    <li><code>status</code>: <code>PENDING</code>, <code>PROCESSING</code>, <code>COMPLETED</code>, <code>FAILED</code></li>
    <li><code>page</code>: Page number (default: 1)</li>
    <li><code>limit</code>: Items per page (default: 20)</li>
  </ul>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "statusCode": 200,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "pretiumId": "TXN123456789",
        "type": "COLLECTION",
        "status": "COMPLETED",
        "sourceAmount": "1000",
        "sourceCurrency": "KES",
        "targetAmount": "7.50",
        "targetCurrency": "USDC",
        "networkCode": "Safaricom",
        "accountNumber": "254712345678",
        "country": "KE",
        "txHash": "0x...",
        "createdAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "meta": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  },
  "transactions": [...]  // Also at root level for compatibility
}</pre>
</div>

<!-- ===================== WEBHOOK ===================== -->
<h4>Webhook</h4>

<div class="endpoint">
  <span class="method post">POST</span> <code>/api/v1/ramp/pretium/webhook</code>
  <p>Webhook endpoint for Pretium status updates. Configure this URL in Pretium dashboard.</p>
  <p><strong>Webhook Payload (from Pretium):</strong></p>
  <pre>{
  "transaction_code": "TXN123456789",
  "status": "COMPLETE"  // PENDING, PROCESSING, COMPLETE, FAILED
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{ "received": true }</pre>
</div>

<h3>Integration Example (On-Ramp Flow)</h3>
<ol>
  <li>Call <code>GET /networks?country=KE</code> to get available mobile networks</li>
  <li>Call <code>POST /exchange-rate</code> with <code>currency_code: "KES"</code> to show conversion rate</li>
  <li>Call <code>POST /onramp</code> with user details to initiate STK push</li>
  <li>Poll <code>POST /status</code> every 5 seconds until status is <code>COMPLETE</code> or <code>FAILED</code></li>
</ol>

<h3>Integration Example (Off-Ramp Flow)</h3>
<ol>
  <li>Call <code>GET /networks?country=MW</code> to get available mobile networks</li>
  <li>Call <code>GET /account</code> to get settlement wallet address for the chain</li>
  <li>Call <code>POST /quote</code> to get exchange rate and target amount</li>
  <li>Execute on-chain transfer of stablecoin to settlement wallet</li>
  <li>Call <code>POST /disburse</code> with transaction hash and destination details</li>
  <li>Optionally poll <code>GET /disburse/:id</code> for status updates</li>
</ol>
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
  <title>NedaPay API Documentation</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${css}
</head>
<body>
  <div class="container">
    <!-- Sidebar Navigation -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>NedaPay API</h1>
        <p>v1.0 Documentation</p>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-title">Getting Started</div>
          <a href="#overview" class="nav-link">Overview</a>
          <a href="#authentication" class="nav-link">Authentication</a>
          <a href="#apps" class="nav-link">Apps & API Keys</a>
        </div>
        <div class="nav-section">
          <div class="nav-section-title">Integrations</div>
          <a href="#paycrest" class="nav-link">Paycrest (Off-Ramp)</a>
          <a href="#pretium" class="nav-link">Pretium (On/Off-Ramp)</a>
          <a href="#idrx" class="nav-link">IDRX (Indonesia)</a>
          <a href="#yellowcard" class="nav-link">Yellow Card</a>
        </div>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- API Key Manager -->
      <div class="api-key-manager">
        <h3>🔑 API Key Configuration</h3>
        <div class="api-key-input-group">
          <input 
            type="text" 
            id="apiKeyInput" 
            class="api-key-input" 
            placeholder="Enter your API key (np_live_...)"
            autocomplete="off"
          />
          <button class="btn btn-primary" onclick="saveApiKey()">Save Key</button>
          <button class="btn btn-secondary" onclick="clearApiKey()">Clear</button>
        </div>
        <div class="api-key-status" id="apiKeyStatus" style="display: none;">
          <span class="status-indicator"></span>
          <span>API Key configured</span>
        </div>
      </div>

      <h1 id="overview">API Documentation</h1>
      <p>Welcome to NedaPay's API documentation. Test endpoints directly from this page using your API key.</p>

      <div class="alert alert-info">
        <span>ℹ️</span>
        <div>
          <strong>Production Base URL:</strong> <code>https://api.nedapay.xyz</code><br>
          All API calls from this page will be made to the production environment.
        </div>
      </div>

      <h2 id="authentication">Authentication</h2>
      <p>All protected endpoints require an API key. Include it in the request header:</p>
      <pre>x-api-key: np_live_your_api_key_here</pre>
      <p>Or via Bearer token:</p>
      <pre>Authorization: Bearer np_live_your_api_key_here</pre>

      ${appsDocs}

      ${paycrestDocs}

      ${pretiumDocs}
      
      ${idrxDocs}

      ${yellowCardDocs}

      <div style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border); color: var(--text-secondary); font-size: 0.875rem;">
        <p>© 2024 NedaPay. All rights reserved.</p>
      </div>
    </main>
  </div>

  <script>
    const API_BASE_URL = 'https://api.nedapay.xyz';
    
    // Load API key from localStorage on page load
    window.addEventListener('DOMContentLoaded', () => {
      const savedKey = localStorage.getItem('nedapay_api_key');
      if (savedKey) {
        document.getElementById('apiKeyInput').value = savedKey;
        document.getElementById('apiKeyStatus').style.display = 'flex';
      }
      
      // Highlight active nav link on scroll
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            document.querySelectorAll('.nav-link').forEach(link => {
              link.classList.remove('active');
              if (link.getAttribute('href') === '#' + id) {
                link.classList.add('active');
              }
            });
          }
        });
      }, { rootMargin: '-100px 0px -80% 0px' });
      
      document.querySelectorAll('h2[id], h3[id]').forEach(heading => {
        observer.observe(heading);
      });
    });

    function saveApiKey() {
      const apiKey = document.getElementById('apiKeyInput').value.trim();
      if (!apiKey) {
        alert('Please enter an API key');
        return;
      }
      if (!apiKey.startsWith('np_')) {
        alert('Invalid API key format. Keys should start with "np_"');
        return;
      }
      localStorage.setItem('nedapay_api_key', apiKey);
      document.getElementById('apiKeyStatus').style.display = 'flex';
      showToast('API key saved successfully', 'success');
    }

    function clearApiKey() {
      localStorage.removeItem('nedapay_api_key');
      document.getElementById('apiKeyInput').value = '';
      document.getElementById('apiKeyStatus').style.display = 'none';
      showToast('API key cleared', 'info');
    }

    function getApiKey() {
      return localStorage.getItem('nedapay_api_key');
    }

    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = \`alert alert-\${type}\`;
      toast.style.position = 'fixed';
      toast.style.top = '20px';
      toast.style.right = '20px';
      toast.style.zIndex = '9999';
      toast.style.minWidth = '300px';
      toast.innerHTML = \`<span>\${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ️'}</span><div>\${message}</div>\`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    function toggleTester(endpointId) {
      const tester = document.getElementById(endpointId);
      if (tester.style.display === 'none' || !tester.style.display) {
        tester.style.display = 'block';
      } else {
        tester.style.display = 'none';
      }
    }

    async function makeApiCall(endpointId, method, path, requiresAuth = true, bodyTemplate = null) {
      const apiKey = getApiKey();
      if (requiresAuth && !apiKey) {
        showToast('Please configure your API key first', 'error');
        return;
      }

      const responseDiv = document.getElementById(endpointId + '-response');
      const submitBtn = document.getElementById(endpointId + '-submit');
      const bodyInput = document.getElementById(endpointId + '-body');
      
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
      responseDiv.style.display = 'block';
      responseDiv.innerHTML = 'Loading...';
      responseDiv.className = 'api-response';

      try {
        const headers = {
          'Content-Type': 'application/json'
        };
        
        if (requiresAuth && apiKey) {
          headers['x-api-key'] = apiKey;
        }

        const options = {
          method: method,
          headers: headers
        };

        // Parse and include request body for POST/PUT requests
        if ((method === 'POST' || method === 'PUT') && bodyInput) {
          try {
            const bodyText = bodyInput.value.trim();
            if (bodyText) {
              options.body = bodyText;
              // Validate JSON
              JSON.parse(bodyText);
            }
          } catch (e) {
            throw new Error('Invalid JSON in request body: ' + e.message);
          }
        }

        const url = API_BASE_URL + path;
        const response = await fetch(url, options);
        const data = await response.json();

        // Display response
        responseDiv.textContent = JSON.stringify(data, null, 2);
        responseDiv.className = 'api-response ' + (response.ok ? 'response-success' : 'response-error');
        
        showToast(
          response.ok ? 'Request successful' : \`Request failed: \${response.status}\`,
          response.ok ? 'success' : 'error'
        );

      } catch (error) {
        responseDiv.textContent = 'Error: ' + error.message;
        responseDiv.className = 'api-response response-error';
        showToast('Request failed: ' + error.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Request';
      }
    }

    // Pretium Networks endpoint tester
    async function testPretiumNetworks() {
      const countryInput = document.getElementById('pretium-networks-country');
      const country = countryInput.value.trim();
      
      let path = '/api/v1/ramp/pretium/networks';
      if (country) {
        path += '?country=' + encodeURIComponent(country);
      }

      const responseDiv = document.getElementById('pretium-networks-response');
      const submitBtn = document.getElementById('pretium-networks-submit');
      
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
      responseDiv.style.display = 'block';
      responseDiv.innerHTML = 'Loading...';
      responseDiv.className = 'api-response';

      try {
        const url = API_BASE_URL + path;
        const response = await fetch(url);
        const data = await response.json();

        responseDiv.textContent = JSON.stringify(data, null, 2);
        responseDiv.className = 'api-response ' + (response.ok ? 'response-success' : 'response-error');
        
        showToast(
          response.ok ? 'Request successful' : \`Request failed: \${response.status}\`,
          response.ok ? 'success' : 'error'
        );

      } catch (error) {
        responseDiv.textContent = 'Error: ' + error.message;
        responseDiv.className = 'api-response response-error';
        showToast('Request failed: ' + error.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Request';
      }
    }
  </script>
</body>
</html>
  `;
  res.send(html);
});

export default router;
