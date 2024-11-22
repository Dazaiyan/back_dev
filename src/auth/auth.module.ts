import { Module } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { LocalAuthGuard } from './auth.guard';
import { UserModule } from '@/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/user/user.entity';
import { AuthController } from './auth.controller';
import { EmailModule } from '@/services/email/email.module';
import { EmailTemplateModule } from '@/email-template/email-template.module';
import { I18nModule } from 'nestjs-i18n'; // Importa I18nModule

@Module({
  imports: [
    UserModule,
    EmailModule,
    EmailTemplateModule,
    PassportModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('SECRET_KEY_JWT'),
        signOptions: { expiresIn: configService.get<string>('EXPIRES_IN_JWT') },
      }),
    }),
    I18nModule, // Agrega I18nModule para habilitar traducciones
  ],
  providers: [AuthService, JwtStrategy, LocalAuthGuard, I18nModule],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
