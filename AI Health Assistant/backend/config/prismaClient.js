import { PrismaClient } from '@prisma/client'
import { assertDatabaseConfigured } from '../utils/prismaErrors.js'

assertDatabaseConfigured()

const prisma = new PrismaClient()

export default prisma
