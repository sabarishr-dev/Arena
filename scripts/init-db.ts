import { initDb } from '../lib/db';

initDb().then(() => {
    process.exit(0);
}).catch(err => {
    process.exit(1);
});



// npx tsx lib/init-db.ts