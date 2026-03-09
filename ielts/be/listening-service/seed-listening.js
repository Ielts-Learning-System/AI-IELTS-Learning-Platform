const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  type: { type: String, enum: ['multiple_choice', 'fill_blank', 'map_labeling', 'matching'], required: true },
  options: [{ type: String }],
  imageUrl: { type: String },
  correctAnswer: { type: String, required: true }
});

const PartSchema = new mongoose.Schema({
  partNumber: { type: Number, required: true },
  title: { type: String, required: true },
  audioUrl: { type: String, required: true },
  description: { type: String },
  questions: [QuestionSchema]
});

const ListeningTestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  parts: [PartSchema]
});

const ListeningTest = mongoose.models.ListeningTest || mongoose.model('ListeningTest', ListeningTestSchema);

const mockListening = {
  title: "Cambridge IELTS Listening Authentic Test",
  description: "Bài thi Listening chuẩn format thực tế 4 Parts kèm file Audio và Map.",
  parts: [
    // ================= PART 1 =================
    {
      partNumber: 1,
      title: "PART 1: Questions 1–10",
      audioUrl: "http://localhost:3000/api/listening/public/audio/18section2-part1.mp3",
      description: `
        <p style="font-style: italic; margin-bottom: 15px;">Complete the notes below.<br>Write <strong>ONE WORD ONLY</strong> for each answer.</p>
        
        <div style="border: 2px solid #333; padding: 20px; margin-bottom: 30px;">
          <h3 style="text-align: center; font-weight: bold; font-size: 1.25rem;">Working at Milo's Restaurants</h3>
          
          <p style="font-weight: bold; margin-top: 15px;">Benefits</p>
          <ul style="list-style-type: disc; margin-left: 20px;">
              <li><strong>1</strong> ........................................ provided for all staff</li>
              <li><strong>2</strong> ........................................ during weekdays at all Milo's Restaurants</li>
              <li><strong>3</strong> ........................................ provided after midnight</li>
          </ul>
          
          <p style="font-weight: bold; margin-top: 15px;">Person specification</p>
          <ul style="list-style-type: disc; margin-left: 20px;">
              <li>must be prepared to work well in a team</li>
              <li>must care about maintaining a high standard of <strong>4</strong> ........................................</li>
              <li>must have a qualification in <strong>5</strong> ........................................</li>
          </ul>
        </div>

        <p style="font-style: italic; margin-bottom: 15px;">Complete the table below.<br>Write <strong>ONE WORD AND/OR A NUMBER</strong> for each answer.</p>
        
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #333; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid #333;">
              <th style="padding: 10px; border-right: 1px solid #333;">Location</th>
              <th style="padding: 10px; border-right: 1px solid #333;">Job title</th>
              <th style="padding: 10px; border-right: 1px solid #333;">Responsibilities include</th>
              <th style="padding: 10px;">Pay and conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #333;">
              <td style="padding: 10px; border-right: 1px solid #333;"><strong>6</strong> .................... Street</td>
              <td style="padding: 10px; border-right: 1px solid #333;">Breakfast supervisor</td>
              <td style="padding: 10px; border-right: 1px solid #333;">Checking portions, etc. are correct<br><br>Making sure <strong>7</strong> .................... is clean</td>
              <td style="padding: 10px;">Starting salary <strong>8</strong> £ .................... per hour<br><br>Start work at 5.30 a.m.</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-right: 1px solid #333;">City Road</td>
              <td style="padding: 10px; border-right: 1px solid #333;">Junior chef</td>
              <td style="padding: 10px; border-right: 1px solid #333;">Supporting senior chefs<br><br>Maintaining stock and organising <strong>9</strong> ....................</td>
              <td style="padding: 10px;">Annual salary £23,000<br><br>No work on a <strong>10</strong> .................... once a month</td>
            </tr>
          </tbody>
        </table>
      `,
      questions: [
        { questionText: "1. Benefits: _____ provided for all staff", type: "fill_blank", correctAnswer: "meals" },
        { questionText: "2. _____ during weekdays at all Milo's Restaurants", type: "fill_blank", correctAnswer: "discount" },
        { questionText: "3. _____ provided after midnight", type: "fill_blank", correctAnswer: "transport" },
        { questionText: "4. maintaining a high standard of _____", type: "fill_blank", correctAnswer: "cleanliness" },
        { questionText: "5. qualification in _____", type: "fill_blank", correctAnswer: "hygiene" },
        { questionText: "6. Location: _____ Street", type: "fill_blank", correctAnswer: "Bridge" },
        { questionText: "7. Making sure _____ is clean", type: "fill_blank", correctAnswer: "kitchen" },
        { questionText: "8. Starting salary £_____ per hour", type: "fill_blank", correctAnswer: "9.50" },
        { questionText: "9. Maintaining stock and organising _____", type: "fill_blank", correctAnswer: "deliveries" },
        { questionText: "10. No work on a _____ once a month", type: "fill_blank", correctAnswer: "Saturday" }
      ]
    },
    
    // ================= PART 2 =================
    {
      partNumber: 2,
      title: "PART 2: Questions 11–20",
      audioUrl: "http://localhost:3000/api/listening/public/audio/18section2-part2.mp3",
      description: `
        <p style="font-style: italic; margin-bottom: 15px;">Choose <strong>TWO</strong> letters, A-E.</p>
        <p>What are the <strong>TWO</strong> main reasons why this site has been chosen for the housing development?</p>
        <ul style="list-style-type: none; margin-bottom: 20px;">
          <li><strong>A</strong> It has suitable geographical features.</li>
          <li><strong>B</strong> There is easy access to local facilities.</li>
          <li><strong>C</strong> It has good connections with the airport.</li>
          <li><strong>D</strong> The land is of little agricultural value.</li>
          <li><strong>E</strong> It will be convenient for workers.</li>
        </ul>

        <p>Which <strong>TWO</strong> aspects of the planned housing development have people given positive feedback about?</p>
        <ul style="list-style-type: none; margin-bottom: 30px;">
          <li><strong>A</strong> the facilities for cyclists</li>
          <li><strong>B</strong> the impact on the environment</li>
          <li><strong>C</strong> the encouragement of good relations between residents</li>
          <li><strong>D</strong> the low cost of all the accommodation</li>
          <li><strong>E</strong> the rural location</li>
        </ul>

        <p style="font-style: italic; margin-bottom: 15px;">Label the map below.<br>Write the correct letter, <strong>A-I</strong>, next to Questions 15-20.</p>
        
        <img src="http://localhost:3000/api/listening/public/images/map.png" alt="Map Labeling" style="width: 100%; max-width: 600px; display: block; margin: 0 auto 20px auto; border: 1px solid #ccc;"/>
      `,
      questions: [
        { questionText: "11. Reason 1 for site choice", type: "multiple_choice", options: ["A", "B", "C", "D", "E"], correctAnswer: "D" },
        { questionText: "12. Reason 2 for site choice", type: "multiple_choice", options: ["A", "B", "C", "D", "E"], correctAnswer: "E" },
        { questionText: "13. Positive feedback 1", type: "multiple_choice", options: ["A", "B", "C", "D", "E"], correctAnswer: "A" },
        { questionText: "14. Positive feedback 2", type: "multiple_choice", options: ["A", "B", "C", "D", "E"], correctAnswer: "C" },
        { questionText: "15. School", type: "map_labeling", options: ["A","B","C","D","E","F","G","H","I"], imageUrl: "http://localhost:3000/api/listening/public/images/map.png", correctAnswer: "H" },
        { questionText: "16. Sports centre", type: "map_labeling", options: ["A","B","C","D","E","F","G","H","I"], correctAnswer: "C" },
        { questionText: "17. Clinic", type: "map_labeling", options: ["A","B","C","D","E","F","G","H","I"], correctAnswer: "F" },
        { questionText: "18. Community centre", type: "map_labeling", options: ["A","B","C","D","E","F","G","H","I"], correctAnswer: "B" },
        { questionText: "19. Supermarket", type: "map_labeling", options: ["A","B","C","D","E","F","G","H","I"], correctAnswer: "D" },
        { questionText: "20. Playground", type: "map_labeling", options: ["A","B","C","D","E","F","G","H","I"], correctAnswer: "I" }
      ]
    },

    // ================= PART 3 =================
    {
      partNumber: 3,
      title: "PART 3: Questions 21–30",
      audioUrl: "http://localhost:3000/api/listening/public/audio/18section2-part3.mp3",
      description: `
        <p style="font-style: italic; margin-bottom: 15px;">Choose the correct letter, <strong>A, B or C</strong>.</p>
        
        <p><strong>21</strong> Why do the students think the Laki eruption of 1783 is so important?</p>
        <ul style="list-style-type: none; margin-bottom: 15px;">
          <li><strong>A</strong> It was the most severe eruption in modern times.</li>
          <li><strong>B</strong> It led to the formal study of volcanoes.</li>
          <li><strong>C</strong> It had a profound effect on society.</li>
        </ul>

        <p><strong>22</strong> What surprised Adam about observations made at the time?</p>
        <ul style="list-style-type: none; margin-bottom: 30px;">
          <li><strong>A</strong> the number of places producing them</li>
          <li><strong>B</strong> the contradictions in them</li>
          <li><strong>C</strong> the lack of scientific data to support them</li>
        </ul>
        
        <p style="font-style: italic; margin-bottom: 15px;">What comment do the students make about the impact of the Laki eruption on the following countries?<br>Choose <strong>FOUR</strong> answers from the box and write the correct letter, <strong>A-F</strong>, next to Questions 27-30.</p>

        <div style="border: 2px solid #333; padding: 15px; margin-bottom: 20px;">
          <h4 style="text-align: center; font-weight: bold; margin-bottom: 10px;">Comments</h4>
          <ul style="list-style-type: none;">
            <li><strong>A</strong> This country suffered the most severe loss of life.</li>
            <li><strong>B</strong> The impact on agriculture was predictable.</li>
            <li><strong>C</strong> There was a significant increase in deaths of young people.</li>
            <li><strong>D</strong> Animals suffered from a sickness.</li>
            <li><strong>E</strong> This country saw the highest rise in food prices in the world.</li>
            <li><strong>F</strong> It caused a particularly harsh winter.</li>
          </ul>
        </div>
      `,
      questions: [
        { questionText: "21. Why do the students think the Laki eruption is so important?", type: "multiple_choice", options: ["A", "B", "C"], correctAnswer: "C" },
        { questionText: "22. What surprised Adam about observations?", type: "multiple_choice", options: ["A", "B", "C"], correctAnswer: "A" },
        { questionText: "23. According to Michelle, what did sources say?", type: "multiple_choice", options: ["A", "B", "C"], correctAnswer: "B" },
        { questionText: "24. Adam corrects Michelle when she claims that Benjamin Franklin:", type: "multiple_choice", options: ["A", "B", "C"], correctAnswer: "C" },
        { questionText: "25. Which issue following the eruption surprised the students? (1)", type: "multiple_choice", options: ["A", "B", "C", "D", "E"], correctAnswer: "A" },
        { questionText: "26. Which issue following the eruption surprised the students? (2)", type: "multiple_choice", options: ["A", "B", "C", "D", "E"], correctAnswer: "E" },
        { questionText: "27. Iceland", type: "matching", options: ["A","B","C","D","E","F"], correctAnswer: "D" },
        { questionText: "28. Egypt", type: "matching", options: ["A","B","C","D","E","F"], correctAnswer: "A" },
        { questionText: "29. UK", type: "matching", options: ["A","B","C","D","E","F"], correctAnswer: "C" },
        { questionText: "30. USA", type: "matching", options: ["A","B","C","D","E","F"], correctAnswer: "F" }
      ]
    },

    // ================= PART 4 =================
    {
      partNumber: 4,
      title: "PART 4: Questions 31–40",
      audioUrl: "http://localhost:3000/api/listening/public/audio/18section2-part4.mp3",
      description: `
        <p style="font-style: italic; margin-bottom: 15px;">Complete the notes below.<br>Write <strong>ONE WORD ONLY</strong> for each answer.</p>
        
        <div style="border: 2px solid #333; padding: 20px;">
          <h3 style="text-align: center; font-weight: bold; font-size: 1.25rem;">Pockets</h3>
          
          <p style="font-weight: bold; margin-top: 15px;">Reason for choice of subject</p>
          <ul style="list-style-type: disc; margin-left: 20px;">
              <li>They are <strong>31</strong> ........................................ but can be overlooked by consumers and designers.</li>
          </ul>

          <p style="font-weight: bold; margin-top: 15px;">Pockets in men's clothes</p>
          <ul style="list-style-type: disc; margin-left: 20px;">
              <li>Men started to wear <strong>32</strong> ........................................ in the 18th century.</li>
              <li>A <strong>33</strong> ........................................ sewed pockets into the lining of the garments.</li>
              <li>The wearer could use the pockets for small items.</li>
              <li>Bigger pockets might be made for men who belonged to a certain type of <strong>34</strong> ........................................ .</li>
          </ul>

          <p style="font-weight: bold; margin-top: 15px;">Pockets in women's clothes</p>
          <ul style="list-style-type: disc; margin-left: 20px;">
              <li>Women's pockets were less <strong>35</strong> ........................................ than men's.</li>
              <li>Women were very concerned about pickpockets.</li>
              <li>Pockets were produced in pairs using <strong>36</strong> ........................................ to link them together.</li>
              <li>Pockets hung from the women's <strong>37</strong> ........................................ under skirts and petticoats.</li>
              <li>Items such as <strong>38</strong> ........................................ could be reached through a gap in the material.</li>
              <li>Pockets, of various sizes, stayed inside clothing for many decades.</li>
              <li>When dresses changed shape, hidden pockets had a negative effect on the <strong>39</strong> ........................................ of women.</li>
              <li>Bags called 'pouches' became popular, before women carried a <strong>40</strong> ........................................ .</li>
          </ul>
        </div>
      `,
      questions: [
        { questionText: "31. They are _____", type: "fill_blank", correctAnswer: "convenient" },
        { questionText: "32. Men started to wear _____", type: "fill_blank", correctAnswer: "suits" },
        { questionText: "33. A _____ sewed pockets into the lining", type: "fill_blank", correctAnswer: "tailor" },
        { questionText: "34. type of _____", type: "fill_blank", correctAnswer: "profession" },
        { questionText: "35. Women's pockets were less _____", type: "fill_blank", correctAnswer: "visible" },
        { questionText: "36. using _____ to link them together", type: "fill_blank", correctAnswer: "string" },
        { questionText: "37. hung from the women's _____", type: "fill_blank", correctAnswer: "waist" },
        { questionText: "38. Items such as _____", type: "fill_blank", correctAnswer: "keys" },
        { questionText: "39. negative effect on the _____ of women", type: "fill_blank", correctAnswer: "figure" },
        { questionText: "40. before women carried a _____", type: "fill_blank", correctAnswer: "handbag" }
      ]
    }
  ]
};

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await ListeningTest.deleteMany({});
    const newTest = new ListeningTest(mockListening);
    await newTest.save();
    console.log(`🎉 Bơm dữ liệu thành công! Đã tạo đề Listening cực xịn. ID: ${newTest._id}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    mongoose.connection.close();
  }
};

seedData();