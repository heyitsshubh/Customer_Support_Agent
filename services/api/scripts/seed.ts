import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/support_agent';

// Generates a mock normalized 1536-dimensional vector for pgvector testing
function generateMockEmbedding(seedValue: number): string {
  const dim = 1536;
  const values = new Float32Array(dim);
  let sumSq = 0;

  for (let i = 0; i < dim; i++) {
    values[i] = Math.sin(seedValue * 1000 + i);
    sumSq += values[i] * values[i];
  }

  const norm = Math.sqrt(sumSq) || 1;
  const normalized = Array.from(values).map((v) => (v / norm).toFixed(6));
  return `[${normalized.join(',')}]`;
}

async function seedDatabase() {
  console.log(`Connecting to database for seeding: ${DATABASE_URL.replace(/:[^:@]*@/, ':****@')}`);
  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    console.log('Seeding Users...');
    // Demo password hash for 'Password123!' (pre-hashed bcrypt for portability)
    const demoPasswordHash = '$2b$10$w1e2E67L0L0eN4T3B.5mjeF13D5v4O/2i2vQ.E3kP1b0/7pE00eK.';

    const [adminUser] = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES 
        ('admin@supportagent.com', ${demoPasswordHash}, 'System Admin', 'admin'),
        ('manager@supportagent.com', ${demoPasswordHash}, 'Sarah Reviewer', 'reviewer'),
        ('agent@supportagent.com', ${demoPasswordHash}, 'Support Agent Bob', 'agent')
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id, email, role;
    `;

    console.log('Seeding Customers...');
    const [goldCustomer, silverCustomer, standardCustomer] = await sql`
      INSERT INTO customers (email, name, tier, lifetime_value)
      VALUES
        ('sarah.jenkins@example.com', 'Sarah Jenkins', 'gold', 1450.00),
        ('alex.miller@example.com', 'Alex Miller', 'silver', 520.00),
        ('jordan.lee@example.com', 'Jordan Lee', 'standard', 85.00)
      ON CONFLICT (email) DO UPDATE 
        SET tier = EXCLUDED.tier, lifetime_value = EXCLUDED.lifetime_value, updated_at = NOW()
      RETURNING id, email, tier;
    `;

    console.log('Seeding Orders...');
    const [orderDuplicateCharge, orderShipped, orderDelivered] = await sql`
      INSERT INTO orders (customer_id, order_number, status, total_amount, items, tracking_number, carrier)
      VALUES
        (
          ${goldCustomer.id},
          'ORD-1042',
          'delivered',
          49.99,
          ${JSON.stringify([{ item_id: 'prod_earbuds', name: 'Wireless Noise-Canceling Earbuds', qty: 1, price: 49.99 }])}::jsonb,
          'TRK-FEDEX-998811',
          'FedEx'
        ),
        (
          ${silverCustomer.id},
          'ORD-2301',
          'shipped',
          129.50,
          ${JSON.stringify([{ item_id: 'prod_keyboard', name: 'Ergonomic Mechanical Keyboard', qty: 1, price: 129.50 }])}::jsonb,
          'TRK-UPS-443322',
          'UPS'
        ),
        (
          ${standardCustomer.id},
          'ORD-3180',
          'delivered',
          24.99,
          ${JSON.stringify([{ item_id: 'prod_stand', name: 'Adjustable Aluminum Phone Stand', qty: 1, price: 24.99 }])}::jsonb,
          'TRK-USPS-771122',
          'USPS'
        )
      ON CONFLICT (order_number) DO UPDATE SET updated_at = NOW()
      RETURNING id, order_number;
    `;

    console.log('Seeding Transactions (including Duplicate Charge Scenario)...');
    await sql`
      INSERT INTO transactions (order_id, amount, type, status, idempotency_key, payment_gateway)
      VALUES
        (
          ${orderDuplicateCharge.id},
          49.99,
          'charge',
          'success',
          'txn_1042_charge_primary',
          'stripe'
        ),
        (
          ${orderDuplicateCharge.id},
          49.99,
          'charge',
          'success',
          'txn_1042_charge_duplicate',
          'stripe'
        ),
        (
          ${orderShipped.id},
          129.50,
          'charge',
          'success',
          'txn_2301_charge_primary',
          'stripe'
        ),
        (
          ${orderDelivered.id},
          24.99,
          'charge',
          'success',
          'txn_3180_charge_primary',
          'stripe'
        )
      ON CONFLICT (idempotency_key) DO NOTHING;
    `;

    console.log('Seeding Knowledge Base Documents with Vector Embeddings...');
    const doc1Embedding = generateMockEmbedding(1);
    const doc2Embedding = generateMockEmbedding(2);
    const doc3Embedding = generateMockEmbedding(3);
    const doc4Embedding = generateMockEmbedding(4);

    await sql`
      INSERT INTO documents (title, content, category, embedding, source)
      VALUES
        (
          'Duplicate Charge and Billing Error Policy',
          'When a customer reports a duplicate charge for a single order, the agent must inspect transactions associated with that order. If two identical charges are confirmed on the same date with the same amount, the customer is entitled to an immediate refund of the duplicate amount. Any refund action requires human supervisor approval before execution.',
          'billing',
          ${doc1Embedding}::vector,
          'internal_knowledge_base/billing_sop_v2.md'
        ),
        (
          'Return and Replacement Policy',
          'Customers may return unopened and unused items within 30 days of delivery. Gold and Silver tier customers receive free return shipping labels. Replacement items are dispatched within 24 hours of return request validation.',
          'orders',
          ${doc2Embedding}::vector,
          'internal_knowledge_base/returns_sop_v1.md'
        ),
        (
          'Shipping and Carrier Delays SLA',
          'Orders shipped via FedEx or UPS typically arrive within 3-5 business days. If tracking shows no movement for more than 7 consecutive business days, the support agent may initiate a carrier tracer or request approval for a complimentary reshipment.',
          'shipping',
          ${doc3Embedding}::vector,
          'internal_knowledge_base/shipping_guidelines.md'
        ),
        (
          'Customer Tier SLA Guidelines',
          'Gold tier customers are allocated high-priority routing with a target response time under 15 minutes. Silver tier customers have an SLA of 1 hour. Standard tier customers have an SLA of 4 hours.',
          'support_tier',
          ${doc4Embedding}::vector,
          'internal_knowledge_base/tier_benefits.md'
        )
      ON CONFLICT DO NOTHING;
    `;

    console.log('✅ Database seeded successfully with initial test records!');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

seedDatabase().catch((err) => {
  console.error('Fatal seed script error:', err);
  process.exit(1);
});
