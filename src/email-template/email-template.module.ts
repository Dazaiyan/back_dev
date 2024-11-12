import { Module } from '@nestjs/common';
import { EmailTemplateService } from '@/email-template/email-template.service';

@Module({
  providers: [EmailTemplateService],
  exports: [EmailTemplateService],
})
export class EmailTemplateModule {}
