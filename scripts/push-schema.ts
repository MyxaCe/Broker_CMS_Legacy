import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

await getPayload({ config })
console.info('[push-schema] schema is in sync')
process.exit(0)
