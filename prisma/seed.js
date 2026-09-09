const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:YstjLRGrOdqmzaxOUurUzIWRVAMLqZVX@metro.proxy.rlwy.net:15364/railway'
    }
  }
});

async function main() {
  console.log('Connecting to Railway DB and creating initial records...');

  const org = await prisma.organization.upsert({
    where: { slug: 'what-in' },
    update: {},
    create: {
      name: 'What-In Platform',
      slug: 'what-in',
      tradeName: 'What-In',
      industry: 'WhatsApp Marketing & SaaS',
      businessType: 'Private Limited',
      email: 'admin@what-inn.tikal.in',
      website: 'https://what-inn.tikal.in',
      country: 'India'
    }
  });
  console.log('Organization created/verified:', org.id);

  let client = await prisma.whatsAppClient.findFirst({
    where: { contactEmail: 'admin@what-inn.tikal.in' }
  });

  if (!client) {
    client = await prisma.whatsAppClient.create({
      data: {
        businessName: 'What-In Primary Account',
        contactEmail: 'admin@what-inn.tikal.in',
        contactPhone: '+919999999999',
        subscriptionPlan: 'ENTERPRISE',
        monthlyFee: 0,
        subscriptionStatus: 'ACTIVE',
        maxAgents: 10,
        isActive: true,
        notes: 'Primary account for What-In platform'
      }
    });
    console.log('Client created:', client.id);
  }

  const agent = await prisma.whatsAppAgentUser.upsert({
    where: { email: 'admin@what-inn.tikal.in' },
    update: {
      password: 'Admin@whatin2026',
      role: 'ADMIN',
      isActive: true
    },
    create: {
      clientId: client.id,
      name: 'What-In Admin',
      email: 'admin@what-inn.tikal.in',
      password: 'Admin@whatin2026',
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('Agent user created/verified:', agent.email);

  const user = await prisma.user.upsert({
    where: { email: 'admin@what-inn.tikal.in' },
    update: {
      organizationId: org.id,
      password: 'Admin@whatin2026',
      role: 'ADMIN',
      canManageSettings: true,
      isActive: true
    },
    create: {
      organizationId: org.id,
      name: 'What-In Admin',
      email: 'admin@what-inn.tikal.in',
      password: 'Admin@whatin2026',
      role: 'ADMIN',
      canManageSettings: true,
      isActive: true
    }
  });
  console.log('User created/verified:', user.email);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
