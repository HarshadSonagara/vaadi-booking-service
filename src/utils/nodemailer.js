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
      subject: "તમારો ઈમેલ ચકાસો - સમુદાય વાડી બુકિંગ",
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
              <h1>સમુદાય વાડી બુકિંગ</h1>
            </div>
            <div class="content">
              <h2>સ્વાગત છે ${fullName}!</h2>
              <p>સમુદાય વાડી બુકિંગ સિસ્ટમમાં નોંધણી કરવા બદલ આભાર.</p>
              <p>કૃપા કરીને નીચેના બટન પર ક્લિક કરીને તમારું ઈમેલ સરનામું ચકાસો:</p>
              <center>
                <a href="${verificationLink}" class="button">ઈમેલ ચકાસો</a>
              </center>
              <p>અથવા આ લિંકને તમારા બ્રાઉઝરમાં કોપી અને પેસ્ટ કરો:</p>
              <div class="link-box">
                <a href="${verificationLink}">${verificationLink}</a>
              </div>
              <p class="warning">આ લિંક ૨૪ કલાકમાં સમાપ્ત થઈ જશે.</p>
              <p>જો તમે એકાઉન્ટ બનાવ્યું નથી, તો કૃપા કરીને આ ઈમેલને અવગણો.</p>
              <div class="footer">
                <p>શુભેચ્છા સાથે,<br><strong>સમુદાય વાડી બુકિંગ ટીમ</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        સ્વાગત છે ${fullName}!

        સમુદાય વાડી બુકિંગ સિસ્ટમમાં નોંધણી કરવા બદલ આભાર.

        કૃપા કરીને નીચેની લિંક પર ક્લિક કરીને તમારું ઈમેલ સરનામું ચકાસો:
        ${verificationLink}

        આ લિંક ૨૪ કલાકમાં સમાપ્ત થઈ જશે.

        જો તમે એકાઉન્ટ બનાવ્યું નથી, તો કૃપા કરીને આ ઈમેલને અવગણો.

        શુભેચ્છા સાથે,
        સમુદાય વાડી બુકિંગ ટીમ
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
      subject: "પાસવર્ડ રીસેટ વિનંતી - સમુદાય વાડી બુકિંગ",
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
              <h1>પાસવર્ડ રીસેટ વિનંતી</h1>
            </div>
            <div class="content">
              <h2>નમસ્તે ${fullName},</h2>
              <p>અમને તમારા સમુદાય વાડી બુકિંગ એકાઉન્ટ માટે પાસવર્ડ રીસેટ કરવાની વિનંતી મળી છે.</p>
              <p>તમારો પાસવર્ડ રીસેટ કરવા નીચેના બટન પર ક્લિક કરો:</p>
              <center>
                <a href="${resetLink}" class="button">પાસવર્ડ રીસેટ કરો</a>
              </center>
              <p>અથવા આ લિંકને તમારા બ્રાઉઝરમાં કોપી અને પેસ્ટ કરો:</p>
              <div class="link-box">
                <a href="${resetLink}">${resetLink}</a>
              </div>
              <p class="warning">આ લિંક ૧ કલાકમાં સમાપ્ત થઈ જશે.</p>
              <p>જો તમે પાસવર્ડ રીસેટ કરવાની વિનંતી કરી નથી, તો કૃપા કરીને આ ઈમેલને અવગણો અથવા જો તમને ચિંતા હોય તો સપોર્ટનો સંપર્ક કરો.</p>
              <div class="footer">
                <p>શુભેચ્છા સાથે,<br><strong>સમુદાય વાડી બુકિંગ ટીમ</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        નમસ્તે ${fullName},

        અમને તમારા સમુદાય વાડી બુકિંગ એકાઉન્ટ માટે પાસવર્ડ રીસેટ કરવાની વિનંતી મળી છે.

        તમારો પાસવર્ડ રીસેટ કરવા નીચેની લિંક પર ક્લિક કરો:
        ${resetLink}

        આ લિંક ૧ કલાકમાં સમાપ્ત થઈ જશે.

        જો તમે પાસવર્ડ રીસેટ કરવાની વિનંતી કરી નથી, તો કૃપા કરીને આ ઈમેલને અવગણો.

        શુભેચ્છા સાથે,
        સમુદાય વાડી બુકિંગ ટીમ
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
      subject: "તમારું એકાઉન્ટ બનાવવામાં આવ્યું છે - સમુદાય વાડી બુકિંગ",
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
              <h1>સમુદાય વાડી બુકિંગમાં સ્વાગત છે!</h1>
            </div>
            <div class="content">
              <h2>નમસ્તે ${fullName}!</h2>
              <p>એડમિનિસ્ટ્રેટર દ્વારા તમારું એકાઉન્ટ સફળતાપૂર્વક બનાવવામાં આવ્યું છે.</p>
              <p>અહીં તમારી લૉગિન માહિતી છે:</p>
              <div class="credentials-box">
                <p><strong>ઈમેલ:</strong> ${email}</p>
                <p><strong>પાસવર્ડ:</strong> ${password}</p>
                <p><strong>ભૂમિકા:</strong> ${role}</p>
                <p><strong>ગામ:</strong> ${villageName}</p>
              </div>
              <center>
                <a href="${loginLink}" class="button">હમણાં લૉગિન કરો</a>
              </center>
              <p class="warning">સુરક્ષા માટે કૃપા કરીને તમારા પ્રથમ લૉગિન પછી તમારો પાસવર્ડ બદલો.</p>
              <div class="footer">
                <p>શુભેચ્છા સાથે,<br><strong>સમુદાય વાડી બુકિંગ ટીમ</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        નમસ્તે ${fullName}!

        એડમિનિસ્ટ્રેટર દ્વારા તમારું એકાઉન્ટ સફળતાપૂર્વક બનાવવામાં આવ્યું છે.

        અહીં તમારી લૉગિન માહિતી છે:
        ઈમેલ: ${email}
        પાસવર્ડ: ${password}
        ભૂમિકા: ${role}
        ગામ: ${villageName}

        અહીં લૉગિન કરો: ${loginLink}

        સુરક્ષા માટે કૃપા કરીને તમારા પ્રથમ લૉગિન પછી તમારો પાસવર્ડ બદલો.

        શુભેચ્છા સાથે,
        સમુદાય વાડી બુકિંગ ટીમ
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
      ? `બુકિંગ અપડેટ થયું - ${villageName} વાડી બુકિંગ`
      : `બુકિંગ કન્ફર્મેશન - ${villageName} વાડી બુકિંગ`;

    const headerTitle = isUpdate
      ? "તમારું બુકિંગ અપડેટ થયું છે!"
      : "બુકિંગ કન્ફર્મ થયું!";

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
                      <h2 style="color: #000000; margin-top: 0; margin-bottom: 20px;">નમસ્તે ${villagerName}!</h2>
                      <p style="color: #333333; margin-bottom: 15px;">${
                        isUpdate
                          ? "તમારું વાડી બુકિંગ સફળતાપૂર્વક અપડેટ થયું છે. અહીં તમારી અપડેટ થયેલી બુકિંગ વિગતો છે:"
                          : "તમારા બુકિંગ માટે આભાર! તમારી વાડી સફળતાપૂર્વક આરક્ષિત થઈ છે. અહીં તમારી બુકિંગ વિગતો છે:"
                      }</p>

                      <!-- Booking Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f6f5; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9747ff;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="margin-top: 0; color: #9747ff; font-size: 18px; margin-bottom: 15px;">બુકિંગ વિગતો</h3>

                            <!-- Details List -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">નામ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villagerName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">હોલ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${hallName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">ગામ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villageName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">કારણ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${bookingReason}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">તારીખથી :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedFromDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">તારીખ સુધી :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedToDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0;">
                                  <span style="color: #666666; font-weight: 500;">કુલ દિવસો :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${totalDays} દિવસ</span>
                                </td>
                              </tr>
                            </table>

                            <!-- Price Row -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #9747ff; border-radius: 8px; margin-top: 15px;">
                              <tr>
                                <td align="center" style="padding: 20px;">
                                  <span style="color: rgba(255,255,255,0.9); font-weight: 500; font-size: 14px;">ચૂકવેલ રકમ</span>
                                  <br>
                                  <span style="color: white; font-weight: 700; font-size: 28px; margin-top: 5px; display: inline-block;">${formattedPrice}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #333333; margin-bottom: 15px;">જો તમને તમારા બુકિંગ વિશે કોઈ પ્રશ્નો હોય, તો કૃપા કરીને તમારા ગામના એડમિનિસ્ટ્રેટરનો સંપર્ક કરો.</p>

                      <!-- Footer -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <tr>
                          <td style="font-size: 13px; color: #a3a4a9;">
                            <p style="margin: 0;">શુભેચ્છા સાથે,<br><strong>${villageName} વાડી બુકિંગ ટીમ</strong></p>
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

        નમસ્તે ${villagerName}!

        ${
          isUpdate
            ? "તમારું વાડી બુકિંગ સફળતાપૂર્વક અપડેટ થયું છે."
            : "તમારા બુકિંગ માટે આભાર! તમારી વાડી સફળતાપૂર્વક આરક્ષિત થઈ છે."
        }

        બુકિંગ વિગતો:
        ----------------
        નામ: ${villagerName}
        હોલ: ${hallName}
        ગામ: ${villageName}
        કારણ: ${bookingReason}
        તારીખથી: ${formattedFromDate}
        તારીખ સુધી: ${formattedToDate}
        કુલ દિવસો: ${totalDays} દિવસ
        રકમ: ${formattedPrice}

        જો તમને તમારા બુકિંગ વિશે કોઈ પ્રશ્નો હોય, તો કૃપા કરીને તમારા ગામના એડમિનિસ્ટ્રેટરનો સંપર્ક કરો.

        શુભેચ્છા સાથે,
        ${villageName} વાડી બુકિંગ ટીમ
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
      subject: `બુકિંગ રદ થયું - ${villageName} વાડી બુકિંગ`,
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
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">બુકિંગ રદ થયું</h1>
                      <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${villageName} વાડી બુકિંગ</p>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <h2 style="color: #000000; margin-top: 0; margin-bottom: 20px;">નમસ્તે ${villagerName}!</h2>
                      <p style="color: #333333; margin-bottom: 15px;">તમારું બુકિંગ સફળતાપૂર્વક રદ થયું છે. અહીં રદ થયેલા બુકિંગની વિગતો છે:</p>

                      <!-- Booking Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f6f5; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9747ff;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="margin-top: 0; color: #9747ff; font-size: 18px; margin-bottom: 15px;">રદ થયેલા બુકિંગની વિગતો</h3>

                            <!-- Details List -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">નામ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villagerName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">હોલ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${hallName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">ગામ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villageName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">કારણ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${bookingReason}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">તારીખથી :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedFromDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">તારીખ સુધી :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedToDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0;">
                                  <span style="color: #666666; font-weight: 500;">કુલ દિવસો :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${totalDays} દિવસ</span>
                                </td>
                              </tr>
                            </table>

                            <!-- Refund Amount Row -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #9747ff; border-radius: 8px; margin-top: 15px;">
                              <tr>
                                <td align="center" style="padding: 20px;">
                                  <span style="color: rgba(255,255,255,0.9); font-weight: 500; font-size: 14px;">રિફંડ રકમ</span>
                                  <br>
                                  <span style="color: white; font-weight: 700; font-size: 28px; margin-top: 5px; display: inline-block;">${formattedPrice}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #333333; margin-bottom: 15px; font-weight: 600;">તમારું રિફંડ અમારી ટીમ દ્વારા પ્રોસેસ કરવામાં આવશે. રિફંડ પૂર્ણ થયા પછી તમને કન્ફર્મેશન મળશે.</p>
                      <p style="color: #333333; margin-bottom: 15px;">જો તમને રદ કરવા અથવા રિફંડ વિશે કોઈ પ્રશ્નો હોય, તો કૃપા કરીને તમારા ગામના એડમિનિસ્ટ્રેટરનો સંપર્ક કરો.</p>

                      <!-- Footer -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <tr>
                          <td style="font-size: 13px; color: #a3a4a9;">
                            <p style="margin: 0;">શુભેચ્છા સાથે,<br><strong>${villageName} વાડી બુકિંગ ટીમ</strong></p>
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
        બુકિંગ રદ થયું

        નમસ્તે ${villagerName}!

        તમારું બુકિંગ સફળતાપૂર્વક રદ થયું છે.

        રદ થયેલા બુકિંગની વિગતો:
        ---------------------------
        નામ: ${villagerName}
        હોલ: ${hallName}
        ગામ: ${villageName}
        કારણ: ${bookingReason}
        તારીખથી: ${formattedFromDate}
        તારીખ સુધી: ${formattedToDate}
        કુલ દિવસો: ${totalDays} દિવસ
        રિફંડ રકમ: ${formattedPrice}

        તમારું રિફંડ અમારી ટીમ દ્વારા પ્રોસેસ કરવામાં આવશે. રિફંડ પૂર્ણ થયા પછી તમને કન્ફર્મેશન મળશે.

        જો તમને રદ કરવા અથવા રિફંડ વિશે કોઈ પ્રશ્નો હોય, તો કૃપા કરીને તમારા ગામના એડમિનિસ્ટ્રેટરનો સંપર્ક કરો.

        શુભેચ્છા સાથે,
        ${villageName} વાડી બુકિંગ ટીમ
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
      subject: `રિફંડ જરૂરી - બુકિંગ રદ થયું - ${villageName} વાડી બુકિંગ`,
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
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">રિફંડ જરૂરી</h1>
                      <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${villageName} વાડી બુકિંગ</p>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <h2 style="color: #000000; margin-top: 0; margin-bottom: 20px;">ટીમ સૂચના</h2>
                      <p style="color: #333333; margin-bottom: 15px; font-weight: 600;">એક બુકિંગ રદ કરવામાં આવ્યું છે અને રિફંડ પ્રોસેસિંગની જરૂર છે.</p>

                      <!-- Booking Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f6f5; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
                        <tr>
                          <td style="padding: 25px;">
                            <h3 style="margin-top: 0; color: #f39c12; font-size: 18px; margin-bottom: 15px;">રદ થયેલા બુકિંગની વિગતો</h3>

                            <!-- Details List -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">ગ્રામવાસીનું નામ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villagerName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">ઈમેલ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${email || "આપવામાં આવ્યું નથી"}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">મોબાઇલ નંબર :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${mobileNumber}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">હોલ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${hallName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">ગામ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${villageName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">કારણ :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${bookingReason}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">તારીખથી :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedFromDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                                  <span style="color: #666666; font-weight: 500;">તારીખ સુધી :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${formattedToDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 12px 0;">
                                  <span style="color: #666666; font-weight: 500;">કુલ દિવસો :</span>&nbsp;&nbsp;&nbsp;
                                  <span style="color: #000000; font-weight: 600;">${totalDays} દિવસ</span>
                                </td>
                              </tr>
                            </table>

                            <!-- Refund Amount Row -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f39c12; border-radius: 8px; margin-top: 15px;">
                              <tr>
                                <td align="center" style="padding: 20px;">
                                  <span style="color: rgba(255,255,255,0.9); font-weight: 500; font-size: 14px;">રિફંડ રકમ જરૂરી</span>
                                  <br>
                                  <span style="color: white; font-weight: 700; font-size: 28px; margin-top: 5px; display: inline-block;">${formattedPrice}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #333333; margin-bottom: 15px; font-weight: 600;">કૃપા કરીને આ રદ થયેલા બુકિંગ માટે જલદીથી રિફંડ પ્રોસેસ કરો.</p>
                      <p style="color: #333333; margin-bottom: 15px;">જરૂર પડ્યે ઉપર આપેલી વિગતોનો ઉપયોગ કરીને ગ્રાહકનો સંપર્ક કરો.</p>

                      <!-- Footer -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <tr>
                          <td style="font-size: 13px; color: #a3a4a9;">
                            <p style="margin: 0;">આ એક ઓટોમેટિક સૂચના છે<br><strong>${villageName} વાડી બુકિંગ સિસ્ટમ</strong></p>
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
        રિફંડ જરૂરી - બુકિંગ રદ થયું

        ટીમ સૂચના

        એક બુકિંગ રદ કરવામાં આવ્યું છે અને રિફંડ પ્રોસેસિંગની જરૂર છે.

        રદ થયેલા બુકિંગની વિગતો:
        ---------------------------
        ગ્રામવાસીનું નામ: ${villagerName}
        ઈમેલ: ${email || "આપવામાં આવ્યું નથી"}
        મોબાઇલ નંબર: ${mobileNumber}
        હોલ: ${hallName}
        ગામ: ${villageName}
        કારણ: ${bookingReason}
        તારીખથી: ${formattedFromDate}
        તારીખ સુધી: ${formattedToDate}
        કુલ દિવસો: ${totalDays} દિવસ
        રિફંડ રકમ જરૂરી: ${formattedPrice}

        કૃપા કરીને આ રદ થયેલા બુકિંગ માટે જલદીથી રિફંડ પ્રોસેસ કરો.

        જરૂર પડ્યે ઉપર આપેલી વિગતોનો ઉપયોગ કરીને ગ્રાહકનો સંપર્ક કરો.

        આ એક ઓટોમેટિક સૂચના છે ${villageName} વાડી બુકિંગ સિસ્ટમ
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
