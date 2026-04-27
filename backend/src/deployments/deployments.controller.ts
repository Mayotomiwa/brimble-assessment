import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { DeploymentsService } from './deployments.service';

@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly service: DeploymentsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(@Body() body: { gitUrl?: string }) {
    return this.service.create(body);
  }

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/redeploy')
  @HttpCode(HttpStatus.ACCEPTED)
  redeploy(@Param('id') id: string) {
    return this.service.redeploy(id);
  }

  @Post(':id/rollback')
  @HttpCode(HttpStatus.ACCEPTED)
  rollback(@Param('id') id: string, @Body() body: { imageTagId: string }) {
    return this.service.rollback(id, body);
  }

  @Get(':id/tags')
  listTags(@Param('id') id: string) {
    return this.service.listTags(id);
  }
}
