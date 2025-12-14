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
              font-family: 'Roboto', Arial, sans-serif;
              line-height: 1.6;
              color: #2c3e50;
              background-color: #f9f5eb;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
            }
            .header {
              background-color: #c06037;
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f5eb;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 14px 35px;
              margin: 20px 0;
              background-color: #c06037;
              color: white !important;
              text-decoration: none;
              border-radius: 30px;
              font-weight: bold;
              transition: background-color 0.2s;
            }
            .button:hover {
              background-color: #a84f2d;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 12px;
              color: #7f8c8d;
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
              <p style="word-break: break-all; color: #e67e22;">${verificationLink}</p>
              <p style="color: #e74c3c;"><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account, please ignore this email.</p>
              <div class="footer">
                <p>Best regards,<br>Community Vaadi Booking Team</p>
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
              font-family: 'Roboto', Arial, sans-serif;
              line-height: 1.6;
              color: #2c3e50;
              background-color: #f9f5eb;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #ffffff;
            }
            .header {
              background-color: #e74c3c;
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f5eb;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 14px 35px;
              margin: 20px 0;
              background-color: #e74c3c;
              color: white;
              text-decoration: none;
              border-radius: 30px;
              font-weight: bold;
              transition: background-color 0.2s;
            }
            .button:hover {
              background-color: #c0392b;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 12px;
              color: #7f8c8d;
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
              <p style="word-break: break-all; color: #e67e22;">${resetLink}</p>
              <p style="color: #e74c3c;"><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
              <div class="footer">
                <p>Best regards,<br>Community Vaadi Booking Team</p>
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
