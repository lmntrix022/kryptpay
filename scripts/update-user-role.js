const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    const email = 'ekq022@gmail.com';
    
    // Vérifier l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
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

    if (!currentUser) {
      console.log(`❌ Utilisateur "${email}" non trouvé dans la base de données.`);
      return;
    }

    console.log('📋 État actuel:');
    console.log(`   Rôle: ${currentUser.role}`);
    console.log(`   Merchant ID: ${currentUser.merchantId || 'AUCUN'}`);
    
    if (currentUser.merchant) {
      console.log(`   Merchant Name: ${currentUser.merchant.name || 'N/A'}`);
    }

    // Vérifier que l'utilisateur a un merchantId
    if (!currentUser.merchantId) {
      console.log('\n⚠️  ATTENTION: L\'utilisateur n\'a pas de merchantId associé.');
      console.log('   Le rôle MERCHANT nécessite un merchantId.');
      console.log('   Veuillez d\'abord associer un merchant à cet utilisateur.');
      return;
    }

    // Mettre à jour le rôle vers MERCHANT
    if (currentUser.role === 'MERCHANT') {
      console.log('\n✅ L\'utilisateur a déjà le rôle MERCHANT. Aucune modification nécessaire.');
      return;
    }

    console.log('\n🔄 Mise à jour du rôle vers MERCHANT...');
    
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        role: 'MERCHANT',
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log('\n✅ Rôle mis à jour avec succès!');
    console.log(`   Nouveau rôle: ${updatedUser.role}`);
    console.log(`   Merchant ID: ${updatedUser.merchantId}`);
    
    if (updatedUser.merchant) {
      console.log(`   Merchant Name: ${updatedUser.merchant.name || 'N/A'}`);
    }

    console.log('\n📝 Instructions:');
    console.log('   1. L\'utilisateur doit se déconnecter et se reconnecter pour que les changements prennent effet.');
    console.log('   2. Après reconnexion, le lien TVA devrait apparaître dans le menu de navigation.');
    console.log('   3. Si le lien n\'apparaît toujours pas, vérifier les cookies/localStorage et recharger la page.');

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    if (error.code === 'P2002') {
      console.error('   Conflit: Un utilisateur avec cet email existe déjà avec un rôle différent.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();











