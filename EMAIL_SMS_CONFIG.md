# Email & SMS Configuration Summary

## ✅ Configured Services

### 1. Zoho Mail (Email)
- **SMTP Host**: smtp.zoho.com
- **Port**: 465 (SSL/TLS)
- **From**: md.nayem@shafacode.com
- **From Name**: Courier Delivery Service

### 2. SMS.net.bd (SMS)
- **API URL**: https://api.sms.net.bd/sendsms
- **API Key**: Configured
- **Sender ID**: Optional
- **Content ID**: Optional

## 📧 Email Configuration

### Environment Variables
```env
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=md.nayem@shafacode.com
SMTP_PASS=Kj1fBJrsmZJt
SMTP_FROM=md.nayem@shafacode.com
SMTP_FROM_NAME=Courier Delivery Service
```

### Features
- ✅ Professional HTML email templates
- ✅ Password reset emails with clickable links
- ✅ Branded emails with company name
- ✅ Secure SSL/TLS connection (port 465)
- ✅ Error handling and logging

### Email Template
Password reset emails include:
- Professional HTML design
- Clickable "Reset Password" button
- Plain text link as fallback
- 1-hour expiration notice
- Company branding
- Footer with copyright

## 📱 SMS Configuration

### Environment Variables
```env
SMS_API_KEY=mZtKXEaikp4Ki81Fc5WlR0S6Q7D1TdIKP0Xs4KIZ
SMS_API_URL=https://api.sms.net.bd/sendsms
SMS_SENDER_ID=
SMS_CONTENT_ID=
```

### Features
- ✅ Automatic phone number formatting (Bangladesh)
- ✅ Password reset SMS with links
- ✅ API error handling
- ✅ Request ID tracking
- ✅ Balance checking support

### Phone Number Formats
Automatically converts:
- `01712345678` → `8801712345678`
- `+8801712345678` → `8801712345678`
- `8801712345678` → `8801712345678`

## 🔄 Password Reset Flow

### Via Email
1. User enters email in forgot password form
2. System generates secure reset token (32 bytes)
3. Token stored in database with 1-hour expiration
4. Professional HTML email sent via Zoho Mail
5. User clicks link in email
6. User enters new password
7. Token validated and password updated

### Via Phone/SMS
1. User enters phone number in forgot password form
2. System generates secure reset token (32 bytes)
3. Token stored in database with 1-hour expiration
4. Phone number formatted to Bangladesh standard
5. SMS sent via SMS.net.bd API with reset link
6. User clicks link in SMS
7. User enters new password
8. Token validated and password updated

## 🧪 Testing

### Test Email (Zoho Mail)
```bash
# Request password reset via email
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# Check email inbox for reset link
# Email should arrive from: "Courier Delivery Service" <md.nayem@shafacode.com>
```

### Test SMS (SMS.net.bd)
```bash
# Request password reset via phone
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+8801712345678"
  }'

# Check phone for SMS
# Check server logs for: "Password reset SMS sent to 8801712345678"
```

## 📊 API Response Examples

### Successful Email
```
Console: Password reset email sent to user@example.com
Response: { "message": "If the account exists, a reset link will be sent" }
```

### Successful SMS
```
Console: Password reset SMS sent to 8801712345678. Request ID: 12345
Response: { "message": "If the account exists, a reset link will be sent" }
```

### SMS.net.bd API Response
```json
{
  "error": 0,
  "msg": "Request successfully submitted",
  "data": {
    "request_id": 12345
  }
}
```

## 🔍 Monitoring & Debugging

### Check Email Sending
```javascript
// Server logs will show:
// ✅ Success: "Password reset email sent to user@example.com"
// ❌ Error: "Error sending email: [error details]"
```

### Check SMS Sending
```javascript
// Server logs will show:
// ✅ Success: "Password reset SMS sent to 8801712345678. Request ID: 12345"
// ❌ Error: "SMS sending failed. Error: 417, Message: Insufficient balance"
```

### Check SMS Balance
```bash
curl "https://api.sms.net.bd/user/balance/?api_key=YOUR_API_KEY"
```

### Check SMS Report
```bash
curl "https://api.sms.net.bd/report/request/12345/?api_key=YOUR_API_KEY"
```

## ⚠️ Important Notes

### Email (Zoho Mail)
1. **Port 465** requires `SMTP_SECURE=true`
2. Credentials are already configured
3. Emails sent from: md.nayem@shafacode.com
4. Display name: "Courier Delivery Service"

### SMS (SMS.net.bd)
1. **API Key** is already configured
2. **Sender ID** is optional (leave empty if not approved)
3. **Content ID** is optional (required only for bulk SMS)
4. **Phone numbers** must be Bangladesh format (880...)
5. **Check balance** regularly to avoid service interruption

## 🚨 Error Handling

### Email Errors
- Connection refused → Check SMTP host/port
- Authentication failed → Verify credentials
- Timeout → Check network/firewall

### SMS Errors
- Error 417 → Insufficient balance (recharge account)
- Error 421 → First recharge required
- Error 416 → Invalid phone number format
- Error 415 → Message too long (>160 chars)

## 💰 Cost Management

### SMS Costs
- Check SMS.net.bd pricing
- Monitor balance regularly
- Set up low balance alerts
- Implement rate limiting on forgot-password endpoint

### Recommendations
1. Limit password reset requests (e.g., 3 per hour per user)
2. Monitor SMS usage in logs
3. Set up balance monitoring
4. Consider email as primary method (free)

## 🔐 Security Best Practices

1. ✅ API keys stored in environment variables
2. ✅ Never expose credentials in code
3. ✅ Rate limiting on forgot-password endpoint
4. ✅ Token expiration (1 hour)
5. ✅ Secure token generation (crypto.randomBytes)
6. ✅ Phone number validation
7. ✅ Email validation
8. ✅ Logging for audit trail

## 📚 Additional Resources

- [Zoho Mail SMTP Settings](https://www.zoho.com/mail/help/zoho-smtp.html)
- [SMS.net.bd API Documentation](https://sms.net.bd/)
- [SMS Setup Guide](./SMS_SETUP.md)
- [Authentication Setup](./AUTH_SETUP.md)

## ✅ Configuration Checklist

- [x] Zoho Mail SMTP configured
- [x] SMS.net.bd API key configured
- [x] Email templates created
- [x] Phone number formatting implemented
- [x] Error handling added
- [x] Logging implemented
- [x] Security measures in place
- [ ] Test email sending
- [ ] Test SMS sending
- [ ] Monitor SMS balance
- [ ] Set up rate limiting (recommended)
