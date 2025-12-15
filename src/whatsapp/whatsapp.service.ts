import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonLoggerService } from '../logger/logger.service';

interface WhatsAppRecipient {
  phone: string;
  variables: string[];
}

interface WhatsAppTemplatePayload {
  template: string;
  recipients: WhatsAppRecipient[];
}

@Injectable()
export class WhatsAppService {
  private readonly apiUrl: string;
  private readonly jwtToken: string;

  constructor(
    private configService: ConfigService,
    private logger: WinstonLoggerService,
  ) {
    this.apiUrl = this.configService.get<string>('whatsapp.apiUrl') || '';
    this.jwtToken = this.configService.get<string>('whatsapp.jwtToken') || '';
  }

  async sendOtpTemplate(phoneNumber: string, otp: string): Promise<boolean> {
    const payload: WhatsAppTemplatePayload = {
      template: 'letstryotp',
      recipients: [
        {
          phone: phoneNumber,
          variables: [otp],
        },
      ],
    };

    return this.sendTemplate(payload);
  }

  async sendOrderConfirmation(
    phoneNumber: string,
    customerName: string,
    awbNumber: string,
    trackingUrl: string,
  ): Promise<boolean> {
    const payload: WhatsAppTemplatePayload = {
      template: 'letstryorderconfirmation',
      recipients: [
        {
          phone: phoneNumber,
          variables: [customerName, awbNumber, trackingUrl],
        },
      ],
    };

    return this.sendTemplate(payload);
  }

  private async sendTemplate(payload: WhatsAppTemplatePayload): Promise<boolean> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`WhatsApp API error: ${response.status} - ${errorText}`, 'WhatsAppService');
        return false;
      }

      const result = await response.json();
      this.logger.log(`WhatsApp template sent successfully: ${payload.template}`, 'WhatsAppService');
      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp template: ${error.message}`, 'WhatsAppService');
      return false;
    }
  }
}
