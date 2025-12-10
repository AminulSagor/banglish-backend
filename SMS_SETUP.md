# SMS.net.bd Integration Guide

## Overview

The application uses SMS.net.bd API for sending SMS notifications, particularly for password reset functionality.

## Configuration

### Environment Variables

Add these to your `.env.development` file:

```env
SMS_API_KEY=your-api-key-here
SMS_API_URL=https://api.sms.net.bd/sendsms
SMS_SENDER_ID=your-sender-id (optional)
SMS_CONTENT_ID=your-content-id (optional for bulk SMS)
```

### Getting Your API Key

1. Visit [SMS.net.bd](https://sms.net.bd/)
2. Sign up or log in to your account
3. Navigate to API settings
4. Copy your API key

### Sender ID (Optional)

If you have an approved Sender ID:
- Add it to `SMS_SENDER_ID` environment variable
- This will appear as the sender name in SMS messages

### Content ID (Optional)

For bulk SMS campaigns:
- Get your content approved by SMS.net.bd
- Add the content ID to `SMS_CONTENT_ID`

## Phone Number Format

The system automatically formats phone numbers for Bangladesh:

- **Input**: `01712345678` or `+8801712345678` or `8801712345678`
- **Formatted**: `8801712345678` (required by SMS.net.bd)

Supported formats:
- `01XXXXXXXXX` → `8801XXXXXXXXX`
- `+8801XXXXXXXXX` → `8801XXXXXXXXX`
- `8801XXXXXXXXX` → `8801XXXXXXXXX`

## API Endpoints

### Send SMS
```
POST https://api.sms.net.bd/sendsms
```

**Parameters:**
- `api_key` (required): Your API key
- `msg` (required): Message content
- `to` (required): Recipient number (format: 8801XXXXXXXXX)
- `sender_id` (optional): Your approved sender ID
- `content_id` (optional): Your approved content ID
- `schedule` (optional): Schedule time (format: Y-m-d H:i:s)

**Response:**
```json
{
  "error": 0,
  "msg": "Request successfully submitted",
  "data": {
    "request_id": 12345
  }
}
```

### Check Balance
```
GET https://api.sms.net.bd/user/balance/?api_key={YOUR_API_KEY}
```

**Response:**
```json
{
  "error": 0,
  "msg": "Success",
  "data": {
    "balance": "100.0000"
  }
}
```

### Check SMS Report
```
GET https://api.sms.net.bd/report/request/{request_id}/?api_key={YOUR_API_KEY}
```

**Response:**
```json
{
  "error": 0,
  "msg": "Success",
  "data": {
    "request_id": 12345,
    "request_status": "Complete",
    "request_charge": "0.2500",
    "recipients": [
      {
        "number": "8801712345678",
        "charge": "0.2500",
        "status": "Sent"
      }
    ]
  }
}
```

## Error Codes

### Common Errors
- **0**: Success
- **400**: Missing or invalid parameter
- **403**: No permissions
- **404**: Resource not found
- **405**: Authorization required
- **409**: Unknown server error

### SMS-Specific Errors
- **410**: Account expired
- **411**: Reseller account expired/suspended
- **412**: Invalid schedule
- **413**: Invalid sender ID
- **414**: Message is empty
- **415**: Message too long
- **416**: No valid number found
- **417**: Insufficient balance
- **420**: Content blocked
- **421**: Can only send to registered number (before first recharge)

## Usage in Application

### Password Reset Flow

1. User requests password reset via email or phone
2. System generates reset token
3. If phone number provided:
   - Formats phone number to Bangladesh format
   - Sends SMS with reset link via SMS.net.bd API
4. User receives SMS with reset link
5. User clicks link and resets password

### SMS Message Template

```
Your password reset link: {FRONTEND_URL}/reset-password?token={TOKEN}. 
This link will expire in 1 hour. If you didn't request this, please ignore.
```

## Testing

### Test SMS Sending

```bash
# 1. Register user with phone number
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+8801712345678",
    "password": "Test@123456",
    "fullName": "Test User"
  }'

# 2. Request password reset
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+8801712345678"
  }'

# 3. Check server logs for SMS status
# You should see: "Password reset SMS sent to 8801712345678. Request ID: XXXXX"
```

## Troubleshooting

### SMS Not Sending

1. **Check API Key**: Verify `SMS_API_KEY` is correct
2. **Check Balance**: Ensure you have sufficient balance
3. **Phone Format**: Verify number starts with 880
4. **Check Logs**: Look for error messages in console

### Common Issues

**Error 417 - Insufficient Balance**
- Solution: Recharge your SMS.net.bd account

**Error 421 - Can only send to registered number**
- Solution: This occurs before first recharge. Add balance to your account.

**Error 416 - No valid number found**
- Solution: Check phone number format (should be 8801XXXXXXXXX)

**Error 415 - Message too long**
- Solution: SMS messages are limited to 160 characters (English) or 70 characters (Unicode)

### Check Balance

```bash
curl "https://api.sms.net.bd/user/balance/?api_key=YOUR_API_KEY"
```

### View SMS Report

```bash
curl "https://api.sms.net.bd/report/request/REQUEST_ID/?api_key=YOUR_API_KEY"
```

## Best Practices

1. **Message Length**: Keep messages under 160 characters
2. **Error Handling**: Always check API response for errors
3. **Phone Validation**: Validate phone numbers before sending
4. **Balance Monitoring**: Regularly check your balance
5. **Rate Limiting**: Implement rate limiting to prevent abuse
6. **Logging**: Log all SMS attempts for debugging

## Cost Considerations

- Check SMS.net.bd pricing for Bangladesh numbers
- Monitor your balance regularly
- Set up balance alerts if available
- Consider implementing SMS quotas per user

## Security

1. **Never expose API key** in frontend code
2. **Store API key** in environment variables only
3. **Implement rate limiting** on forgot-password endpoint
4. **Validate phone numbers** before sending SMS
5. **Log all SMS activities** for audit trail

## Support

For SMS.net.bd support:
- Website: https://sms.net.bd/
- Documentation: Check their API documentation
- Support: Contact their support team for API issues
