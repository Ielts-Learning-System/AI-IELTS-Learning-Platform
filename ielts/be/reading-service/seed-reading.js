const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); 

const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  type: { type: String, enum: ['multiple_choice', 'true_false_ng', 'matching', 'fill_blank'], required: true },
  options: [{ type: String }],
  correctAnswer: { type: String, required: true }
});

const PassageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true }, // Sẽ chứa chuỗi HTML định dạng
  questions: [QuestionSchema]
});

const ReadingTestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  passages: [PassageSchema]
});

const ReadingTest = mongoose.models.ReadingTest || mongoose.model('ReadingTest', ReadingTestSchema);

// DỮ LIỆU BÀI THI THẬT ĐƯỢC FORMAT BẰNG HTML
const mockTest = {
  title: "IELTS Academic Reading - Practice Test 1",
  description: "Bài thi chuẩn format Cambridge. Passage 1 có 13 câu hỏi.",
  passages: [
    {
      title: "The Making of the London Underground",
      // Dùng backtick (`) để viết chuỗi HTML nhiều dòng cực đẹp
      content: `
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 24px; font-weight: bold;">The Making of the London Underground</h2>
          <p style="font-style: italic; color: #555;">The idea for an underground railway was first proposed in the 1830s.</p>
        </div>

        <p style="text-align: justify; margin-bottom: 15px;">
          <strong>A.</strong> In the first half of the 1800s, London’s population grew at an astonishing rate, and the central area became increasingly congested. In addition, the expansion of the overground railway network resulted in more and more passengers arriving in the capital. However, in 1846, a Royal Commission decided that the railways should not be allowed to enter the City, the capital’s historic and commercial centre. The result was that the overground railway stations formed a ring around the City. The area within consisted of poorly built, overcrowded slums and the streets were full of horse-drawn traffic.
        </p>

        <p style="text-align: justify; margin-bottom: 15px;">
          <strong>B.</strong> Charles Pearson, a solicitor for the City of London, saw both social and economic advantages in building an underground railway that would link the overground railway stations together and clear London slums at the same time. His idea was to relocate the poor workers who lived in the inner-city slums to newly constructed suburbs, and to provide cheap rail travel for them to get to work. Pearson’s ideas gained support amongst some businessmen and in 1851 he submitted a plan to Parliament. It was rejected, but coincided with a proposal from another group for an underground connecting line.
        </p>

        <p style="text-align: justify; margin-bottom: 15px;">
          <strong>C.</strong> The two groups merged and established the Metropolitan Railway Company in August 1854. The company’s plan was to construct an underground railway line from the Great Western Railway’s (GWR) station at Paddington to the edge of the City at Farringdon Street – a distance of almost five kilometres. The organisation had difficulty in raising the funding for such a radical and expensive scheme. However, Pearson and his partners persisted.
        </p>

        <p style="text-align: justify; margin-bottom: 15px;">
          <strong>D.</strong> The chosen route ran beneath existing main roads to minimise the demolition of buildings. Originally scheduled to be completed in 21 months, the construction of the underground line took three years. It was built just below street level using a technique known as ‘cut and cover’. A trench about ten metres wide and six metres deep was dug, and the sides were supported by brick walls. Finally, a brick arch was added to create a tunnel, and a two-metre-deep layer of soil was laid on top.
        </p>

        <p style="text-align: justify; margin-bottom: 15px;">
          <strong>E.</strong> The Metropolitan line, which opened on 10 January 1863, was the world’s first underground railway. On its first day, almost 40,000 passengers were carried between Paddington and Farringdon. The journey took about 18 minutes. By the end of the Metropolitan’s first year of operation, 9.5 million journeys had been made. Even as the Metropolitan began operation, the first extensions to the line were being authorised.
        </p>
      `,
      questions: [
        // Dạng 1: TRUE / FALSE / NOT GIVEN
        {
          questionText: "The population of London expanded rapidly during the first half of the 19th century.",
          type: "true_false_ng",
          options: ["True", "False", "Not Given"],
          correctAnswer: "True"
        },
        {
          questionText: "Charles Pearson’s 1851 plan for an underground railway was accepted by Parliament.",
          type: "true_false_ng",
          options: ["True", "False", "Not Given"],
          correctAnswer: "False"
        },
        {
          questionText: "The 'cut and cover' method of construction was more expensive than tunneling deep underground.",
          type: "true_false_ng",
          options: ["True", "False", "Not Given"],
          correctAnswer: "Not Given"
        },
        {
          questionText: "The Metropolitan line was the first underground railway in the world.",
          type: "true_false_ng",
          options: ["True", "False", "Not Given"],
          correctAnswer: "True"
        },
        // Dạng 2: MULTIPLE CHOICE
        {
          questionText: "What was the main problem in central London in the first half of the 1800s?",
          type: "multiple_choice",
          options: [
            "A lack of available jobs",
            "Severe traffic congestion and overcrowding",
            "Too many railway stations being built",
            "A decline in commercial activity"
          ],
          correctAnswer: "Severe traffic congestion and overcrowding"
        },
        {
          questionText: "What was Charles Pearson’s dual purpose for the underground railway?",
          type: "multiple_choice",
          options: [
            "To build new stations and destroy the slums",
            "To connect stations and relocate poor workers to the suburbs",
            "To generate profit for businessmen and the Parliament",
            "To stop horse-drawn traffic entering the City"
          ],
          correctAnswer: "To connect stations and relocate poor workers to the suburbs"
        },
        // Dạng 3: FILL IN THE BLANKS (Yêu cầu điền 1 từ)
        {
          questionText: "The two groups merged to form the ________ Railway Company in 1854.",
          type: "fill_blank",
          options: [],
          correctAnswer: "Metropolitan"
        },
        {
          questionText: "The construction technique used to build the tunnel was called 'cut and ________'.",
          type: "fill_blank",
          options: [],
          correctAnswer: "cover"
        },
        {
          questionText: "On the opening day, the train journey from Paddington to Farringdon took roughly ________ minutes.",
          type: "fill_blank",
          options: [],
          correctAnswer: "18"
        }
      ]
    }
  ]
};

const seedData = async () => {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    await ReadingTest.deleteMany({}); 
    const newTest = new ReadingTest(mockTest);
    await newTest.save();
    console.log(`🎉 Bơm dữ liệu thành công! Đã tạo đề thi Reading THẬT.`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedData();