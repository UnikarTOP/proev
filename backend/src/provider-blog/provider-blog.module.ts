import { Module } from '@nestjs/common';
import { ProviderBlogController } from './provider-blog.controller';

@Module({ controllers: [ProviderBlogController] })
export class ProviderBlogModule {}
