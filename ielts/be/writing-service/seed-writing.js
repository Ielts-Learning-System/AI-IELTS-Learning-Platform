const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TaskSchema = new mongoose.Schema({
  taskNumber: { type: Number, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  minWords: { type: Number, required: true }
});

const WritingTestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  tasks: [TaskSchema]
});

const WritingTest = mongoose.models.WritingTest || mongoose.model('WritingTest', WritingTestSchema);

const mockWriting = {
  title: "Cambridge IELTS Writing Mock Test",
  description: "Bài thi Writing gồm Task 1 và Task 2 chuẩn format.",
  tasks: [
    {
      taskNumber: 1,
      title: "WRITING TASK 1",
      minWords: 150,
      content: `
        <p style="margin-bottom: 15px;">You should spend about 20 minutes on this task.</p>
        
        <div style="border: 2px solid #333; padding: 15px; margin-bottom: 20px;">
          <p style="font-style: italic; font-weight: bold; margin-bottom: 10px;">The chart below shows the number of households in the US by their annual income in 2007, 2011 and 2015.</p>
          <p style="font-style: italic; font-weight: bold;">Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p>
        </div>
        
        <p style="margin-bottom: 20px;">Write at least 150 words.</p>
        
        <img src="http://localhost:3000/api/writing/public/chart.png" alt="Bar Chart US Households Income" style="width: 100%; max-width: 600px; border: 1px solid #ccc; display: block; margin: 0 auto;" />
      `
    },
    {
      taskNumber: 2,
      title: "WRITING TASK 2",
      minWords: 250,
      content: `
        <p style="margin-bottom: 15px;">You should spend about 40 minutes on this task.</p>
        <p style="margin-bottom: 15px;">Write about the following topic:</p>
        
        <div style="border: 2px solid #333; padding: 15px; margin-bottom: 20px;">
          <p style="font-style: italic; font-weight: bold; margin-bottom: 15px;">Some university students want to learn about other subjects in addition to their main subjects. Others believe it is more important to give all their time and attention to studying for a qualification.</p>
          <p style="font-style: italic; font-weight: bold;">Discuss both these views and give your own opinion.</p>
        </div>
        
        <p style="margin-bottom: 15px;">Give reasons for your answer and include any relevant examples from your own knowledge or experience.</p>
        <p>Write at least 250 words.</p>
      `
    }
  ]
};

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await WritingTest.deleteMany({});
    const newTest = new WritingTest(mockWriting);
    await newTest.save();
    console.log(`🎉 Seed Writing thành công! ID: ${newTest._id}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    mongoose.connection.close();
  }
};

seedData();