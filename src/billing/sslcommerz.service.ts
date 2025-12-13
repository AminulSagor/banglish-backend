import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SSLCommerzPayment = require('sslcommerz-lts');

// ==================== INTERFACES ====================

export interface SSLCommerzInitData {
  total_amount: number;
  currency: string;
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  shipping_method: string;
  product_name: string;
  product_category: string;
  product_profile: string;
  cus_name: string;
  cus_email: string;
  cus_add1: string;
  cus_add2?: string;
  cus_city: string;
  cus_state?: string;
  cus_postcode?: string;
  cus_country: string;
  cus_phone: string;
  cus_fax?: string;
  ship_name?: string;
  ship_add1?: string;
  ship_add2?: string;
  ship_city?: string;
  ship_state?: string;
  ship_postcode?: number;
  ship_country?: string;
  num_of_item?: number;
  value_a?: string; // Custom field: userId
  value_b?: string; // Custom field: packageId
  value_c?: string; // Custom field: minutes
  value_d?: string; // Custom field: additional data
}

export interface SSLCommerzInitResponse {
  status: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  redirectGatewayURL?: string;
  directPaymentURLBank?: string;
  directPaymentURLCard?: string;
  directPaymentURL?: string;
  storeBanner?: string;
  storeLogo?: string;
  store_name?: string;
  desc?: { name: string; type: string; logo: string; gw: string }[];
}

export interface SSLCommerzValidationResponse {
  status: string;
  tran_date: string;
  tran_id: string;
  val_id: string;
  amount: string;
  store_amount: string;
  currency: string;
  bank_tran_id: string;
  card_type: string;
  card_no: string;
  card_issuer: string;
  card_brand: string;
  card_issuer_country: string;
  card_issuer_country_code: string;
  currency_type: string;
  currency_amount: string;
  currency_rate: string;
  base_fair: string;
  value_a?: string;
  value_b?: string;
  value_c?: string;
  value_d?: string;
  risk_level: string;
  risk_title: string;
  verify_sign: string;
  verify_key: string;
}

export interface SSLCommerzIPNPayload {
  tran_id: string;
  val_id: string;
  amount: string;
  card_type: string;
  store_amount: string;
  card_no: string;
  bank_tran_id: string;
  status: string;
  tran_date: string;
  currency: string;
  card_issuer: string;
  card_brand: string;
  card_issuer_country: string;
  card_issuer_country_code: string;
  store_id: string;
  verify_sign: string;
  verify_key: string;
  currency_type: string;
  currency_amount: string;
  currency_rate: string;
  base_fair: string;
  value_a?: string;
  value_b?: string;
  value_c?: string;
  value_d?: string;
  risk_level: string;
  risk_title: string;
}

export interface SSLCommerzRefundData {
  refund_amount: number;
  refund_remarks: string;
  bank_tran_id: string;
  refe_id: string;
}

export interface SSLCommerzRefundResponse {
  APIConnect: string;
  bank_tran_id: string;
  trans_id: string;
  refund_ref_id: string;
  status: string;
  errorReason?: string;
}

export interface SSLCommerzTransactionQueryResponse {
  APIConnect: string;
  no_of_trans_found: number;
  element: Array<{
    val_id: string;
    status: string;
    validated_on: string;
    currency_type: string;
    currency_amount: string;
    currency_rate: string;
    base_fair: string;
    value_a: string;
    value_b: string;
    value_c: string;
    value_d: string;
    tran_date: string;
    tran_id: string;
    amount: string;
    store_amount: string;
    bank_tran_id: string;
    card_type: string;
    risk_title: string;
    risk_level: string;
    currency: string;
    bank_gw: string;
    card_no: string;
    card_issuer: string;
    card_brand: string;
    card_issuer_country: string;
    card_issuer_country_code: string;
    gw_version: string;
    emi_instalment: string;
    emi_amount: string;
    emi_description: string;
    emi_issuer: string;
    error: string;
  }>;
}

// ==================== SERVICE ====================

@Injectable()
export class SSLCommerzService {
  private readonly logger = new Logger(SSLCommerzService.name);
  private readonly storeId: string;
  private readonly storePassword: string;
  private readonly isLive: boolean;

  constructor(private configService: ConfigService) {
    this.storeId = this.configService.get<string>('SSLCOMMERZ_STORE_ID') || '';
    this.storePassword =
      this.configService.get<string>('SSLCOMMERZ_STORE_PASSWD') || '';
    // is_live = false for sandbox, true for live
    // When SSLCOMMERZ_SANDBOX=true, we use sandbox (is_live=false)
    this.isLive =
      this.configService.get<string>('SSLCOMMERZ_SANDBOX') !== 'true';

    if (!this.storeId || !this.storePassword) {
      this.logger.warn(
        'SSLCommerz credentials not configured. Payment features will not work.',
      );
    } else {
      this.logger.log(
        `SSLCommerz initialized: ${this.isLive ? 'LIVE' : 'SANDBOX'} mode`,
      );
    }
  }

  /**
   * Create SSLCommerz payment instance
   * is_live = false for sandbox, true for live
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createInstance(): any {
    return new SSLCommerzPayment(this.storeId, this.storePassword, this.isLive);
  }

  /**
   * Initialize payment session with SSLCommerz
   * Returns GatewayPageURL to redirect user to payment page
   */
  async initPayment(data: SSLCommerzInitData): Promise<{
    success: boolean;
    gatewayUrl?: string;
    sessionKey?: string;
    response?: SSLCommerzInitResponse;
    error?: string;
  }> {
    try {
      this.logger.log(`Initiating payment: ${data.tran_id}`);

      const sslcz = this.createInstance();
      const response: SSLCommerzInitResponse = await sslcz.init(data);

      if (response?.GatewayPageURL) {
        this.logger.log(
          `Payment session created: ${data.tran_id} -> ${response.sessionkey}`,
        );
        return {
          success: true,
          gatewayUrl: response.GatewayPageURL,
          sessionKey: response.sessionkey,
          response,
        };
      } else {
        const errorMsg =
          response?.failedreason || response?.status || 'Unknown error';
        this.logger.error(
          `Payment init failed for ${data.tran_id}: ${errorMsg}`,
        );
        return {
          success: false,
          error: errorMsg,
          response,
        };
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Payment init exception for ${data.tran_id}: ${errorMsg}`,
      );
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Validate a transaction after IPN/success callback
   * Call this to verify the payment was actually successful
   */
  async validateTransaction(valId: string): Promise<{
    success: boolean;
    data?: SSLCommerzValidationResponse;
    error?: string;
  }> {
    try {
      this.logger.log(`Validating transaction: val_id=${valId}`);

      const sslcz = this.createInstance();
      const response: SSLCommerzValidationResponse = await sslcz.validate({
        val_id: valId,
      });

      if (response?.status === 'VALID' || response?.status === 'VALIDATED') {
        this.logger.log(
          `Transaction validated: ${response.tran_id}, amount: ${response.amount} ${response.currency}`,
        );
        return {
          success: true,
          data: response,
        };
      } else {
        this.logger.warn(`Transaction validation failed: ${response?.status}`);
        return {
          success: false,
          error: `Validation failed: ${response?.status}`,
        };
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Validation error: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Query transaction status by Transaction ID
   */
  async queryTransactionByTranId(tranId: string): Promise<{
    success: boolean;
    data?: SSLCommerzTransactionQueryResponse;
    error?: string;
  }> {
    try {
      this.logger.log(`Querying transaction by tran_id: ${tranId}`);

      const sslcz = this.createInstance();
      const response: SSLCommerzTransactionQueryResponse =
        await sslcz.transactionQueryByTransactionId({ tran_id: tranId });

      if (response?.APIConnect === 'DONE' && response.no_of_trans_found > 0) {
        this.logger.log(`Found ${response.no_of_trans_found} transaction(s)`);
        return {
          success: true,
          data: response,
        };
      } else {
        return {
          success: false,
          error: 'Transaction not found',
        };
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Transaction query error: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Query transaction status by Session ID
   */
  async queryTransactionBySessionId(sessionKey: string): Promise<{
    success: boolean;
    data?: SSLCommerzTransactionQueryResponse;
    error?: string;
  }> {
    try {
      this.logger.log(`Querying transaction by session: ${sessionKey}`);

      const sslcz = this.createInstance();
      const response: SSLCommerzTransactionQueryResponse =
        await sslcz.transactionQueryBySessionId({ sessionkey: sessionKey });

      if (response?.APIConnect === 'DONE' && response.no_of_trans_found > 0) {
        return {
          success: true,
          data: response,
        };
      } else {
        return {
          success: false,
          error: 'Transaction not found',
        };
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Session query error: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Initiate a refund
   */
  async initiateRefund(data: SSLCommerzRefundData): Promise<{
    success: boolean;
    data?: SSLCommerzRefundResponse;
    error?: string;
  }> {
    try {
      this.logger.log(
        `Initiating refund: bank_tran_id=${data.bank_tran_id}, amount=${data.refund_amount}`,
      );

      const sslcz = this.createInstance();
      const response: SSLCommerzRefundResponse =
        await sslcz.initiateRefund(data);

      if (response?.status === 'success' || response?.status === 'SUCCESS') {
        this.logger.log(`Refund initiated: ref_id=${response.refund_ref_id}`);
        return {
          success: true,
          data: response,
        };
      } else {
        const errorMsg = response?.errorReason || response?.status || 'Failed';
        this.logger.error(`Refund failed: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Refund error: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Query refund status
   */
  async queryRefundStatus(refundRefId: string): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      this.logger.log(`Querying refund status: ${refundRefId}`);

      const sslcz = this.createInstance();
      const response = await sslcz.refundQuery({ refund_ref_id: refundRefId });

      if (response?.APIConnect === 'DONE') {
        return {
          success: true,
          data: response as Record<string, unknown>,
        };
      } else {
        return {
          success: false,
          error: 'Refund query failed',
        };
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Refund query error: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Verify IPN hash to ensure the callback is authentic
   */
  verifyIPNHash(payload: SSLCommerzIPNPayload): boolean {
    // SSLCommerz sends verify_sign and verify_key
    // In production, you should verify this signature
    // For now, we just check if store_id matches
    if (payload.store_id !== this.storeId) {
      this.logger.warn(
        `IPN store_id mismatch: expected ${this.storeId}, got ${payload.store_id}`,
      );
      return false;
    }
    return true;
  }

  /**
   * Get the base URL for callbacks
   */
  getCallbackBaseUrl(): string {
    return (
      this.configService.get<string>('API_BASE_URL') || 'http://localhost:3000'
    );
  }

  /**
   * Get frontend URL for redirects after payment
   */
  getFrontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001'
    );
  }

  /**
   * Check if SSLCommerz is configured
   */
  isConfigured(): boolean {
    return !!(this.storeId && this.storePassword);
  }

  /**
   * Get current mode (sandbox/live)
   */
  getMode(): 'live' | 'sandbox' {
    return this.isLive ? 'live' : 'sandbox';
  }
}
