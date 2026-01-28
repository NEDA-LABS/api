/**
 * Contacts API Documentation
 */

export const contactsDocs = `
<h2 id="contacts">Contacts Management <span class="badge completed">Completed</span></h2>
<p>Manage user contacts with support for multiple payment methods: crypto addresses, bank accounts, and phone numbers. Save recipient details for quick and easy transactions.</p>

<h3>Overview</h3>
<p>The Contacts API allows users to:</p>
<ul>
  <li>Store recipient information with multiple payment methods</li>
  <li>Link contacts to existing NedaPay users</li>
  <li>Organize contacts with favorites and search</li>
  <li>Track contact usage for quick access to frequently used recipients</li>
</ul>

<h3>Contact Structure</h3>
<p>Each contact can have:</p>
<ul>
  <li><strong>Basic Info:</strong> Name, nickname, country, notes</li>
  <li><strong>Crypto Addresses:</strong> Wallet addresses with optional ENS names and chain preferences</li>
  <li><strong>Bank Accounts:</strong> Account details with bank name, account number, and currency</li>
  <li><strong>Phone Numbers:</strong> Mobile numbers with provider and country information</li>
  <li><strong>Metadata:</strong> Favorite status, last used timestamp, linked NedaPay user</li>
</ul>

<h3>API Endpoints</h3>

<h4>Contact Management</h4>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method get">GET</span>
    <span class="endpoint-path">/api/v1/contacts</span>
  </div>
  <p>List all contacts for the authenticated user. <strong>Auth required.</strong></p>
  <p><strong>Query Parameters:</strong></p>
  <ul>
    <li><code>search</code>: Search by name, nickname, or notes</li>
    <li><code>country</code>: Filter by country code</li>
    <li><code>favorite</code>: Filter favorites (true/false)</li>
    <li><code>isNedaPayUser</code>: Filter linked NedaPay users (true/false)</li>
    <li><code>limit</code>: Results per page (default: 50)</li>
    <li><code>offset</code>: Pagination offset (default: 0)</li>
  </ul>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "contacts": [...],
  "total": 25,
  "hasMore": false
}</pre>
</div>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method get">GET</span>
    <span class="endpoint-path">/api/v1/contacts/:id</span>
  </div>
  <p>Get a single contact by ID. <strong>Auth required.</strong></p>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "contact": {
    "id": "uuid",
    "name": "John Doe",
    "nickname": "Johnny",
    "country": "US",
    "notes": "Business partner",
    "favorite": true,
    "isNedaPayUser": false,
    "bankAccounts": [...],
    "phoneNumbers": [...],
    "cryptoAddresses": [...],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}</pre>
</div>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method post">POST</span>
    <span class="endpoint-path">/api/v1/contacts</span>
  </div>
  <p>Create a new contact. <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "name": "John Doe",
  "nickname": "Johnny",
  "country": "US",
  "notes": "Business partner",
  "favorite": false,
  "bankAccounts": [
    {
      "accountNumber": "1234567890",
      "accountName": "John Doe",
      "bankName": "Chase Bank",
      "currency": "USD",
      "isPrimary": true,
      "label": "Main Account"
    }
  ],
  "phoneNumbers": [
    {
      "phoneNumber": "+1234567890",
      "provider": "Verizon",
      "country": "US",
      "isPrimary": true,
      "label": "Mobile"
    }
  ],
  "cryptoAddresses": [
    {
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "ensName": "johndoe.eth",
      "chainId": 1,
      "isPrimary": true,
      "label": "Main Wallet"
    }
  ]
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "contact": {...},
  "message": "Contact created successfully"
}</pre>
</div>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method put">PUT</span>
    <span class="endpoint-path">/api/v1/contacts/:id</span>
  </div>
  <p>Update contact basic information. <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "name": "John Doe Updated",
  "nickname": "JD",
  "country": "US",
  "notes": "Updated notes",
  "favorite": true
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "contact": {...},
  "message": "Contact updated successfully"
}</pre>
</div>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method delete">DELETE</span>
    <span class="endpoint-path">/api/v1/contacts/:id</span>
  </div>
  <p>Delete a contact. All associated payment methods will be deleted. <strong>Auth required.</strong></p>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "message": "Contact deleted successfully"
}</pre>
</div>

<h4>Contact Actions</h4>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method post">POST</span>
    <span class="endpoint-path">/api/v1/contacts/:id/favorite</span>
  </div>
  <p>Toggle favorite status. <strong>Auth required.</strong></p>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "favorite": true,
  "contact": {...}
}</pre>
</div>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method post">POST</span>
    <span class="endpoint-path">/api/v1/contacts/:id/last-used</span>
  </div>
  <p>Update last used timestamp. Automatically called when using a contact for transactions. <strong>Auth required.</strong></p>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "contact": {...}
}</pre>
</div>

<h4>Bank Accounts</h4>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method post">POST</span>
    <span class="endpoint-path">/api/v1/contacts/:id/bank-accounts</span>
  </div>
  <p>Add a bank account to a contact. <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "accountNumber": "9876543210",
  "accountName": "John Doe",
  "bankName": "Bank of America",
  "bankCode": "BOA",
  "currency": "USD",
  "isPrimary": false,
  "label": "Savings Account"
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "bankAccount": {
    "id": "uuid",
    "accountNumber": "9876543210",
    "accountName": "John Doe",
    "bankName": "Bank of America",
    "currency": "USD",
    "isPrimary": false,
    "label": "Savings Account"
  },
  "message": "Bank account added successfully"
}</pre>
</div>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method delete">DELETE</span>
    <span class="endpoint-path">/api/v1/contacts/:id/bank-accounts/:bankAccountId</span>
  </div>
  <p>Remove a bank account from a contact. <strong>Auth required.</strong></p>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "message": "Bank account removed successfully"
}</pre>
</div>

<h4>Phone Numbers</h4>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method post">POST</span>
    <span class="endpoint-path">/api/v1/contacts/:id/phone-numbers</span>
  </div>
  <p>Add a phone number to a contact. <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "phoneNumber": "+1987654321",
  "provider": "AT&T",
  "country": "US",
  "isPrimary": false,
  "label": "Work Phone"
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "phoneNumber": {
    "id": "uuid",
    "phoneNumber": "+1987654321",
    "provider": "AT&T",
    "country": "US",
    "isPrimary": false,
    "label": "Work Phone"
  },
  "message": "Phone number added successfully"
}</pre>
</div>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method delete">DELETE</span>
    <span class="endpoint-path">/api/v1/contacts/:id/phone-numbers/:phoneNumberId</span>
  </div>
  <p>Remove a phone number from a contact. <strong>Auth required.</strong></p>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "message": "Phone number removed successfully"
}</pre>
</div>

<h4>Crypto Addresses</h4>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method post">POST</span>
    <span class="endpoint-path">/api/v1/contacts/:id/crypto-addresses</span>
  </div>
  <p>Add a crypto address to a contact. <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "ensName": "john.eth",
  "chainId": 137,
  "isPrimary": false,
  "label": "Polygon Wallet"
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "cryptoAddress": {
    "id": "uuid",
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "ensName": "john.eth",
    "chainId": 137,
    "isPrimary": false,
    "label": "Polygon Wallet"
  },
  "message": "Crypto address added successfully"
}</pre>
</div>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method delete">DELETE</span>
    <span class="endpoint-path">/api/v1/contacts/:id/crypto-addresses/:cryptoAddressId</span>
  </div>
  <p>Remove a crypto address from a contact. <strong>Auth required.</strong></p>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "message": "Crypto address removed successfully"
}</pre>
</div>

<h4>User Search</h4>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="method post">POST</span>
    <span class="endpoint-path">/api/v1/contacts/search-users</span>
  </div>
  <p>Search for NedaPay users to link as contacts. <strong>Auth required.</strong></p>
  <p><strong>Request Body:</strong></p>
  <pre>{
  "query": "john",
  "type": "name"  // "wallet", "email", or "name"
}</pre>
  <p><strong>Response:</strong></p>
  <pre>{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "name": "John Smith",
      "email": "john@example.com",
      "wallet": "0x..."
    }
  ]
}</pre>
</div>

<h3>Usage Examples</h3>

<h4>Example 1: Create a Contact with Multiple Payment Methods</h4>
<pre>POST /api/v1/contacts
Content-Type: application/json
x-api-key: np_live_your_api_key

{
  "name": "Alice Johnson",
  "nickname": "Ali",
  "country": "KE",
  "notes": "Regular business partner",
  "favorite": true,
  "bankAccounts": [
    {
      "accountNumber": "1234567890",
      "accountName": "Alice Johnson",
      "bankName": "Equity Bank",
      "currency": "KES",
      "isPrimary": true,
      "label": "Main Account"
    }
  ],
  "phoneNumbers": [
    {
      "phoneNumber": "+254712345678",
      "provider": "Safaricom",
      "country": "KE",
      "isPrimary": true,
      "label": "M-Pesa"
    }
  ],
  "cryptoAddresses": [
    {
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "chainId": 137,
      "isPrimary": true,
      "label": "Polygon Wallet"
    }
  ]
}</pre>

<h4>Example 2: Search and Filter Contacts</h4>
<pre>GET /api/v1/contacts?search=alice&favorite=true&limit=10
x-api-key: np_live_your_api_key</pre>

<h4>Example 3: Add Payment Method to Existing Contact</h4>
<pre>POST /api/v1/contacts/{contactId}/crypto-addresses
Content-Type: application/json
x-api-key: np_live_your_api_key

{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "ensName": "alice.eth",
  "chainId": 1,
  "label": "Ethereum Mainnet"
}</pre>

<h3>Best Practices</h3>
<ul>
  <li><strong>Use Favorites:</strong> Mark frequently used contacts as favorites for quick access</li>
  <li><strong>Update Last Used:</strong> Call the last-used endpoint after successful transactions to track usage</li>
  <li><strong>Validate Addresses:</strong> Always validate crypto addresses and ENS names before saving</li>
  <li><strong>Label Payment Methods:</strong> Use descriptive labels to help users identify different accounts</li>
  <li><strong>Set Primary Methods:</strong> Mark one payment method as primary for each type</li>
  <li><strong>Link NedaPay Users:</strong> Use the search-users endpoint to link existing platform users</li>
</ul>

<div class="alert alert-info">
  <span>ℹ️</span>
  <div>
    <strong>Note:</strong> All contacts endpoints require API key authentication. Contacts are user-scoped and can only be accessed by their owner.
  </div>
</div>
`;
