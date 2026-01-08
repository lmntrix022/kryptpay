const fs = require('fs');
const path = 'apps/dashboard/app/(protected)/integrations/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Trouver la ligne avec function IntegrationCard
let found = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function IntegrationCard')) {
    // Insérer useAuth après la ligne suivante (qui commence par const)
    if (i + 1 < lines.length && !lines[i + 1].includes('useAuth')) {
      lines.splice(i + 1, 0, '  const { auth } = useAuth();');
      found = true;
      break;
    }
  }
}

if (found) {
  fs.writeFileSync(path, lines.join('\n'), 'utf8');
  console.log('✅ Fixed: Added useAuth() to IntegrationCard');
} else {
  console.log('⚠️  Could not find insertion point or already fixed');
}


