import { Module } from '@nestjs/common';
import { AiModule } from '@/ai/ai.module';
import { ToolsModule } from '@/tools/tools.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AiModule, ToolsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
