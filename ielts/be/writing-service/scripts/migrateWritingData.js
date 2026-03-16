/**
 * migrateWritingData.js
 *
 * One-time migration script that:
 *   A) Reads old writingtests & writingitems collections
 *   B) Transforms them into the unified Writing schema
 *   C) Inserts into the new `writings` collection
 *   D) Seeds 2 fresh demo records
 *   E) Drops the old collections
 *
 * Run:  node scripts/migrateWritingData.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Writing = require('../src/models/Writing');

async function migrate() {
  try {
    /* ──────────────────── Connect ──────────────────── */
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    /* ──────────────────── Step A: Read old data ──────────────────── */
    console.log('\n📖 Step A — Reading old collections…');

    const oldTests = await db.collection('writingtests').find().toArray();
    console.log(`   Found ${oldTests.length} document(s) in writingtests`);

    const oldItems = await db.collection('writingitems').find().toArray();
    console.log(`   Found ${oldItems.length} document(s) in writingitems`);

    /* ──────────────────── Step B: Transform ──────────────────── */
    console.log('\n🔄 Step B — Transforming old records…');
    const transformed = [];

    // --- B1: writingtests → each task becomes its own Writing doc ---
    for (const test of oldTests) {
      const tasks = test.tasks || [];
      for (const task of tasks) {
        // Map task.content (raw HTML) → contentHtml
        // Adjust the mapping below if your field names differ
        const doc = {
          title: task.title || `${test.title} – Task ${task.taskNumber}`,
          type: task.taskNumber === 1 ? 'Task 1' : 'Task 2',
          category: task.taskNumber === 1 ? 'Mixed' : 'Mixed',
          contentHtml: task.content, // ← HTML is preserved as-is
          isSample: false,
          tags: [],
        };
        transformed.push(doc);
        console.log(`   ✔ writingtests → "${doc.title}" (${doc.type})`);
      }
    }

    // --- B2: writingitems → map to unified Writing ---
    for (const item of oldItems) {
      const doc = {
        title: item.title,
        type: item.type, // already 'Task 1' | 'Task 2'
        category: item.category || 'Mixed',
        timeLimit: item.timeLimit,
        // Old WritingItem used `prompt` (plain text). Wrap in basic HTML paragraphs.
        contentHtml: item.prompt
          ? item.prompt
              .split(/\n\n+/)
              .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
              .join('\n')
          : '',
        isSample: !!item.isSample,
        tags: item.tags || [],
      };

      // If it's a sample essay, carry over sampleInfo
      if (item.isSample && item.sampleInfo) {
        doc.sampleInfo = {
          bandScore: item.sampleInfo.bandScore,
          // Old field was `content` (plain text) → wrap in HTML paragraphs
          contentHtml: item.sampleInfo.content
            ? item.sampleInfo.content
                .split(/\n\n+/)
                .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
                .join('\n')
            : '',
          author: item.sampleInfo.author || 'IELTS Master',
        };
      }

      transformed.push(doc);
      console.log(`   ✔ writingitems → "${doc.title}" (${doc.type}, sample=${doc.isSample})`);
    }

    /* ──────────────────── Step C: Insert into writings ──────────────────── */
    console.log(`\n💾 Step C — Inserting ${transformed.length} transformed document(s)…`);

    // Clear any existing data in the target collection first
    await Writing.deleteMany({});
    console.log('   Cleared existing writings collection');

    if (transformed.length > 0) {
      const inserted = await Writing.insertMany(transformed);
      console.log(`   ✅ Inserted ${inserted.length} document(s) into writings`);
    } else {
      console.log('   ⚠  No old data to migrate');
    }

    /* ──────────────────── Step D: Seed fresh demo records ──────────────────── */
    console.log('\n🌱 Step D — Seeding 2 fresh demo records…');

    const demoRecords = [
      {
        title: 'WRITING TASK 1 – Bar Chart: US Household Income',
        type: 'Task 1',
        category: 'Bar Chart',
        contentHtml: `
          <p style="margin-bottom: 15px;">You should spend about <strong>20 minutes</strong> on this task.</p>
          <div style="border: 2px solid #333; padding: 15px; margin-bottom: 20px;">
            <p style="font-style: italic; font-weight: bold; margin-bottom: 10px;">
              The chart below shows the number of households in the US by their annual income in 2007, 2011 and 2015.
            </p>
            <p style="font-style: italic; font-weight: bold;">
              Summarise the information by selecting and reporting the main features, and make comparisons where relevant.
            </p>
          </div>
          <p style="margin-bottom: 20px;">Write at least <strong>150 words</strong>.</p>
          <img src="http://localhost:3000/api/writing/public/chart.png"
               alt="Bar Chart US Households Income"
               style="width: 100%; max-width: 600px; border: 1px solid #ccc; display: block; margin: 0 auto;" />
        `,
        isSample: false,
        tags: ['Academic', 'Data'],
      },
      {
        title: 'WRITING TASK 2 – Discussion: University Subjects',
        type: 'Task 2',
        category: 'Discussion Essay',
        contentHtml: `
          <p style="margin-bottom: 15px;">You should spend about <strong>40 minutes</strong> on this task.</p>
          <p style="margin-bottom: 15px;">Write about the following topic:</p>
          <div style="border: 2px solid #333; padding: 15px; margin-bottom: 20px;">
            <p style="font-style: italic; font-weight: bold; margin-bottom: 15px;">
              Some university students want to learn about other subjects in addition to their main subjects.
              Others believe it is more important to give all their time and attention to studying for a qualification.
            </p>
            <p style="font-style: italic; font-weight: bold;">
              Discuss both these views and give your own opinion.
            </p>
          </div>
          <p style="margin-bottom: 15px;">Give reasons for your answer and include any relevant examples from your own knowledge or experience.</p>
          <p>Write at least <strong>250 words</strong>.</p>
        `,
        isSample: false,
        tags: ['Opinion', 'Education'],
      },
    ];

    const seeded = await Writing.insertMany(demoRecords);
    console.log(`   ✅ Seeded ${seeded.length} demo document(s)`);
    seeded.forEach((d) => console.log(`      • [${d.type}] ${d.title}`));

    /* ──────────────────── Step E: Drop old collections ──────────────────── */
    console.log('\n🗑  Step E — Dropping old collections…');

    const collections = (await db.listCollections().toArray()).map((c) => c.name);

    if (collections.includes('writingtests')) {
      await db.dropCollection('writingtests');
      console.log('   ✅ Dropped writingtests');
    } else {
      console.log('   ⚠  writingtests not found (already dropped?)');
    }

    if (collections.includes('writingitems')) {
      await db.dropCollection('writingitems');
      console.log('   ✅ Dropped writingitems');
    } else {
      console.log('   ⚠  writingitems not found (already dropped?)');
    }

    console.log('\n🎉 Migration complete!');
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

migrate();
