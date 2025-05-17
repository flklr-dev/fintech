# Penetration Testing Practical Guide

## Prerequisites
1. Testing Environment Setup
   - Dedicated testing environment
   - Test data sets
   - Test payment cards
   - Network access
   - Required tools installed

2. Required Tools
   - Burp Suite Professional
   - OWASP ZAP
   - Metasploit
   - Nmap
   - Postman
   - Custom testing scripts

## Step-by-Step Testing Procedures

### 1. Payment Gateway Testing

#### A. API Endpoint Discovery
```bash
# Using Nmap for service discovery
nmap -sV -p- target-domain.com

# Using OWASP ZAP for API discovery
zap-cli quick-scan --self-contained --start-options "-config api.disablekey=true" https://target-domain.com
```

#### B. Authentication Testing
1. Test OAuth2 Implementation
```bash
# Test token handling
curl -X POST https://api.target-domain.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"test","client_secret":"test"}'
```

2. Test JWT Implementation
```javascript
// Test JWT token manipulation
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const decoded = jwt.decode(token);
const modified = jwt.sign(decoded, "test_key");
```

#### C. Transaction Testing
1. Test Payment Flow
```javascript
// Test payment processing
const payment = {
  amount: "100.00",
  currency: "USD",
  card: {
    number: "4111111111111111",
    exp_month: "12",
    exp_year: "2025",
    cvc: "123"
  }
};

// Test with different amounts
const amounts = ["0.01", "999999.99", "-100.00", "0"];
```

2. Test Error Handling
```javascript
// Test invalid card numbers
const invalidCards = [
  "4111111111111112", // Invalid checksum
  "1234567890123456", // Invalid format
  "0000000000000000"  // Test card
];
```

### 2. Data Security Testing

#### A. Encryption Testing
1. Test AES-256 Implementation
```javascript
// Test encryption strength
const testData = "sensitive_data";
const encrypted = crypto.AES.encrypt(testData, key);
const decrypted = crypto.AES.decrypt(encrypted, key);

// Verify encryption
console.assert(decrypted.toString() === testData, "Encryption test failed");
```

2. Test Key Management
```javascript
// Test key rotation
const oldKey = "old_encryption_key";
const newKey = "new_encryption_key";

// Verify data re-encryption
const reencrypted = await rotateEncryptionKey(oldKey, newKey);
```

#### B. Storage Security Testing
1. Test Secure Storage
```javascript
// Test secure storage implementation
const testData = {
  cardNumber: "4111111111111111",
  cvv: "123",
  expiry: "12/25"
};

// Test storage
await secureStorage.setItem("test_card", testData);
const retrieved = await secureStorage.getItem("test_card");

// Verify data protection
console.assert(retrieved.cardNumber === "****1111", "Card masking failed");
```

### 3. API Security Testing

#### A. Input Validation Testing
```javascript
// Test SQL injection prevention
const testInputs = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "1; SELECT * FROM users"
];

// Test XSS prevention
const xssPayloads = [
  "<script>alert('xss')</script>",
  "javascript:alert('xss')",
  "<img src=x onerror=alert('xss')>"
];
```

#### B. Rate Limiting Testing
```bash
# Test rate limiting
for i in {1..100}; do
  curl -X POST https://api.target-domain.com/payment \
    -H "Content-Type: application/json" \
    -d '{"amount":"100.00"}'
done
```

### 4. Network Security Testing

#### A. SSL/TLS Testing
```bash
# Test SSL configuration
openssl s_client -connect target-domain.com:443 -tls1_2
openssl s_client -connect target-domain.com:443 -tls1_1
openssl s_client -connect target-domain.com:443 -tls1
```

#### B. Firewall Testing
```bash
# Test firewall rules
nmap -sS -p- target-domain.com
nmap -sU -p- target-domain.com
```

## Testing Checklist

### 1. Pre-Testing
- [ ] Obtain necessary permissions
- [ ] Set up test environment
- [ ] Prepare test data
- [ ] Configure testing tools
- [ ] Document baseline state

### 2. During Testing
- [ ] Follow testing methodology
- [ ] Document all findings
- [ ] Take screenshots/evidence
- [ ] Note any system impacts
- [ ] Track test progress

### 3. Post-Testing
- [ ] Clean up test data
- [ ] Document all vulnerabilities
- [ ] Prepare remediation steps
- [ ] Create test report
- [ ] Schedule remediation review

## Common Test Scenarios

### 1. Payment Processing
1. Test valid transactions
2. Test invalid transactions
3. Test transaction limits
4. Test concurrent transactions
5. Test transaction rollback

### 2. Data Protection
1. Test data encryption
2. Test data masking
3. Test data transmission
4. Test data storage
5. Test data backup

### 3. Access Control
1. Test authentication
2. Test authorization
3. Test session management
4. Test role-based access
5. Test privilege escalation

## Reporting Template

### 1. Executive Summary
- Testing scope
- Key findings
- Risk levels
- Business impact
- Recommendations

### 2. Technical Details
- Vulnerability description
- Proof of concept
- Impact assessment
- Remediation steps
- Validation procedure

### 3. Appendices
- Test data
- Tool configurations
- Network diagrams
- Test logs
- Evidence collection 