const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // สร้างข้อมูล 23 ประเภทกีฬา
  const sports = [
    { name: 'Aquatic', code: 'AQ', description: 'Water Sports and Swimming', icon: '🏊' },
    { name: 'Archery', code: 'AR', description: 'Bow and Arrow Sport', icon: '🏹' },
    { name: 'Athletics', code: 'AT', description: 'Track and Field Sports', icon: '🏃' },
    { name: 'Badminton', code: 'BD', description: 'Racquet Sport', icon: '🏸' },
    { name: 'Basketball', code: 'BB', description: 'Team Ball Sport', icon: '🏀' },
    { name: 'Boxing', code: 'BX', description: 'Combat Sport', icon: '🥊' },
    { name: 'Bridge', code: 'BR', description: 'Card Game Sport', icon: '🃏' },
    { name: 'Chess Board', code: 'CB', description: 'Strategy Board Game', icon: '♟️' },
    { name: 'Crossword', code: 'CW', description: 'Word Puzzle Sport', icon: '📝' },
    { name: 'Entertain', code: 'EN', description: 'Entertainment Sports', icon: '🎭' },
    { name: 'Fencing', code: 'FC', description: 'Sword Fighting Sport', icon: '🤺' },
    { name: 'Football', code: 'FB', description: 'Association Football', icon: '⚽' },
    { name: 'Hockey', code: 'HK', description: 'Ice Hockey Sport', icon: '🏒' },
    { name: 'Judo', code: 'JD', description: 'Martial Arts Sport', icon: '🥋' },
    { name: 'Petanque', code: 'PT', description: 'Ball Throwing Sport', icon: '⚪' },
    { name: 'Rugby', code: 'RG', description: 'Rugby Football', icon: '🏉' },
    { name: 'Sepak takraw', code: 'ST', description: 'Southeast Asian Sport', icon: '🥎' },
    { name: 'Shooting', code: 'SH', description: 'Target Shooting Sport', icon: '🎯' },
    { name: 'Softball', code: 'SB', description: 'Baseball Variant', icon: '🥎' },
    { name: 'Table tenis', code: 'TT', description: 'Ping Pong Sport', icon: '🏓' },
    { name: 'Taekwondo', code: 'TK', description: 'Korean Martial Art', icon: '🥋' },
    { name: 'Tennis', code: 'TN', description: 'Racquet Sport', icon: '🎾' },
    { name: 'Volleyball', code: 'VB', description: 'Net Team Sport', icon: '🏐' },
  ];

  console.log('📊 Creating sports...');
  for (const sport of sports) {
    await prisma.sport.upsert({
      where: { code: sport.code },
      update: {},
      create: sport,
    });
  }

  // สร้าง 23 บัญชีผู้จัดการกีฬา
  const sportAccounts = [
    { username: 'sport_aquatic', password: 'AquaWave#9k2L7xN', sport: 'Aquatic', name: 'Aquatic Manager' },
    { username: 'sport_archery', password: 'BowShot$7mN3qR8', sport: 'Archery', name: 'Archery Manager' },
    { username: 'sport_athletics', password: 'RunFast!6bX8vK4', sport: 'Athletics', name: 'Athletics Manager' },
    { username: 'sport_badminton', password: 'SmashHit@4vK9pL2', sport: 'Badminton', name: 'Badminton Manager' },
    { username: 'sport_basketball', password: 'HoopStar#3pQ7wM5', sport: 'Basketball', name: 'Basketball Manager' },
    { username: 'sport_boxing', password: 'PunchPro$8yR5nH1', sport: 'Boxing', name: 'Boxing Manager' },
    { username: 'sport_bridge', password: 'CardGame!2wT6jF9', sport: 'Bridge', name: 'Bridge Manager' },
    { username: 'sport_chess', password: 'KingMove@9aH4xC3', sport: 'Chess Board', name: 'Chess Manager' },
    { username: 'sport_crossword', password: 'WordPuzzle#7dF1qY6', sport: 'Crossword', name: 'Crossword Manager' },
    { username: 'sport_entertain', password: 'FunTime$5cE3rB8', sport: 'Entertain', name: 'Entertainment Manager' },
    { username: 'sport_fencing', password: 'SwordPlay!8nM2gK7', sport: 'Fencing', name: 'Fencing Manager' },
    { username: 'sport_football', password: 'GoalKick@6jB9hV4', sport: 'Football', name: 'Football Manager' },
    { username: 'sport_hockey', password: 'IceStick#4gL7mP1', sport: 'Hockey', name: 'Hockey Manager' },
    { username: 'sport_judo', password: 'ThrowPower$3zX8kN5', sport: 'Judo', name: 'Judo Manager' },
    { username: 'sport_petanque', password: 'BallThrow!9uY1wQ2', sport: 'Petanque', name: 'Petanque Manager' },
    { username: 'sport_rugby', password: 'TackleHard@7sP5dT6', sport: 'Rugby', name: 'Rugby Manager' },
    { username: 'sport_sepaktakraw', password: 'KickBall#2qW6fR9', sport: 'Sepak takraw', name: 'Sepaktakraw Manager' },
    { username: 'sport_shooting', password: 'BullsEye$8iO4lH3', sport: 'Shooting', name: 'Shooting Manager' },
    { username: 'sport_softball', password: 'HomeRun!5vK3pM7', sport: 'Softball', name: 'Softball Manager' },
    { username: 'sport_tabletennis', password: 'PingPong@4hJ7xC1', sport: 'Table tenis', name: 'Table Tennis Manager' },
    { username: 'sport_taekwondo', password: 'HighKick#6nA9bG8', sport: 'Taekwondo', name: 'Taekwondo Manager' },
    { username: 'sport_tennis', password: 'AceServe$3fR2yL5', sport: 'Tennis', name: 'Tennis Manager' },
    { username: 'sport_volleyball', password: 'NetSpike!8mC1qV4', sport: 'Volleyball', name: 'Volleyball Manager' }
  ];

  console.log('👥 Creating sport manager accounts...');
  for (const account of sportAccounts) {
    const hashedPassword = await bcrypt.hash(account.password, 12);
    
    await prisma.user.upsert({
      where: { username: account.username },
      update: {},
      create: {
        username: account.username,
        password: hashedPassword,
        name: account.name,
        sportType: account.sport,
        role: 'SPORT_MANAGER',
        isActive: true,
      },
    });
  }

  // สร้างบัญชี admin และ editor เพิ่มเติม (ถ้ายังไม่มี)
  const adminAccounts = [
    {
      username: 'coeadmin777zaza0',
      password: 'K8mP9nQ2vR5wX7yZ3bF6',
      name: 'Administrator',
      role: 'ADMIN',
    }
  ];

  console.log('🔑 Creating admin accounts...');
  for (const account of adminAccounts) {
    const hashedPassword = await bcrypt.hash(account.password, 12);
    
    await prisma.user.upsert({
      where: { username: account.username },
      update: {},
      create: {
        username: account.username,
        password: hashedPassword,
        name: account.name,
        role: account.role,
        isActive: true,
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('📝 Created:');
  console.log('   - 23 Sport categories');
  console.log('   - 23 Sport manager accounts');
  console.log('   - 3 Admin accounts (coeadmin777zaza0, admin, editor)');
  console.log('');
  console.log('🔐 Login credentials:');
  console.log('   COE Admin: coeadmin777zaza0 / K8mP9nQ2vR5wX7yZ3bF6');
  console.log('   Admin: admin / Admin@123456789');
  console.log('   Editor: editor / Editor@123456789');
  console.log('   Sport Managers: sport_[sportname] / [generated password]');
  console.log('   Example: sport_football / GoalKick@6jB9hV4');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });