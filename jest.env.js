// Load environment variables for testing
const path = require('path')
const { loadEnvConfig } = require('@next/env')

const projectDir = process.cwd()

// Load .env.test if it exists, otherwise load .env files
loadEnvConfig(projectDir, true, {
  envFilePath: [
    path.resolve(projectDir, '.env.test'),
    path.resolve(projectDir, '.env.local'),
    path.resolve(projectDir, '.env')
  ]
})