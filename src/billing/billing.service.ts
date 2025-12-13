import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentConfig } from './entities/payment-config.entity';
import { UserBalance } from './entities/user-balance.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from './entities/transaction.entity';
import { MinutePackage } from './entities/minute-package.entity';
import {
  SetUserBalanceDto,
  BalanceResponseDto,
  PricingResponseDto,
  CreatePackageDto,
  UpdatePackageDto,
} from './dto/billing.dto';
import { SSLCommerzService, SSLCommerzInitData } from './sslcommerz.service';
import { User } from '../users/entities/user.entity';

// Default configuration keys
export const CONFIG_KEYS = {
  FREE_MINUTES: 'free_minutes',
  PRICE_PER_MINUTE: 'price_per_minute',
  MIN_PURCHASE_MINUTES: 'min_purchase_minutes',
  CURRENCY: 'currency',
};

// Default values
const DEFAULT_CONFIG = {
  [CONFIG_KEYS.FREE_MINUTES]: '30',
  [CONFIG_KEYS.PRICE_PER_MINUTE]: '2.00',
  [CONFIG_KEYS.MIN_PURCHASE_MINUTES]: '10',
  [CONFIG_KEYS.CURRENCY]: 'BDT',
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(PaymentConfig)
    private configRepository: Repository<PaymentConfig>,
    @InjectRepository(UserBalance)
    private balanceRepository: Repository<UserBalance>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(MinutePackage)
    private packageRepository: Repository<MinutePackage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private sslcommerzService: SSLCommerzService,
  ) {}

  // ==================== CONFIG MANAGEMENT ====================

  /**
   * Get a config value by key
   */
  async getConfig(key: string): Promise<string> {
    const config = await this.configRepository.findOne({ where: { key } });
    return config?.value ?? DEFAULT_CONFIG[key] ?? '';
  }

  /**
   * Get a config value as number
   */
  async getConfigNumber(key: string): Promise<number> {
    const value = await this.getConfig(key);
    return parseFloat(value) || 0;
  }

  /**
   * Set a config value
   */
  async setConfig(
    key: string,
    value: string,
    description?: string,
  ): Promise<PaymentConfig> {
    let config = await this.configRepository.findOne({ where: { key } });

    if (config) {
      config.value = value;
      if (description) config.description = description;
    } else {
      config = this.configRepository.create({ key, value, description });
    }

    await this.configRepository.save(config);
    this.logger.log(`Config updated: ${key} = ${value}`);
    return config;
  }

  /**
   * Get all configs
   */
  async getAllConfigs(): Promise<PaymentConfig[]> {
    return this.configRepository.find();
  }

  /**
   * Get pricing info for users
   */
  async getPricing(): Promise<PricingResponseDto> {
    return {
      freeMinutesForNewUsers: await this.getConfigNumber(
        CONFIG_KEYS.FREE_MINUTES,
      ),
      pricePerMinute: await this.getConfigNumber(CONFIG_KEYS.PRICE_PER_MINUTE),
      minPurchaseMinutes: await this.getConfigNumber(
        CONFIG_KEYS.MIN_PURCHASE_MINUTES,
      ),
      currency: await this.getConfig(CONFIG_KEYS.CURRENCY),
    };
  }

  /**
   * Set free minutes for new users (admin)
   */
  async setFreeMinutesForNewUsers(minutes: number): Promise<void> {
    await this.setConfig(
      CONFIG_KEYS.FREE_MINUTES,
      minutes.toString(),
      'Free minutes given to new users',
    );
  }

  // ==================== USER BALANCE MANAGEMENT ====================

  /**
   * Get or create user balance
   */
  async getOrCreateBalance(userId: string): Promise<UserBalance> {
    let balance = await this.balanceRepository.findOne({ where: { userId } });

    if (!balance) {
      // Create new balance with default free minutes
      const freeMinutes = await this.getConfigNumber(CONFIG_KEYS.FREE_MINUTES);

      balance = this.balanceRepository.create({
        userId,
        freeMinutes,
        freeMinutesUsed: 0,
        paidMinutes: 0,
        paidMinutesUsed: 0,
        totalSpent: 0,
      });

      await this.balanceRepository.save(balance);

      // Log the initial credit
      await this.createTransaction({
        userId,
        type: TransactionType.ADMIN_CREDIT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.SYSTEM,
        minutes: freeMinutes,
        amount: 0,
        description: 'Initial free minutes for new user',
      });

      this.logger.log(
        `Created balance for user ${userId} with ${freeMinutes} free minutes`,
      );
    }

    return balance;
  }

  /**
   * Get user balance with computed fields
   */
  async getUserBalance(userId: string): Promise<BalanceResponseDto> {
    const balance = await this.getOrCreateBalance(userId);

    return {
      freeMinutes: balance.freeMinutes,
      freeMinutesUsed: balance.freeMinutesUsed,
      remainingFreeMinutes: Math.max(
        0,
        balance.freeMinutes - balance.freeMinutesUsed,
      ),
      paidMinutes: balance.paidMinutes,
      paidMinutesUsed: balance.paidMinutesUsed,
      remainingPaidMinutes: Math.max(
        0,
        balance.paidMinutes - balance.paidMinutesUsed,
      ),
      totalRemainingMinutes:
        Math.max(0, balance.freeMinutes - balance.freeMinutesUsed) +
        Math.max(0, balance.paidMinutes - balance.paidMinutesUsed),
      totalSpent: Number(balance.totalSpent),
    };
  }

  /**
   * Check if user has enough minutes
   */
  async hasMinutes(userId: string, minutes: number = 1): Promise<boolean> {
    const balance = await this.getUserBalance(userId);
    return balance.totalRemainingMinutes >= minutes;
  }

  /**
   * Deduct minutes from user balance (uses free minutes first)
   */
  async deductMinutes(
    userId: string,
    minutes: number,
    callSessionId?: string,
  ): Promise<boolean> {
    const balance = await this.getOrCreateBalance(userId);

    const remainingFree = Math.max(
      0,
      balance.freeMinutes - balance.freeMinutesUsed,
    );
    const remainingPaid = Math.max(
      0,
      balance.paidMinutes - balance.paidMinutesUsed,
    );
    const total = remainingFree + remainingPaid;

    if (total < minutes) {
      return false;
    }

    // Deduct from free minutes first
    let toDeduct = minutes;
    let freeDeducted = 0;
    let paidDeducted = 0;

    if (remainingFree > 0) {
      freeDeducted = Math.min(remainingFree, toDeduct);
      balance.freeMinutesUsed += freeDeducted;
      toDeduct -= freeDeducted;
    }

    if (toDeduct > 0 && remainingPaid > 0) {
      paidDeducted = Math.min(remainingPaid, toDeduct);
      balance.paidMinutesUsed += paidDeducted;
    }

    await this.balanceRepository.save(balance);

    // Log the usage transaction
    await this.createTransaction({
      userId,
      type: TransactionType.USAGE,
      status: TransactionStatus.COMPLETED,
      paymentMethod: PaymentMethod.SYSTEM,
      minutes,
      amount: 0,
      callSessionId,
      description: `Call usage: ${freeDeducted} free + ${paidDeducted} paid minutes`,
      metadata: { freeDeducted, paidDeducted },
    });

    this.logger.log(`Deducted ${minutes} minutes from user ${userId}`);
    return true;
  }

  /**
   * Admin: Set user balance (add free/paid minutes)
   */
  async setUserBalance(
    userId: string,
    dto: SetUserBalanceDto,
    adminId: string,
  ): Promise<UserBalance> {
    const balance = await this.getOrCreateBalance(userId);

    if (dto.freeMinutes !== undefined) {
      const diff = dto.freeMinutes - balance.freeMinutes;
      balance.freeMinutes = dto.freeMinutes;

      if (diff !== 0) {
        await this.createTransaction({
          userId,
          type: TransactionType.ADMIN_CREDIT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.ADMIN,
          minutes: Math.abs(diff),
          amount: 0,
          description:
            dto.reason ||
            `Admin ${diff > 0 ? 'added' : 'removed'} ${Math.abs(diff)} free minutes`,
          metadata: { adminId, adjustment: diff },
        });
      }
    }

    if (dto.paidMinutes !== undefined && dto.paidMinutes > 0) {
      balance.paidMinutes += dto.paidMinutes;

      await this.createTransaction({
        userId,
        type: TransactionType.ADMIN_CREDIT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.ADMIN,
        minutes: dto.paidMinutes,
        amount: 0,
        description:
          dto.reason || `Admin added ${dto.paidMinutes} paid minutes`,
        metadata: { adminId },
      });
    }

    await this.balanceRepository.save(balance);
    this.logger.log(`Admin ${adminId} updated balance for user ${userId}`);
    return balance;
  }

  // ==================== PURCHASE & PAYMENTS ====================

  /**
   * Calculate price for minutes
   */
  async calculatePrice(
    minutes: number,
  ): Promise<{ amount: number; currency: string }> {
    const pricePerMinute = await this.getConfigNumber(
      CONFIG_KEYS.PRICE_PER_MINUTE,
    );
    const currency = await this.getConfig(CONFIG_KEYS.CURRENCY);

    return {
      amount: parseFloat((minutes * pricePerMinute).toFixed(2)),
      currency,
    };
  }

  /**
   * Initiate purchase (creates pending transaction)
   */
  async initiatePurchase(
    userId: string,
    minutes: number,
    paymentMethod: PaymentMethod,
  ): Promise<Transaction> {
    const minPurchase = await this.getConfigNumber(
      CONFIG_KEYS.MIN_PURCHASE_MINUTES,
    );

    if (minutes < minPurchase) {
      throw new BadRequestException(
        `Minimum purchase is ${minPurchase} minutes`,
      );
    }

    const { amount, currency } = await this.calculatePrice(minutes);

    const transaction = await this.createTransaction({
      userId,
      type: TransactionType.PURCHASE,
      status: TransactionStatus.PENDING,
      paymentMethod,
      minutes,
      amount,
      currency,
      description: `Purchase of ${minutes} minutes`,
    });

    this.logger.log(
      `Purchase initiated: ${minutes} minutes for ${amount} ${currency}`,
    );
    return transaction;
  }

  /**
   * Complete purchase (called after payment gateway confirms)
   */
  async completePurchase(
    transactionId: string,
    externalTransactionId: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Transaction already processed');
    }

    // Update transaction
    transaction.status = TransactionStatus.COMPLETED;
    transaction.externalTransactionId = externalTransactionId;
    await this.transactionRepository.save(transaction);

    // Add minutes to user balance
    const balance = await this.getOrCreateBalance(transaction.userId);
    balance.paidMinutes += transaction.minutes;
    balance.totalSpent =
      Number(balance.totalSpent) + Number(transaction.amount);
    await this.balanceRepository.save(balance);

    this.logger.log(
      `Purchase completed: ${transaction.minutes} minutes added to user ${transaction.userId}`,
    );
    return transaction;
  }

  /**
   * Fail purchase
   */
  async failPurchase(
    transactionId: string,
    reason?: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    transaction.status = TransactionStatus.FAILED;
    transaction.metadata = { ...transaction.metadata, failureReason: reason };
    await this.transactionRepository.save(transaction);

    this.logger.log(`Purchase failed: ${transactionId}`);
    return transaction;
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Create a transaction record
   */
  private async createTransaction(
    data: Partial<Transaction>,
  ): Promise<Transaction> {
    const transaction = this.transactionRepository.create(data);
    return this.transactionRepository.save(transaction);
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(
    userId: string,
    options?: { type?: TransactionType; limit?: number; offset?: number },
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const query = this.transactionRepository
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId })
      .orderBy('t.created_at', 'DESC');

    if (options?.type) {
      query.andWhere('t.type = :type', { type: options.type });
    }

    const total = await query.getCount();

    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.offset) {
      query.offset(options.offset);
    }

    const transactions = await query.getMany();

    return { transactions, total };
  }

  /**
   * Get all transactions (admin)
   */
  async getAllTransactions(options?: {
    type?: TransactionType;
    status?: TransactionStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: Transaction[]; total: number }> {
    const query = this.transactionRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'user')
      .orderBy('t.created_at', 'DESC');

    if (options?.type) {
      query.andWhere('t.type = :type', { type: options.type });
    }
    if (options?.status) {
      query.andWhere('t.status = :status', { status: options.status });
    }

    const total = await query.getCount();

    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.offset) {
      query.offset(options.offset);
    }

    const transactions = await query.getMany();

    return { transactions, total };
  }

  // ==================== ANALYTICS ====================

  /**
   * Get billing stats (admin)
   */
  async getBillingStats(): Promise<{
    totalRevenue: number;
    totalMinutesSold: number;
    totalMinutesUsed: number;
    activeUsers: number;
  }> {
    const revenueResult = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const minutesSoldResult = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.minutes)', 'total')
      .where('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    const minutesUsedResult = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.minutes)', 'total')
      .where('t.type = :type', { type: TransactionType.USAGE })
      .getRawOne();

    const activeUsersResult = await this.balanceRepository
      .createQueryBuilder('b')
      .select('COUNT(DISTINCT b.user_id)', 'count')
      .getRawOne();

    return {
      totalRevenue: parseFloat(revenueResult?.total) || 0,
      totalMinutesSold: parseInt(minutesSoldResult?.total) || 0,
      totalMinutesUsed: parseInt(minutesUsedResult?.total) || 0,
      activeUsers: parseInt(activeUsersResult?.count) || 0,
    };
  }

  // ==================== PACKAGE MANAGEMENT ====================

  /**
   * Get all active packages (for users)
   */
  async getActivePackages(): Promise<MinutePackage[]> {
    return this.packageRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', price: 'ASC' },
    });
  }

  /**
   * Get all packages including inactive (for admin)
   */
  async getAllPackages(): Promise<MinutePackage[]> {
    return this.packageRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Get a single package by ID
   */
  async getPackageById(id: string): Promise<MinutePackage> {
    const pkg = await this.packageRepository.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }
    return pkg;
  }

  /**
   * Create a new package (admin)
   */
  async createPackage(dto: CreatePackageDto): Promise<MinutePackage> {
    const pkg = this.packageRepository.create({
      name: dto.name,
      description: dto.description,
      minutes: dto.minutes,
      price: dto.price,
      currency: dto.currency || 'BDT',
      discountPercent: dto.discountPercent || 0,
      originalPrice: dto.originalPrice,
      badge: dto.badge,
      sortOrder: dto.sortOrder || 0,
      isActive: dto.isActive ?? true,
      isFeatured: dto.isFeatured ?? false,
    });

    const saved = await this.packageRepository.save(pkg);
    this.logger.log(
      `Package created: ${saved.name} (${saved.minutes} mins for ${saved.price} ${saved.currency})`,
    );
    return saved;
  }

  /**
   * Update a package (admin)
   */
  async updatePackage(
    id: string,
    dto: UpdatePackageDto,
  ): Promise<MinutePackage> {
    const pkg = await this.getPackageById(id);

    Object.assign(pkg, dto);

    const saved = await this.packageRepository.save(pkg);
    this.logger.log(`Package updated: ${saved.id}`);
    return saved;
  }

  /**
   * Delete a package (admin)
   */
  async deletePackage(id: string): Promise<void> {
    const pkg = await this.getPackageById(id);
    await this.packageRepository.remove(pkg);
    this.logger.log(`Package deleted: ${id}`);
  }

  // ==================== PACKAGE PURCHASE WITH SSLCOMMERZ ====================

  /**
   * Initiate package purchase with SSLCommerz
   */
  async purchasePackage(
    userId: string,
    packageId: string,
    customerName?: string,
    customerPhone?: string,
  ): Promise<{
    transactionId: string;
    gatewayUrl: string;
    package: MinutePackage;
  }> {
    // Get the package
    const pkg = await this.getPackageById(packageId);

    if (!pkg.isActive) {
      throw new BadRequestException('This package is no longer available');
    }

    // Get user details
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create pending transaction
    const transaction = await this.createTransaction({
      userId,
      type: TransactionType.PURCHASE,
      status: TransactionStatus.PENDING,
      paymentMethod: PaymentMethod.SSLCOMMERZ,
      minutes: pkg.minutes,
      amount: Number(pkg.price),
      currency: pkg.currency,
      description: `Purchase: ${pkg.name} (${pkg.minutes} minutes)`,
      metadata: { packageId: pkg.id, packageName: pkg.name },
    });

    // Prepare SSLCommerz payment data
    const baseUrl = this.sslcommerzService.getCallbackBaseUrl();

    const paymentData: SSLCommerzInitData = {
      total_amount: Number(pkg.price),
      currency: pkg.currency,
      tran_id: transaction.id,
      success_url: `${baseUrl}/billing/payment/success`,
      fail_url: `${baseUrl}/billing/payment/fail`,
      cancel_url: `${baseUrl}/billing/payment/cancel`,
      ipn_url: `${baseUrl}/billing/webhook/sslcommerz`,
      product_name: pkg.name,
      product_category: 'Call Minutes',
      product_profile: 'non-physical-goods',
      cus_name: customerName || user.email?.split('@')[0] || 'Customer',
      cus_email: user.email || 'customer@example.com',
      cus_phone: customerPhone || user.phone || '01700000000',
      cus_add1: 'Bangladesh',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      num_of_item: 1,
      value_a: userId,
      value_b: packageId,
      value_c: pkg.minutes.toString(),
      value_d: transaction.id,
    };

    // Initialize payment with SSLCommerz
    const result = await this.sslcommerzService.initPayment(paymentData);

    if (!result.success || !result.gatewayUrl) {
      // Mark transaction as failed
      transaction.status = TransactionStatus.FAILED;
      transaction.metadata = { ...transaction.metadata, error: result.error };
      await this.transactionRepository.save(transaction);

      throw new BadRequestException(
        result.error || 'Failed to initialize payment',
      );
    }

    this.logger.log(
      `Package purchase initiated: ${pkg.name} for user ${userId}`,
    );

    return {
      transactionId: transaction.id,
      gatewayUrl: result.gatewayUrl,
      package: pkg,
    };
  }

  /**
   * Handle successful payment callback
   */
  async handlePaymentSuccess(payload: any): Promise<{ redirectUrl: string }> {
    const transactionId = payload.tran_id;
    const valId = payload.val_id;

    this.logger.log(`Payment success callback received: ${transactionId}`);

    // Validate the transaction with SSLCommerz
    const validation = await this.sslcommerzService.validateTransaction(valId);

    if (validation.success && validation.data) {
      await this.completePurchase(transactionId, payload.bank_tran_id || valId);

      const frontendUrl = this.sslcommerzService.getFrontendUrl();
      return {
        redirectUrl: `${frontendUrl}/billing/success?tran_id=${transactionId}`,
      };
    } else {
      await this.failPurchase(transactionId, 'Payment validation failed');

      const frontendUrl = this.sslcommerzService.getFrontendUrl();
      return {
        redirectUrl: `${frontendUrl}/billing/failed?tran_id=${transactionId}`,
      };
    }
  }

  /**
   * Handle failed payment callback
   */
  async handlePaymentFail(payload: any): Promise<{ redirectUrl: string }> {
    const transactionId = payload.tran_id;

    this.logger.log(`Payment failed callback received: ${transactionId}`);

    await this.failPurchase(transactionId, payload.error || 'Payment failed');

    const frontendUrl = this.sslcommerzService.getFrontendUrl();
    return {
      redirectUrl: `${frontendUrl}/billing/failed?tran_id=${transactionId}`,
    };
  }

  /**
   * Handle cancelled payment callback
   */
  async handlePaymentCancel(payload: any): Promise<{ redirectUrl: string }> {
    const transactionId = payload.tran_id;

    this.logger.log(`Payment cancelled callback received: ${transactionId}`);

    await this.failPurchase(transactionId, 'Payment cancelled by user');

    const frontendUrl = this.sslcommerzService.getFrontendUrl();
    return {
      redirectUrl: `${frontendUrl}/billing/cancelled?tran_id=${transactionId}`,
    };
  }

  /**
   * Seed default packages (for initial setup)
   */
  async seedDefaultPackages(): Promise<MinutePackage[]> {
    const existingCount = await this.packageRepository.count();

    if (existingCount > 0) {
      this.logger.log('Packages already exist, skipping seed');
      return this.getAllPackages();
    }

    const defaultPackages: CreatePackageDto[] = [
      {
        name: 'Starter Pack',
        description: 'Perfect for trying out our service',
        minutes: 30,
        price: 50,
        currency: 'BDT',
        sortOrder: 1,
        isActive: true,
        isFeatured: false,
      },
      {
        name: 'Popular Pack',
        description: 'Best value for regular users',
        minutes: 100,
        price: 150,
        currency: 'BDT',
        discountPercent: 10,
        originalPrice: 166,
        badge: 'Most Popular',
        sortOrder: 2,
        isActive: true,
        isFeatured: true,
      },
      {
        name: 'Premium Pack',
        description: 'For power users who need more minutes',
        minutes: 300,
        price: 400,
        currency: 'BDT',
        discountPercent: 20,
        originalPrice: 500,
        badge: 'Best Value',
        sortOrder: 3,
        isActive: true,
        isFeatured: false,
      },
      {
        name: 'Enterprise Pack',
        description: 'Maximum minutes at the best rate',
        minutes: 1000,
        price: 1200,
        currency: 'BDT',
        discountPercent: 25,
        originalPrice: 1600,
        badge: 'Enterprise',
        sortOrder: 4,
        isActive: true,
        isFeatured: false,
      },
    ];

    const created: MinutePackage[] = [];
    for (const pkgDto of defaultPackages) {
      const pkg = await this.createPackage(pkgDto);
      created.push(pkg);
    }

    this.logger.log(`Seeded ${created.length} default packages`);
    return created;
  }
}
