/**
 * createUsersTable.js — Create the apkaai-users DynamoDB table
 * Run once: node src/lib/createUsersTable.js
 */
require('dotenv').config()
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb')

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' })

async function main() {
  const TABLE = 'apkaai-users'
  console.log(`Creating table: ${TABLE} ...`)

  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE }))
    console.log('Table already exists.')
    return
  } catch (_) {}

  await client.send(new CreateTableCommand({
    TableName: TABLE,
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email',  AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [{
      IndexName: 'email-index',
      KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
    }],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  }))

  console.log('Table created! Waiting for ACTIVE...')
  let active = false
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const desc = await client.send(new DescribeTableCommand({ TableName: TABLE }))
    if (desc.Table.TableStatus === 'ACTIVE') { active = true; break }
    console.log(`  Status: ${desc.Table.TableStatus}`)
  }
  console.log(active ? 'Table ACTIVE!' : 'Table may still be creating — check AWS console.')
}

main().catch(console.error)
