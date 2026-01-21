import nodemailer from "nodemailer";

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD.replace(/\s+/g, ""), // Remove any whitespace
    },
    tls: {
      rejectUnauthorized: false, // For development only
    },
  });
};

// Send verification email
export const sendVerificationEmail = async (
  email,
  fullName,
  verificationToken,
  frontendUrl
) => {
  try {
    const transporter = createTransporter();

    // Verification link - FE will handle the token
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email - Community Vaadi Booking",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Neue Montreal', Arial, sans-serif;
              line-height: 1.6;
              color: #000000;
              background-color: #f5f6f5;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background-color: #9747ff;
              color: white;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            .content {
              background-color: #ffffff;
              padding: 40px 30px;
            }
            .content h2 {
              color: #000000;
              margin-top: 0;
              margin-bottom: 20px;
            }
            .content p {
              color: #333333;
              margin-bottom: 15px;
            }
            .button {
              display: inline-block;
              padding: 16px 40px;
              margin: 25px 0;
              background-color: #9747ff;
              color: white !important;
              text-decoration: none;
              border-radius: 30px;
              font-weight: bold;
              font-size: 16px;
            }
            .link-box {
              background-color: #f5f6f5;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #9747ff;
            }
            .link-box a {
              color: #9747ff;
              text-decoration: none;
              word-break: break-all;
              font-weight: 500;
            }
            .warning {
              color: #ff0000;
              font-weight: bold;
              margin-top: 20px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 13px;
              color: #a3a4a9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Community Vaadi Booking</h1>
            </div>
            <div class="content">
              <h2>Welcome ${fullName}!</h2>
              <p>Thank you for registering with Community Vaadi Booking System.</p>
              <p>Please verify your email address by clicking the button below:</p>
              <center>
                <a href="${verificationLink}" class="button">Verify Email</a>
              </center>
              <p>Or copy and paste this link in your browser:</p>
              <div class="link-box">
                <a href="${verificationLink}">${verificationLink}</a>
              </div>
              <p class="warning">This link will expire in 24 hours.</p>
              <p>If you didn't create an account, please ignore this email.</p>
              <div class="footer">
                <p>Best regards,<br><strong>Community Vaadi Booking Team</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome ${fullName}!

        Thank you for registering with Community Vaadi Booking System.

        Please verify your email address by clicking the link below:
        ${verificationLink}

        This link will expire in 24 hours.

        If you didn't create an account, please ignore this email.

        Best regards,
        Community Vaadi Booking Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};

// Send password reset email (for future use)
export const sendPasswordResetEmail = async (
  email,
  fullName,
  resetToken,
  frontendUrl
) => {
  try {
    const transporter = createTransporter();

    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request - Community Vaadi Booking",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Neue Montreal', Arial, sans-serif;
              line-height: 1.6;
              color: #000000;
              background-color: #f5f6f5;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background-color: #9747ff;
              color: white;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            .content {
              background-color: #ffffff;
              padding: 40px 30px;
            }
            .content h2 {
              color: #000000;
              margin-top: 0;
              margin-bottom: 20px;
            }
            .content p {
              color: #333333;
              margin-bottom: 15px;
            }
            .button {
              display: inline-block;
              padding: 16px 40px;
              margin: 25px 0;
              background-color: #9747ff;
              color: white !important;
              text-decoration: none;
              border-radius: 30px;
              font-weight: bold;
              font-size: 16px;
            }
            .link-box {
              background-color: #f5f6f5;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #9747ff;
            }
            .link-box a {
              color: #9747ff;
              text-decoration: none;
              word-break: break-all;
              font-weight: 500;
            }
            .warning {
              color: #ff0000;
              font-weight: bold;
              margin-top: 20px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 13px;
              color: #a3a4a9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              <p>We received a request to reset your password for your Community Vaadi Booking account.</p>
              <p>Click the button below to reset your password:</p>
              <center>
                <a href="${resetLink}" class="button">Reset Password</a>
              </center>
              <p>Or copy and paste this link in your browser:</p>
              <div class="link-box">
                <a href="${resetLink}">${resetLink}</a>
              </div>
              <p class="warning">This link will expire in 1 hour.</p>
              <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
              <div class="footer">
                <p>Best regards,<br><strong>Community Vaadi Booking Team</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${fullName},

        We received a request to reset your password for your Community Vaadi Booking account.

        Click the link below to reset your password:
        ${resetLink}

        This link will expire in 1 hour.

        If you didn't request a password reset, please ignore this email.

        Best regards,
        Community Vaadi Booking Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};
