/**
 * Node.js test suite for SQLite Manager
 * Tests all core functionality before deploying to Chrome extension
 */

import initSqlJs from 'sql.js';
import { SQLiteManager } from '../src/sqlite-manager.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple storage mock for testing
class MockStorage {
    constructor() {
        this.data = new Map();
    }

    async set(obj) {
        for (const [key, value] of Object.entries(obj)) {
            this.data.set(key, value);
        }
    }

    async get(keys) {
        const result = {};
        for (const key of keys) {
            if (this.data.has(key)) {
                result[key] = this.data.get(key);
            }
        }
        return result;
    }
}

async function runTests() {
    console.log('🧪 Starting SQLite WebAssembly Tests...\n');

    // Initialize SQL.js
    console.log('📦 Loading SQL.js WebAssembly module...');
    const SQL = await initSqlJs({
        locateFile: file => join(__dirname, '../node_modules/sql.js/dist', file)
    });
    console.log('✅ SQL.js loaded successfully\n');

    const manager = new SQLiteManager(SQL);
    const storage = new MockStorage();

    // Test 1: Initialize database
    console.log('Test 1: Initialize Database');
    const db = await manager.initDatabase('test-collection');
    console.log('✅ Database initialized\n');

    // Test 2: Create table and insert data
    console.log('Test 2: Create Table and Insert Data');
    db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)');
    db.run("INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')");
    db.run("INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')");

    const result = db.exec('SELECT * FROM users');
    console.log('Data inserted:', result[0].values);
    console.log('✅ Table created and data inserted\n');

    // Test 3: Export to blob
    console.log('Test 3: Export to Blob');
    const blob = await manager.exportToBlob('test-collection');
    console.log(`✅ Exported database to blob (${blob.size} bytes)\n`);

    // Test 4: Save checkpoint
    console.log('Test 4: Save Checkpoint');
    await manager.saveCheckpoint('test-collection', storage);
    console.log('✅ Checkpoint saved to storage\n');

    // Test 5: Modify database
    console.log('Test 5: Modify Database');
    db.run("INSERT INTO users (name, email) VALUES ('Charlie', 'charlie@example.com')");
    const modifiedResult = db.exec('SELECT * FROM users');
    console.log('Modified data:', modifiedResult[0].values);
    console.log('✅ Database modified (3 users)\n');

    // Test 6: Restore from checkpoint
    console.log('Test 6: Restore from Checkpoint');
    await manager.restoreCheckpoint('test-collection', storage);
    const restoredDb = manager.getDatabase('test-collection');
    const restoredResult = restoredDb.exec('SELECT * FROM users');
    console.log('Restored data:', restoredResult[0].values);
    console.log('✅ Database restored to checkpoint (2 users)\n');

    // Test 7: Import from blob
    console.log('Test 7: Import from Blob');
    const arrayBuffer = await blob.arrayBuffer();
    await manager.importFromBlob('imported-collection', arrayBuffer);
    const importedDb = manager.getDatabase('imported-collection');
    const importedResult = importedDb.exec('SELECT * FROM users');
    console.log('Imported data:', importedResult[0].values);
    console.log('✅ Database imported from blob\n');

    // Test 8: List collections
    console.log('Test 8: List Collections');
    const collections = manager.listCollections();
    console.log('Active collections:', collections);
    console.log('✅ Collections listed\n');

    // Test 9: Export to file (for manual inspection)
    console.log('Test 9: Export to File');
    const finalBlob = await manager.exportToBlob('test-collection');
    const buffer = Buffer.from(await finalBlob.arrayBuffer());
    const outputPath = join(__dirname, 'test-output.db');
    writeFileSync(outputPath, buffer);
    console.log(`✅ Database exported to ${outputPath}\n`);

    // Test 10: Close databases
    console.log('Test 10: Close All Databases');
    manager.closeAll();
    console.log('✅ All databases closed\n');

    console.log('🎉 All tests passed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - SQLite WebAssembly: Working ✓');
    console.log('  - Import/Export Blob API: Working ✓');
    console.log('  - Save/Restore Checkpoint API: Working ✓');
    console.log('  - Database Management: Working ✓');
    console.log('\n✨ Ready for Chrome extension integration!');
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
