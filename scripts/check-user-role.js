const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserRole() {
  try {
    const email = 'ekq022@gmail.com';
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`❌ Utilisateur "${email}" non trouvé dans la base de données.`);
      return;
    }

    console.log('✅ Utilisateur trouvé:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rôle: ${user.role}`);
    console.log(`   Merchant ID: ${user.merchantId || 'AUCUN'}`);
    
    if (user.merchant) {
      console.log(`   Merchant Name: ${user.merchant.name || 'N/A'}`);
    }

    if (user.role === 'ADMIN') {
      console.log('\n⚠️  ATTENTION: Cet utilisateur a le rôle ADMIN, pas MERCHANT.');
      console.log('   Les utilisateurs ADMIN ne voient pas le lien TVA dans le menu.');
      console.log('   Pour voir le lien TVA, l\'utilisateur doit avoir le rôle MERCHANT.');
    } else if (user.role === 'MERCHANT') {
      console.log('\n✅ Rôle correct (MERCHANT). L\'utilisateur devrait voir le lien TVA.');
      
      if (!user.merchantId) {
        console.log('⚠️  ATTENTION: L\'utilisateur n\'a pas de merchantId associé.');
        console.log('   Cela peut causer des problèmes avec certaines fonctionnalités.');
      }
    } else {
      console.log(`\n⚠️  Rôle inconnu: ${user.role}`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();











