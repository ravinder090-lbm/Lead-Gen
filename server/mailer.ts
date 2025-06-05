import nodemailer from "nodemailer";
import { db } from "./db";
import { smtpSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

class Mailer {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "",
      port: 587,
      secure: false,
      auth: {
        user: "",
        pass: "",
      },
    });
  }

  async sendVerificationEmail(
    email: string,
    verificationCode: string,
  ): Promise<void> {
    try {
      const data = await db.select().from(smtpSettings).where(eq(smtpSettings.active, true)).limit(1);
      let settings=data[0]
      if(!settings){
        throw new Error('smtp settings not found')
      } 
      const testTransporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: {
          user: settings.username,
          pass: settings.password,
        },
      });

      await testTransporter.sendMail({
        from:`${settings.fromEmail}`,
        to: email,
        subject: "Verify Your Email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a73e8;">Verify Your Email</h2>
            <p>Thank you for registering with the LeadGen Platform. Please use the verification code below to complete your registration:</p>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
              ${verificationCode}
            </div>
            <p>This code will expire in 30 minutes.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw error;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetLink: string,
  ): Promise<void> {
    try {

      const data = await db.select().from(smtpSettings).where(eq(smtpSettings.active, true)).limit(1);
      let settings=data[0]
      if(!settings){
        throw new Error('smtp settings not found')
      } 
      const testTransporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: {
          user: settings.username,
          pass: settings.password,
        },
      });
      await testTransporter.sendMail({
        from:`${settings.fromEmail}`,
        to: email,
        subject: "Reset Your Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a73e8;">Reset Your Password</h2>
            <p>Hello ${name},</p>
            <p>We received a request to reset your password. Please click the button below to reset your password:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${resetLink}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all; font-size: 14px;">
              ${resetLink}
            </p>
            <p>This link will expire in 30 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  }

  async sendInactivityNotification(email: any, name: string): Promise<void> {
    try {
      const loginLink = `${process.env.APP_URL || "https://leadhub-demo.lbmsolutions.digital"}`;


      const data = await db.select().from(smtpSettings).where(eq(smtpSettings.active, true)).limit(1);
      let settings=data[0]
      if(!settings){
        throw new Error('smtp settings not found')
      } 
      const testTransporter = nodemailer.createTransport({
        host: settings.host.toString(),
        port: settings.port,
        secure: settings.secure,
        auth: {
          user: settings.username.toString(),
          pass: settings.password.toString(),
        },
      });

      await testTransporter.sendMail({
        from:`${settings.fromEmail}`,
        to: email,
        subject: "We Miss You! Check Out New Leads",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a73e8;">We Miss You, ${name}!</h2>
            <p>It's been a while since you've logged in to our LeadGen Platform. We've added new leads that might interest you!</p>
            <p>Here's what you're missing:</p>
            <ul style="padding-left: 20px;">
              <li>New business opportunities in your area</li>
              <li>Exclusive leads with contact information</li>
              <li>Fresh prospects waiting for your review</li>
            </ul>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${loginLink}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Log In Now</a>
            </div>
            <p>Your LeadCoins are waiting to be used! Log in today to explore new opportunities.</p>
            <p>If you're having trouble accessing your account, please contact our support team.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Error sending inactivity notification email:", error);
  
      throw error;
    }
  }

  async testSmtpSettings(settings: any, testEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Create a test transporter with the provided settings
      const testTransporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: {
          user: settings.username,
          pass: settings.password,
        },
      });
      // Verify the connection
      // await testTransporter.verify();
      // Send a test email
      await testTransporter.sendMail({
        from: `"${settings.fromName}" <${settings.fromEmail}>`,
        to: testEmail,
        subject: "SMTP Configuration Test",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>SMTP Test Successful</h2>
            <p>This is a test email to verify your SMTP configuration is working correctly.</p>
            <p>Configuration details:</p>
            <ul>
              <li><strong>Host:</strong> ${settings.host}</li>
              <li><strong>Port:</strong> ${settings.port}</li>
              <li><strong>Secure:</strong> ${settings.secure ? 'Yes' : 'No'}</li>
              <li><strong>From:</strong> ${settings.fromName} &lt;${settings.fromEmail}&gt;</li>
            </ul>
            <p>If you received this email, your SMTP settings are configured correctly!</p>
          </div>
        `,
      });
      return { success: true };
    } catch (error) {
      console.error("SMTP test failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  async sendLowBalanceAlert(email: string, name: string, balance: number): Promise<void> {
    try {
      const data = await db.select().from(smtpSettings).where(eq(smtpSettings.active, true)).limit(1);
      let settings=data[0]
      if(!settings){
        throw new Error('smtp settings not found')
      } 
      const testTransporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: {
          user: settings.username,
          pass: settings.password,
        },
      });
      const loginLink = `${process.env.APP_URL || "https://0c6b33a2-6d27-414f-8c65-c4c046e70cac-00-r5p6rx4dglg4.riker.replit.dev"}/user/subscriptions?tab=coins`;
      await testTransporter.sendMail({
        from: "pahul.lbm@gmail.com",
        to: email,
        subject: balance === 0 ? "LeadCoin Balance: Zero Coins Remaining" : "LeadCoin Balance: Low Balance Alert",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${balance === 0 ? '#dc2626' : '#f59e0b'};">
              ${balance === 0 ? 'No Coins Remaining' : 'Low Balance Alert'}
            </h2>
            <p>Hello ${name},</p>
            ${balance === 0 
              ? '<p><strong>Your LeadCoin balance has reached zero.</strong> You will not be able to view lead contact details until you purchase more coins.</p>'
              : `<p>Your LeadCoin balance is running low. You currently have <strong>${balance} coins</strong> remaining.</p>`
            }
            <p>To continue accessing lead contact information, please purchase more LeadCoins:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${loginLink}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Purchase LeadCoins</a>
            </div>
            <p>This is an automated notification to help you manage your account effectively.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Error sending low balance alert email:", error);
      throw error;
    }
  }

}






export const mailer = new Mailer();
