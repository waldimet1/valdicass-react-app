// src/utils/emailService.js
// SendGrid Email Service for Valdicass Estimates

export const sendEstimateEmail = async (estimateData, clientData, apiKey, senderEmail, senderName) => {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: clientData.email, name: clientData.name }],
            subject: `Your Estimate from Valdicass - ${estimateData.estimateNumber}`,
          },
        ],
        from: {
          email: senderEmail, // walter@, mario@, or konrad@valdicass.com
          name: senderName || 'Valdicass Inc',
        },
        content: [
          {
            type: 'text/html',
            value: generateEstimateEmailHTML(estimateData, clientData),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.message || 'Failed to send email');
    }

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('SendGrid Error:', error);
    return { success: false, error: error.message };
  }
};

const generateEstimateEmailHTML = (estimateData, clientData) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Estimate from Valdicass</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #00a651 0%, #008f45 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 18px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .estimate-details {
      background: #f7fafc;
      padding: 25px;
      border-radius: 8px;
      margin: 25px 0;
      border: 1px solid #e2e8f0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child {
      border-bottom: none;
      padding-top: 15px;
      margin-top: 10px;
      border-top: 2px solid #00a651;
    }
    .detail-label {
      font-weight: 600;
      color: #4a5568;
      font-size: 14px;
    }
    .detail-value {
      color: #2d3748;
      font-size: 14px;
    }
    .total {
      font-size: 26px;
      font-weight: bold;
      color: #00a651;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background: #00a651;
      color: white !important;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0, 166, 81, 0.3);
    }
    .next-steps {
      background: #fff5f5;
      border-left: 4px solid #00a651;
      padding: 20px;
      margin: 25px 0;
    }
    .next-steps h3 {
      margin: 0 0 15px 0;
      color: #2d3748;
      font-size: 18px;
    }
    .next-steps ul {
      margin: 0;
      padding-left: 20px;
    }
    .next-steps li {
      margin: 8px 0;
      color: #4a5568;
    }
    .signature {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .signature p {
      margin: 5px 0;
      color: #4a5568;
    }
    .footer {
      background: #2d3748;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .footer p {
      margin: 8px 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .footer .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .footer .disclaimer {
      font-size: 12px;
      margin-top: 20px;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Your Estimate is Ready!</h1>
      <p>Estimate #${estimateData.estimateNumber}</p>
    </div>

    <div class="content">
      <div class="greeting">
        <p>Dear ${clientData.name},</p>
        <p>Thank you for considering Valdicass for your project. We're excited to work with you!</p>
      </div>
      
      <div class="estimate-details">
        <div class="detail-row">
          <span class="detail-label">Estimate Number:</span>
          <span class="detail-value"><strong>${estimateData.estimateNumber}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${new Date(estimateData.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Project:</span>
          <span class="detail-value">${estimateData.lineItems?.[0]?.description || 'Window & Door Installation'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Estimated Total:</span>
          <span class="total">${formatCurrency(estimateData.total)}</span>
        </div>
      </div>

      <div class="button-container">
        <a href="${window.location.origin}/quote/${estimateData.id}" class="button">
          View Full Estimate
        </a>
      </div>

      <div class="next-steps">
        <h3>📋 What's Next?</h3>
        <ul>
          <li>Review the detailed estimate by clicking the button above</li>
          <li>Contact us if you have any questions about the estimate</li>
          <li>We're ready to schedule your project when you are!</li>
        </ul>
      </div>

      <p>If you have any questions or would like to discuss this estimate, please don't hesitate to reach out. We're here to help!</p>

      <div class="signature">
        <p><strong>Best regards,</strong></p>
        <p><strong>${estimateData.salespersonName || 'The Valdicass Team'}</strong></p>
        <p>${estimateData.salespersonPhone || '(630) 290-5343'}</p>
        <p>${estimateData.salespersonEmail || 'info@valdicass.com'}</p>
      </div>
    </div>

    <div class="footer">
      <p class="company-name">Valdicass, Inc.</p>
      <p>8920 W 47th St, Brookfield, IL 60513</p>
      <p>Phone: (630) 290-5343 | www.valdicass.com</p>
      <p class="disclaimer">
        This email was sent to ${clientData.email}. 
        If you have questions, please contact us directly.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};