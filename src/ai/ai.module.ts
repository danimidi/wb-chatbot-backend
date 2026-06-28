import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import { OpenAIAdapter } from './adapters/openai.adapter';

@Module({
  providers: [
    OpenAIAdapter,
    {
      provide: AI_PROVIDER,
      useClass: OpenAIAdapter,
    },
  ],
  exports: [AI_PROVIDER],
})
export class AiModule {}
