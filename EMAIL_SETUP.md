# Email Configuration Setup

This guide explains how to set up email functionality for the Community Vaadi Booking System.

## Email Service Configuration

The application uses Nodemailer to send verification emails. You can use various email services:

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Step Verification**
   - Go to your Google Account settings
   - Navigate to Security > 2-Step Verification
   - Enable it if not already enabled

2. **Create App Password**
   - Go to Security > 2-Step Verification > App passwords
   - Select app: Mail
   - Select device: Other (Custom name) - enter "Vaadi Booking"
   - Click Generate
   - Copy the 16-character password

3. **Update .env file**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   EMAIL_FROM_NAME=Community Vaadi Booking
   ```

### Option 2: Outlook/Hotmail

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
EMAIL_FROM_NAME=Community Vaadi Booking
```

### Option 3: Custom SMTP (Production)

For production, use services like:
- **SendGrid**: `smtp.sendgrid.net`, Port: 587
- **Mailgun**: `smtp.mailgun.org`, Port: 587
- **Amazon SES**: Varies by region

```env
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_USER=your-smtp-username
EMAIL_PASSWORD=your-smtp-password
EMAIL_FROM_NAME=Community Vaadi Booking
```

## API Endpoints

### 1. Register User (with Email Verification)

**POST** `/api/v1/users/register`

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "frontendUrl": "http://localhost:3000"
}
```

**Note**: The `frontendUrl` is where your frontend application is hosted. The verification link will be:
```
{frontendUrl}/verify-email?token={verification_token}
```

### 2. Verify Email

**GET** `/api/v1/users/verify-email?token={token}`

This endpoint is called when the user clicks the verification link in their email.

**Frontend Implementation Example:**
```javascript
// In your React/Vue/Angular app
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (token) {
    fetch(`http://localhost:8000/api/v1/users/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Show success message
          // Redirect to login
        }
      });
  }
}, []);
```

### 3. Resend Verification Email

**POST** `/api/v1/users/resend-verification`

```json
{
  "email": "john@example.com",
  "frontendUrl": "http://localhost:3000"
}
```

## Email Templates

The system sends HTML emails with:
- Welcome message with user's full name
- Verification link button
- Plain text fallback link
- 24-hour expiry notice
- Professional styling

## Security Features

1. **Token Hashing**: Verification tokens are hashed using SHA-256 before storing in database
2. **Token Expiry**: Tokens expire after 24 hours
3. **One-time Use**: Tokens are deleted after successful verification
4. **Secure Transport**: Uses TLS/SSL for email transmission

## Testing Email in Development

### Using Mailtrap (Recommended for Testing)

1. Sign up at [mailtrap.io](https://mailtrap.io)
2. Get your SMTP credentials
3. Update .env:
   ```env
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_USER=your-mailtrap-username
   EMAIL_PASSWORD=your-mailtrap-password
   EMAIL_FROM_NAME=Community Vaadi Booking
   ```

### Using Gmail for Testing

If using Gmail, make sure to:
- Use App Password (not your regular password)
- Enable "Less secure app access" if using regular password (not recommended)

## Troubleshooting

### Email not sending

1. Check your email credentials in `.env`
2. Ensure EMAIL_PORT is correct (587 for TLS, 465 for SSL)
3. Check spam folder
4. Verify your email service allows SMTP

### "Invalid login" error

1. For Gmail: Make sure you're using an App Password
2. Check if 2-Step Verification is enabled
3. Verify EMAIL_USER and EMAIL_PASSWORD are correct

### Token expired

- Tokens are valid for 24 hours
- Use the resend verification endpoint to get a new token

## Production Recommendations

1. **Use a dedicated email service** (SendGrid, Mailgun, Amazon SES)
2. **Set up SPF and DKIM records** for better deliverability
3. **Monitor email bounces** and failed deliveries
4. **Implement rate limiting** on email sending endpoints
5. **Use environment-specific frontend URLs**
