import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import {
  SetFreeMinutesDto,
  SetUserBalanceDto,
  PurchaseMinutesDto,
  PurchasePackageDto,
  CreatePackageDto,
  UpdatePackageDto,
  BalanceResponseDto,
  PricingResponseDto,
} from './dto/billing.dto';
import {
  PaymentMethod,
  TransactionType,
  TransactionStatus,
} from './entities/transaction.entity';

@ApiTags('Billing')
@ApiBearerAuth('JWT-auth')
@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ==================== USER ENDPOINTS ====================

  @Get('balance')
  @ApiOperation({
    summary: 'Get my balance',
    description: 'Get current user call minutes balance',
  })
  @ApiResponse({
    status: 200,
    description: 'User balance',
    type: BalanceResponseDto,
  })
  async getMyBalance(@CurrentUser() user: User): Promise<BalanceResponseDto> {
    return this.billingService.getUserBalance(user.id);
  }

  @Get('pricing')
  @ApiOperation({
    summary: 'Get pricing',
    description: 'Get current pricing for call minutes',
  })
  @ApiResponse({
    status: 200,
    description: 'Pricing info',
    type: PricingResponseDto,
  })
  async getPricing(): Promise<PricingResponseDto> {
    return this.billingService.getPricing();
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Get my transactions',
    description: 'Get transaction history',
  })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transaction list' })
  async getMyTransactions(
    @CurrentUser() user: User,
    @Query('type') type?: TransactionType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.billingService.getUserTransactions(user.id, {
      type,
      limit,
      offset,
    });
  }

  @Post('purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Purchase minutes',
    description: 'Initiate purchase of call minutes',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase initiated, returns payment URL',
  })
  async purchaseMinutes(
    @CurrentUser() user: User,
    @Body() dto: PurchaseMinutesDto,
  ) {
    const paymentMethod =
      PaymentMethod[dto.paymentMethod as keyof typeof PaymentMethod];
    const transaction = await this.billingService.initiatePurchase(
      user.id,
      dto.minutes,
      paymentMethod,
    );

    const { amount, currency } = await this.billingService.calculatePrice(
      dto.minutes,
    );

    // TODO: Integrate with actual payment gateway here
    // For now, return transaction info for frontend to handle payment
    return {
      transactionId: transaction.id,
      minutes: dto.minutes,
      amount,
      currency,
      paymentMethod: dto.paymentMethod,
      // paymentUrl: 'https://payment-gateway.com/...',
      message: 'Payment gateway integration pending. Use webhook to complete.',
    };
  }

  @Get('check-minutes')
  @ApiOperation({
    summary: 'Check if I have minutes',
    description: 'Check if user has available call minutes',
  })
  @ApiQuery({
    name: 'minutes',
    required: false,
    type: Number,
    description: 'Minutes needed (default: 1)',
  })
  @ApiResponse({ status: 200, description: 'Minutes availability' })
  async checkMinutes(
    @CurrentUser() user: User,
    @Query('minutes') minutes?: number,
  ) {
    const hasMinutes = await this.billingService.hasMinutes(
      user.id,
      minutes || 1,
    );
    const balance = await this.billingService.getUserBalance(user.id);

    return {
      hasMinutes,
      remainingMinutes: balance.totalRemainingMinutes,
      requested: minutes || 1,
    };
  }

  // ==================== PACKAGE ENDPOINTS (USER) ====================

  @Get('packages')
  @ApiOperation({
    summary: 'Get available packages',
    description: 'Get list of available minute packages for purchase',
  })
  @ApiResponse({ status: 200, description: 'List of packages' })
  async getPackages() {
    const packages = await this.billingService.getActivePackages();
    return {
      packages: packages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        minutes: pkg.minutes,
        price: Number(pkg.price),
        currency: pkg.currency,
        discountPercent: pkg.discountPercent,
        originalPrice: pkg.originalPrice ? Number(pkg.originalPrice) : null,
        badge: pkg.badge,
        pricePerMinute: pkg.minutes > 0 ? Number(pkg.price) / pkg.minutes : 0,
        isFeatured: pkg.isFeatured,
      })),
    };
  }

  @Get('packages/:id')
  @ApiOperation({
    summary: 'Get package details',
    description: 'Get details of a specific package',
  })
  @ApiResponse({ status: 200, description: 'Package details' })
  async getPackageById(@Param('id') id: string) {
    const pkg = await this.billingService.getPackageById(id);
    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      minutes: pkg.minutes,
      price: Number(pkg.price),
      currency: pkg.currency,
      discountPercent: pkg.discountPercent,
      originalPrice: pkg.originalPrice ? Number(pkg.originalPrice) : null,
      badge: pkg.badge,
      pricePerMinute: pkg.minutes > 0 ? Number(pkg.price) / pkg.minutes : 0,
      isFeatured: pkg.isFeatured,
    };
  }

  @Post('packages/:id/buy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buy a package',
    description: 'Initiate purchase of a minute package via SSLCommerz',
  })
  @ApiResponse({ status: 200, description: 'Returns payment gateway URL' })
  async buyPackage(
    @CurrentUser() user: User,
    @Param('id') packageId: string,
    @Body() dto: PurchasePackageDto,
  ) {
    const result = await this.billingService.purchasePackage(
      user.id,
      packageId,
      dto.customerName,
      dto.customerPhone,
    );

    return {
      success: true,
      transactionId: result.transactionId,
      gatewayUrl: result.gatewayUrl,
      package: {
        id: result.package.id,
        name: result.package.name,
        minutes: result.package.minutes,
        price: Number(result.package.price),
        currency: result.package.currency,
      },
      message: 'Redirect to gatewayUrl to complete payment',
    };
  }

  // ==================== PAYMENT CALLBACKS (PUBLIC) ====================

  @Public()
  @Post('payment/success')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Payment success callback',
    description: 'SSLCommerz success callback',
  })
  async paymentSuccess(@Body() payload: any, @Res() res: Response) {
    const result = await this.billingService.handlePaymentSuccess(payload);
    return res.redirect(result.redirectUrl);
  }

  @Public()
  @Post('payment/fail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Payment fail callback',
    description: 'SSLCommerz fail callback',
  })
  async paymentFail(@Body() payload: any, @Res() res: Response) {
    const result = await this.billingService.handlePaymentFail(payload);
    return res.redirect(result.redirectUrl);
  }

  @Public()
  @Post('payment/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Payment cancel callback',
    description: 'SSLCommerz cancel callback',
  })
  async paymentCancel(@Body() payload: any, @Res() res: Response) {
    const result = await this.billingService.handlePaymentCancel(payload);
    return res.redirect(result.redirectUrl);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all configs (Admin)',
    description: 'Get all billing configurations',
  })
  @ApiResponse({ status: 200, description: 'All configs' })
  async getAllConfigs() {
    const configs = await this.billingService.getAllConfigs();
    const pricing = await this.billingService.getPricing();
    return { configs, pricing };
  }

  @Patch('admin/config/free-minutes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Set free minutes (Admin)',
    description: 'Set free minutes for new users',
  })
  @ApiResponse({ status: 200, description: 'Config updated' })
  async setFreeMinutes(@Body() dto: SetFreeMinutesDto) {
    await this.billingService.setFreeMinutesForNewUsers(dto.freeMinutes);
    return {
      message: `Free minutes for new users set to ${dto.freeMinutes}`,
      freeMinutes: dto.freeMinutes,
    };
  }

  @Patch('admin/config/:key')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Set config value (Admin)',
    description: 'Set any billing config value',
  })
  @ApiResponse({ status: 200, description: 'Config updated' })
  async setConfig(
    @Param('key') key: string,
    @Body() body: { value: string; description?: string },
  ) {
    const config = await this.billingService.setConfig(
      key,
      body.value,
      body.description,
    );
    return { message: `Config ${key} updated`, config };
  }

  @Get('admin/users/:userId/balance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get user balance (Admin)',
    description: 'Get specific user balance',
  })
  @ApiResponse({ status: 200, description: 'User balance' })
  async getUserBalance(@Param('userId') userId: string) {
    return this.billingService.getUserBalance(userId);
  }

  @Patch('admin/users/:userId/balance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Set user balance (Admin)',
    description: 'Adjust user free/paid minutes',
  })
  @ApiResponse({ status: 200, description: 'Balance updated' })
  async setUserBalance(
    @Param('userId') userId: string,
    @Body() dto: SetUserBalanceDto,
    @CurrentUser() admin: User,
  ) {
    await this.billingService.setUserBalance(
      userId,
      dto,
      admin.id,
    );
    return {
      message: 'User balance updated',
      balance: await this.billingService.getUserBalance(userId),
    };
  }

  @Get('admin/transactions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all transactions (Admin)',
    description: 'Get all transactions',
  })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'All transactions' })
  async getAllTransactions(
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.billingService.getAllTransactions({
      type,
      status,
      limit,
      offset,
    });
  }

  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get billing stats (Admin)',
    description: 'Get billing analytics',
  })
  @ApiResponse({ status: 200, description: 'Billing statistics' })
  async getBillingStats() {
    return this.billingService.getBillingStats();
  }

  // ==================== WEBHOOK ENDPOINTS ====================

  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook',
    description: 'Handle Stripe payment webhooks',
  })
  async stripeWebhook(@Body() payload: any) {
    // TODO: Verify Stripe signature
    // TODO: Handle different event types

    if (payload.type === 'payment_intent.succeeded') {
      const transactionId = payload.data?.object?.metadata?.transactionId;
      const externalId = payload.data?.object?.id;

      if (transactionId) {
        await this.billingService.completePurchase(transactionId, externalId);
        return { received: true };
      }
    }

    if (payload.type === 'payment_intent.payment_failed') {
      const transactionId = payload.data?.object?.metadata?.transactionId;

      if (transactionId) {
        await this.billingService.failPurchase(transactionId, 'Payment failed');
        return { received: true };
      }
    }

    return { received: true };
  }

  @Public()
  @Post('webhook/sslcommerz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SSLCommerz IPN webhook',
    description: 'Handle SSLCommerz IPN (Instant Payment Notification)',
  })
  async sslcommerzWebhook(@Body() payload: any) {
    const transactionId = payload.tran_id;
    const status = payload.status;

    if (status === 'VALID' || status === 'VALIDATED') {
      await this.billingService.completePurchase(
        transactionId,
        payload.bank_tran_id,
      );
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      await this.billingService.failPurchase(transactionId, status);
    }

    return { received: true };
  }

  // ==================== ADMIN PACKAGE MANAGEMENT ====================

  @Get('admin/packages')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all packages (Admin)',
    description: 'Get all packages including inactive',
  })
  @ApiResponse({ status: 200, description: 'All packages' })
  async getAllPackages() {
    const packages = await this.billingService.getAllPackages();
    return { packages };
  }

  @Post('admin/packages')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create package (Admin)',
    description: 'Create a new minute package',
  })
  @ApiResponse({ status: 201, description: 'Package created' })
  async createPackage(@Body() dto: CreatePackageDto) {
    const pkg = await this.billingService.createPackage(dto);
    return {
      message: 'Package created successfully',
      package: pkg,
    };
  }

  @Patch('admin/packages/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update package (Admin)',
    description: 'Update an existing package',
  })
  @ApiResponse({ status: 200, description: 'Package updated' })
  async updatePackage(@Param('id') id: string, @Body() dto: UpdatePackageDto) {
    const pkg = await this.billingService.updatePackage(id, dto);
    return {
      message: 'Package updated successfully',
      package: pkg,
    };
  }

  @Delete('admin/packages/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete package (Admin)',
    description: 'Delete a package',
  })
  @ApiResponse({ status: 200, description: 'Package deleted' })
  async deletePackage(@Param('id') id: string) {
    await this.billingService.deletePackage(id);
    return { message: 'Package deleted successfully' };
  }

  @Post('admin/packages/seed')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Seed default packages (Admin)',
    description: 'Create default packages if none exist',
  })
  @ApiResponse({ status: 200, description: 'Packages seeded' })
  async seedPackages() {
    const packages = await this.billingService.seedDefaultPackages();
    return {
      message: `${packages.length} packages available`,
      packages,
    };
  }
}
