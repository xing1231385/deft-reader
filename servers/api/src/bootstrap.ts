/* eslint-disable no-console */
import { resolve } from 'node:path'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { config } from 'dotenv'
import { AppModule } from './resource/app/app.module'
import { setupStaticFiles } from './config/static-files.config'
import { CustomLoggerService } from './config/logger.service'
import { setupSwagger } from './config/swagger.config'
import { envPath, rootPath, uploadPath } from './path'
import { LoggingInterceptor } from './config/logging.interceptor'
import { AllExceptionsFilter } from './config/all-exceptions.filter'

export async function bootstrap(envFile: string = envPath) {
  const envFilePath = resolve(rootPath, envFile)
  config({ path: envFilePath })

  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const configService = app.get(ConfigService)
  let port = configService.get<number>('SERVER_PORT') || 3000
  configService.set('ENV_FILE_PATH', envFilePath)

  app.setGlobalPrefix('api')
  // has web static
  setupStaticFiles(app)
  // has upload static
  app.useStaticAssets(uploadPath, {
    prefix: '/uploads'
  })
  // has log
  const logger = app.get(CustomLoggerService)
  // has swagger
  setupSwagger(app)
  app.useLogger(logger)
  app.useGlobalInterceptors(new LoggingInterceptor(logger))
  app.useGlobalFilters(new AllExceptionsFilter(logger))
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await app.listen(port)
      console.log(`Server is running on http://localhost:${port.toString()}`)
      break
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use, trying ${port + 1}`)
        port++
      } else {
        console.error('Error occurred while starting the server:', error)
        process.exit(1)
      }
    }
  }
}
