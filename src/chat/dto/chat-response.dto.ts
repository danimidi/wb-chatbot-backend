import { ApiProperty } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty({
    example:
      'The Apple Watch Series 8 costs 399.0 USD. You can view it here: https://...',
    description: 'Chatbot response message',
  })
  answer: string;
}
