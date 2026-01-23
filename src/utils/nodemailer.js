import nodemailer from "nodemailer";

// Check if using Brevo API (recommended for Render and cloud platforms)
const useBrevoApi = process.env.BREVO_API_KEY ? true : false;

// Brevo HTTP API sender (bypasses SMTP port restrictions on Render)
const sendWithBrevoApi = async (mailOptions) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME || "Community Vaadi Booking",
        email: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      },
      to: [{ email: mailOptions.to }],
      subject: mailOptions.subject,
      htmlContent: mailOptions.html,
      textContent: mailOptions.text,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Brevo API error: ${response.status}`);
  }

  const result = await response.json();
  return { messageId: result.messageId };
};

// Create nodemailer transporter (fallback for non-Render environments)
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  const isSecure = port === 465;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: port,
    secure: isSecure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD.replace(/\s+/g, ""),
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    debug: process.env.NODE_ENV !== "production",
    logger: process.env.NODE_ENV !== "production",
  });
};

// Unified send function - uses Brevo API if available, falls back to SMTP
const sendEmail = async (mailOptions) => {
  if (useBrevoApi) {
    console.log("Sending email via Brevo HTTP API...");
    return await sendWithBrevoApi(mailOptions);
  } else {
    console.log("Sending email via SMTP...");
    const transporter = createTransporter();
    return await transporter.sendMail(mailOptions);
  }
};

// Send verification email
export const sendVerificationEmail = async (
  email,
  fullName,
  verificationToken,
  frontendUrl
) => {
  try {
    // Verification link - FE will handle the token
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
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

    const info = await sendEmail(mailOptions);
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
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
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

    const info = await sendEmail(mailOptions);
    console.log("Password reset email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

// Send account created email (when Super Admin creates a user)
export const sendAccountCreatedEmail = async (
  email,
  fullName,
  password,
  role,
  villageName,
  frontendUrl
) => {
  try {
    const loginLink = `${frontendUrl}/auth/login`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Your Account Has Been Created - Community Vaadi Booking",
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
            .credentials-box {
              background-color: #f5f6f5;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #9747ff;
            }
            .credentials-box p {
              margin: 8px 0;
            }
            .credentials-box strong {
              color: #9747ff;
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
              <h1>Welcome to Community Vaadi Booking!</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName}!</h2>
              <p>Your account has been successfully created by the administrator.</p>
              <p>Here are your login credentials:</p>
              <div class="credentials-box">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
                <p><strong>Role:</strong> ${role}</p>
                <p><strong>Village:</strong> ${villageName}</p>
              </div>
              <center>
                <a href="${loginLink}" class="button">Login Now</a>
              </center>
              <p class="warning">Please change your password after your first login for security.</p>
              <div class="footer">
                <p>Best regards,<br><strong>Community Vaadi Booking Team</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${fullName}!

        Your account has been successfully created by the administrator.

        Here are your login credentials:
        Email: ${email}
        Password: ${password}
        Role: ${role}
        Village: ${villageName}

        Login here: ${loginLink}

        Please change your password after your first login for security.

        Best regards,
        Community Vaadi Booking Team
      `,
    };

    const info = await sendEmail(mailOptions);
    console.log("Account created email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending account created email:", error);
    throw error;
  }
};

// Send booking confirmation email
export const sendBookingConfirmationEmail = async (
  email,
  bookingDetails,
  isUpdate = false
) => {
  try {
    const {
      villagerName,
      hallName,
      bookingReason,
      fromDate,
      toDate,
      totalDays,
      price,
      villageName,
    } = bookingDetails;

    // Format dates
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    const formattedFromDate = formatDate(fromDate);
    const formattedToDate = formatDate(toDate);
    const formattedPrice = `₹${Number(price).toLocaleString("en-IN")}`;

    const subject = isUpdate
      ? `Booking Updated - ${villageName} Vaadi Booking`
      : `Booking Confirmation - ${villageName} Vaadi Booking`;

    const headerTitle = isUpdate
      ? "Your Booking Has Been Updated!"
      : "Booking Confirmed!";

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; background-color: #f5f6f5; margin: 0; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td align="center" style="background-color: #9747ff; color: white; padding: 40px 20px;">
                      <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${headerTitle}</h1>
                      <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${villageName} Vaadi Booking</p>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <h2 style="color: #000000; margin-top: 0; margin-bottom: 20px;">Hello ${villagerName}!</h2>
                      <p style="color: #333333; margin-bottom: 15px;">${
                        isUpdate
                          ? "Your vaadi booking has been successfully updated. Here are your updated booking details:"
                          : "Thank you for your booking! Your vaadi has been successfully reserved. Here are your booking details:"
                      }</p>

                      <!-- Booking Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f6f5; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9747ff;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="margin-top: 0; color: #9747ff; font-size: 18px; margin-bottom: 15px;">Booking Details</h3>

                            <!-- Details List -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Name :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villagerName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Hall :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${hallName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Village :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villageName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Reason :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${bookingReason}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">From Date :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedFromDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">To Date :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedToDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0;">
                                  <span style="color: #666666; font-weight: 500;">Total Days :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${totalDays} day${
                                    totalDays > 1 ? "s" : ""
                                  }</span>
                                </td>
                              </tr>
                            </table>

                            <!-- Price Row -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #9747ff; border-radius: 8px; margin-top: 15px;">
                              <tr>
                                <td align="center" style="padding: 20px;">
                                  <span style="color: rgba(255,255,255,0.9); font-weight: 500; font-size: 14px;">Amount Paid</span>
                                  <br>
                                  <span style="color: white; font-weight: 700; font-size: 28px; margin-top: 5px; display: inline-block;">${formattedPrice}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #333333; margin-bottom: 15px;">If you have any questions about your booking, please contact your village administrator.</p>

                      <!-- Footer -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <tr>
                          <td style="font-size: 13px; color: #a3a4a9;">
                            <p style="margin: 0;">Best regards,<br><strong>${villageName} Vaadi Booking Team</strong></p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
        ${headerTitle}

        Hello ${villagerName}!

        ${
          isUpdate
            ? "Your vaadi booking has been successfully updated."
            : "Thank you for your booking! Your vaadi has been successfully reserved."
        }

        Booking Details:
        ----------------
        Name: ${villagerName}
        Hall: ${hallName}
        Village: ${villageName}
        Reason: ${bookingReason}
        From Date: ${formattedFromDate}
        To Date: ${formattedToDate}
        Total Days: ${totalDays} day${totalDays > 1 ? "s" : ""}
        Amount: ${formattedPrice}

        If you have any questions about your booking, please contact your village administrator.

        Best regards,
        ${villageName} Vaadi Booking Team
      `,
    };

    const info = await sendEmail(mailOptions);
    console.log("Booking confirmation email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
    // Don't throw error - booking should still succeed even if email fails
    return { success: false, error: error.message };
  }
};

// Send booking cancellation email to user
export const sendBookingCancellationEmail = async (
  email,
  bookingDetails
) => {
  try {
    const {
      villagerName,
      hallName,
      bookingReason,
      fromDate,
      toDate,
      totalDays,
      price,
      villageName,
    } = bookingDetails;

    // Format dates
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    const formattedFromDate = formatDate(fromDate);
    const formattedToDate = formatDate(toDate);
    const formattedPrice = `₹${Number(price).toLocaleString("en-IN")}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `Booking Cancelled - ${villageName} Vaadi Booking`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; background-color: #f5f6f5; margin: 0; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td align="center" style="background-color: #9747ff; color: white; padding: 40px 20px;">
                      <div style="font-size: 48px; margin-bottom: 10px;">✕</div>
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Booking Cancelled</h1>
                      <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${villageName} Vaadi Booking</p>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <h2 style="color: #000000; margin-top: 0; margin-bottom: 20px;">Hello ${villagerName}!</h2>
                      <p style="color: #333333; margin-bottom: 15px;">Your booking has been cancelled successfully. Here are the details of the cancelled booking:</p>

                      <!-- Booking Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f6f5; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9747ff;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="margin-top: 0; color: #9747ff; font-size: 18px; margin-bottom: 15px;">Cancelled Booking Details</h3>

                            <!-- Details List -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Name :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villagerName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Hall :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${hallName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Village :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villageName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Reason :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${bookingReason}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">From Date :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedFromDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">To Date :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedToDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0;">
                                  <span style="color: #666666; font-weight: 500;">Total Days :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${totalDays} day${
        totalDays > 1 ? "s" : ""
      }</span>
                                </td>
                              </tr>
                            </table>

                            <!-- Refund Amount Row -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #9747ff; border-radius: 8px; margin-top: 15px;">
                              <tr>
                                <td align="center" style="padding: 20px;">
                                  <span style="color: rgba(255,255,255,0.9); font-weight: 500; font-size: 14px;">Refund Amount</span>
                                  <br>
                                  <span style="color: white; font-weight: 700; font-size: 28px; margin-top: 5px; display: inline-block;">${formattedPrice}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #333333; margin-bottom: 15px; font-weight: 600;">Your refund will be processed by our team. You will receive a confirmation once the refund is completed.</p>
                      <p style="color: #333333; margin-bottom: 15px;">If you have any questions about the cancellation or refund, please contact your village administrator.</p>

                      <!-- Footer -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <tr>
                          <td style="font-size: 13px; color: #a3a4a9;">
                            <p style="margin: 0;">Best regards,<br><strong>${villageName} Vaadi Booking Team</strong></p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
        Booking Cancelled

        Hello ${villagerName}!

        Your booking has been cancelled successfully.

        Cancelled Booking Details:
        ---------------------------
        Name: ${villagerName}
        Hall: ${hallName}
        Village: ${villageName}
        Reason: ${bookingReason}
        From Date: ${formattedFromDate}
        To Date: ${formattedToDate}
        Total Days: ${totalDays} day${totalDays > 1 ? "s" : ""}
        Refund Amount: ${formattedPrice}

        Your refund will be processed by our team. You will receive a confirmation once the refund is completed.

        If you have any questions about the cancellation or refund, please contact your village administrator.

        Best regards,
        ${villageName} Vaadi Booking Team
      `,
    };

    const info = await sendEmail(mailOptions);
    console.log("Booking cancellation email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending booking cancellation email:", error);
    return { success: false, error: error.message };
  }
};

// Send refund notification email to team
export const sendRefundNotificationEmail = async (
  teamEmail,
  bookingDetails
) => {
  try {
    const {
      villagerName,
      email,
      mobileNumber,
      hallName,
      bookingReason,
      fromDate,
      toDate,
      totalDays,
      price,
      villageName,
    } = bookingDetails;

    // Format dates
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    const formattedFromDate = formatDate(fromDate);
    const formattedToDate = formatDate(toDate);
    const formattedPrice = `₹${Number(price).toLocaleString("en-IN")}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: teamEmail,
      subject: `Refund Required - Booking Cancelled - ${villageName} Vaadi Booking`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; background-color: #f5f6f5; margin: 0; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td align="center" style="background-color: #f39c12; color: white; padding: 40px 20px;">
                      <div style="font-size: 48px; margin-bottom: 10px;">⚠</div>
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Refund Required</h1>
                      <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${villageName} Vaadi Booking</p>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <h2 style="color: #000000; margin-top: 0; margin-bottom: 20px;">Team Notification</h2>
                      <p style="color: #333333; margin-bottom: 15px; font-weight: 600;">A booking has been cancelled and requires refund processing.</p>

                      <!-- Booking Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f6f5; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="margin-top: 0; color: #f39c12; font-size: 18px; margin-bottom: 15px;">Cancelled Booking Details</h3>

                            <!-- Details List -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Villager Name :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villagerName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Email :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${email || "Not provided"}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Mobile Number :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${mobileNumber}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Hall :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${hallName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Village :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villageName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">Reason :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${bookingReason}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">From Date :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedFromDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">To Date :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedToDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0;">
                                  <span style="color: #666666; font-weight: 500;">Total Days :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${totalDays} day${
        totalDays > 1 ? "s" : ""
      }</span>
                                </td>
                              </tr>
                            </table>

                            <!-- Refund Amount Row -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f39c12; border-radius: 8px; margin-top: 15px;">
                              <tr>
                                <td align="center" style="padding: 20px;">
                                  <span style="color: rgba(255,255,255,0.9); font-weight: 500; font-size: 14px;">Refund Amount Required</span>
                                  <br>
                                  <span style="color: white; font-weight: 700; font-size: 28px; margin-top: 5px; display: inline-block;">${formattedPrice}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #333333; margin-bottom: 15px; font-weight: 600;">Please process the refund for this cancelled booking at your earliest convenience.</p>
                      <p style="color: #333333; margin-bottom: 15px;">Contact the customer using the details provided above if needed.</p>

                      <!-- Footer -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <tr>
                          <td style="font-size: 13px; color: #a3a4a9;">
                            <p style="margin: 0;">This is an automated notification from<br><strong>${villageName} Vaadi Booking System</strong></p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
        Refund Required - Booking Cancelled

        Team Notification

        A booking has been cancelled and requires refund processing.

        Cancelled Booking Details:
        ---------------------------
        Villager Name: ${villagerName}
        Email: ${email || "Not provided"}
        Mobile Number: ${mobileNumber}
        Hall: ${hallName}
        Village: ${villageName}
        Reason: ${bookingReason}
        From Date: ${formattedFromDate}
        To Date: ${formattedToDate}
        Total Days: ${totalDays} day${totalDays > 1 ? "s" : ""}
        Refund Amount Required: ${formattedPrice}

        Please process the refund for this cancelled booking at your earliest convenience.

        Contact the customer using the details provided above if needed.

        This is an automated notification from ${villageName} Vaadi Booking System
      `,
    };

    const info = await sendEmail(mailOptions);
    console.log("Refund notification email sent to team: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending refund notification email:", error);
    return { success: false, error: error.message };
  }
};
