import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import {
  AuthenticatedOnly,
  CurrentUser,
  Public,
} from './auth.decorators.js';
import { LoginDto } from './dto/login.dto.js';
import type { AuthenticatedUser, LoginResponse } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto): Promise<LoginResponse> {
    return this.authService.login(body.username, body.password);
  }

  @Get('me')
  @AuthenticatedOnly()
  getCurrentUser(
    @CurrentUser() user: AuthenticatedUser,
  ): AuthenticatedUser {
    return user;
  }

  @Post('logout')
  @AuthenticatedOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(): void {}
}
