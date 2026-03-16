const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const WritingItem = require('./src/models/WritingItem');

const seedItems = [
    // ── Practice Tests ──────────────────────────────────────
    {
        title: 'Line Graph – US Household Income',
        type: 'Task 1',
        category: 'Line Graph',
        prompt:
            'The chart below shows the number of households in the US by their annual income in 2007, 2011 and 2015.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
        imageUrls: ['http://localhost:3000/api/writing/public/chart.png'],
        isSample: false,
        tags: ['Academic', 'Data'],
    },
    {
        title: 'Agree or Disagree – Technology in Education',
        type: 'Task 2',
        category: 'Opinion Essay',
        prompt:
            'Some people believe that technology has made education easier and more accessible, while others argue that it has created more problems than it has solved.\n\nTo what extent do you agree or disagree?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
        isSample: false,
        tags: ['Opinion', 'Education', 'Technology'],
    },
    {
        title: 'Bar Chart – Energy Consumption',
        type: 'Task 1',
        category: 'Bar Chart',
        prompt:
            'The bar chart below shows the total energy consumption in three European countries from 2005 to 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
        isSample: false,
        tags: ['Academic', 'Environment'],
    },
    {
        title: 'Discussion – Urbanization vs. Rural Life',
        type: 'Task 2',
        category: 'Discussion Essay',
        prompt:
            'More and more people are choosing to live in large cities rather than in rural areas.\n\nDiscuss the advantages and disadvantages of this trend.\n\nGive reasons for your answer and include any relevant examples.\n\nWrite at least 250 words.',
        isSample: false,
        tags: ['Society', 'Urban'],
    },

    // ── Sample Essays ───────────────────────────────────────
    {
        title: 'Pie Chart – UK Household Expenditure',
        type: 'Task 1',
        category: 'Pie Chart',
        prompt:
            'The pie charts below compare the average household expenditure in the UK in 1990 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        isSample: true,
        sampleInfo: {
            bandScore: 8.0,
            content:
                'The two pie charts illustrate how average household spending in the UK changed between 1990 and 2020.\n\nOverall, while housing remained the largest expense in both years, the proportion spent on technology increased dramatically, whereas spending on food and clothing declined.\n\nIn 1990, housing accounted for 30% of total expenditure, making it the biggest category. Food was the second-largest at 25%, followed by transport at 18%. Clothing and technology comprised 15% and 2% respectively, with the remaining 10% going to other items.\n\nBy 2020, housing had risen slightly to 33%. The most striking change was in technology, which surged to 14%. In contrast, food dropped to 18% and clothing fell to 8%. Transport remained relatively stable at 17%, while other expenses grew to 10%.\n\nIn summary, the data reveals a clear shift towards technology-related spending at the expense of traditional categories like food and clothing over the three-decade period.',
            author: 'Ex-Examiner',
        },
        tags: ['Academic', 'Data'],
    },
    {
        title: 'Opinion Essay – Space Exploration',
        type: 'Task 2',
        category: 'Opinion Essay',
        prompt:
            'Some people think that space exploration is a waste of resources, while others believe it is essential for the future of humanity.\n\nDiscuss both views and give your own opinion.',
        isSample: true,
        sampleInfo: {
            bandScore: 7.5,
            content:
                'Space exploration has been a topic of intense debate ever since the first satellite was launched into orbit. While critics argue that the enormous financial resources dedicated to space missions could be better spent on pressing terrestrial problems, proponents contend that the long-term benefits of exploring the cosmos far outweigh the costs.\n\nOn one hand, opponents of space exploration point to the billions of dollars spent on missions that often yield no immediate practical benefit. They argue that these funds could be redirected towards healthcare, education, or combating poverty. For instance, a single Mars mission can cost upwards of $2 billion, which could fund thousands of schools in developing nations.\n\nOn the other hand, supporters emphasise that space research has led to countless technological innovations that benefit daily life, from GPS systems to water purification technology. Furthermore, as Earth\'s resources become increasingly scarce, the ability to mine asteroids or establish colonies on other planets could prove vital for humanity\'s survival.\n\nIn my opinion, while it is crucial to address immediate societal needs, investing in space exploration is equally important. A balanced approach that allocates funding to both areas would be the most pragmatic solution.\n\nIn conclusion, space exploration should not be viewed as a luxury but as a necessary investment in our collective future.',
            author: 'IELTS Master',
        },
        tags: ['Opinion', 'Science'],
    },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        await WritingItem.deleteMany({});
        console.log('🗑  Cleared existing WritingItem documents');

        const docs = [];

        for (const item of seedItems) {
            const doc = await WritingItem.create(item);
            docs.push(doc);
        }
        console.log(`🎉 Seeded ${docs.length} WritingItem documents:`);
        docs.forEach((d) => console.log(`   • [${d.type}] ${d.title} (sample=${d.isSample})`));
    } catch (err) {
        console.error('❌ Seed error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected');
    }
}

seed();
