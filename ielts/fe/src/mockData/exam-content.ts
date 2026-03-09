export type QuestionType = 
  | 'MULTIPLE_CHOICE' 
  | 'FILL_IN_BLANKS' 
  | 'MATCHING' 
  | 'TRUE_FALSE_NOT_GIVEN' 
  | 'YES_NO_NOT_GIVEN' 
  | 'MATCHING_HEADINGS' 
  | 'MAP_LABELING' 
  | 'FORM_FILLING';

export interface BaseQuestion {
  id: string;
  number: number;
  type: QuestionType;
  text: string;
  options?: string[];
}

export interface ListeningQuestion extends BaseQuestion {
  timestamp?: string;
}

export interface ListeningSection {
  section_number: number;
  audio_url: string;
  transcript: string;
  questions: ListeningQuestion[];
}

export interface ListeningTest {
  id: string;
  title: string;
  sections: ListeningSection[];
}

export interface ReadingQuestionGroup {
  group_id: string;
  instruction: string;
  type: QuestionType;
  questions: BaseQuestion[];
}

export interface ReadingPassage {
  passage_number: number;
  title: string;
  content: string[];
  question_groups: ReadingQuestionGroup[];
}

export interface ReadingTest {
  id: string;
  title: string;
  passages: ReadingPassage[];
}

export interface SpeakingPart1 {
  topic: string;
  questions: string[];
}

export interface SpeakingPart2 {
  topic: string;
  points_to_cover: string[];
  preparation_time_seconds: number;
}

export interface SpeakingPart3 {
  topic: string;
  questions: string[];
}

export interface SpeakingTest {
  id: string;
  title: string;
  part_1: SpeakingPart1[];
  part_2: SpeakingPart2;
  part_3: SpeakingPart3;
}

export interface WritingTask1 {
  type: 'BAR' | 'LINE' | 'PIE' | 'MAP' | 'PROCESS' | 'TABLE' | 'MIXED';
  image_url: string;
  prompt: string;
  sample_answer: string;
}

export interface WritingTask2 {
  type: 'AGREE_DISAGREE' | 'DISCUSSION' | 'PROBLEM_SOLUTION' | 'ADVANTAGE_DISADVANTAGE' | 'TWO_PART';
  prompt: string;
  sample_answer: string;
}

export interface WritingTest {
  id: string;
  title: string;
  task_1: WritingTask1;
  task_2: WritingTask2;
}

export interface AIEvaluationCriteria {
  score: number;
  feedback: string;
}

export interface AIEvaluation {
  overall_band: number;
  task_response: AIEvaluationCriteria;
  coherence_cohesion: AIEvaluationCriteria;
  lexical_resource: AIEvaluationCriteria;
  grammatical_range_accuracy: AIEvaluationCriteria;
  detailed_comments: string[];
}

export const mockListeningTest: ListeningTest = {
  id: 'list-001',
  title: 'Cambridge IELTS 18 - Listening Test 1',
  sections: [
    {
      section_number: 1,
      audio_url: 'https://example.com/audio/listening-sec1.mp3',
      transcript: 'Agent: Good morning, City Transport. How can I help you?\nCaller: Hello, I\'d like to ask about the bus services to the airport...',
      questions: [
        { id: 'lq1', number: 1, type: 'FORM_FILLING', text: 'Destination: The 1 ________', timestamp: '00:15' },
        { id: 'lq2', number: 2, type: 'FORM_FILLING', text: 'Bus number: 2 ________', timestamp: '00:30' }
      ]
    },
    {
      section_number: 2,
      audio_url: 'https://example.com/audio/listening-sec2.mp3',
      transcript: 'Welcome to the City Museum. Let me show you the map of the ground floor...',
      questions: [
        { id: 'lq3', number: 3, type: 'MAP_LABELING', text: 'Gift Shop', options: ['A', 'B', 'C', 'D'], timestamp: '01:45' },
        { id: 'lq4', number: 4, type: 'MAP_LABELING', text: 'Cafe', options: ['A', 'B', 'C', 'D'], timestamp: '02:10' }
      ]
    },
    {
      section_number: 3,
      audio_url: 'https://example.com/audio/listening-sec3.mp3',
      transcript: 'Student A: So, what did you think about the lecture on renewable energy?\nStudent B: It was quite interesting, especially the part about solar panels...',
      questions: [
        { id: 'lq5', number: 5, type: 'MULTIPLE_CHOICE', text: 'What do the students agree about the solar panel project?', options: ['It is too expensive.', 'It requires more research.', 'It is highly effective.'], timestamp: '03:20' }
      ]
    },
    {
      section_number: 4,
      audio_url: 'https://example.com/audio/listening-sec4.mp3',
      transcript: 'Today we will discuss the migration patterns of the Monarch butterfly...',
      questions: [
        { id: 'lq6', number: 6, type: 'FILL_IN_BLANKS', text: 'The butterflies travel up to 6 ________ miles.', timestamp: '05:00' }
      ]
    }
  ]
};

export const mockReadingTest: ReadingTest = {
  id: 'read-001',
  title: 'Cambridge IELTS 18 - Reading Test 1',
  passages: [
    {
      passage_number: 1,
      title: 'The History of Chocolate',
      content: [
        'Chocolate has a rich history that dates back thousands of years. The ancient Maya and Aztec civilizations in Mesoamerica were among the first to cultivate the cacao tree.',
        'They consumed chocolate as a bitter beverage, often mixed with spices or corn puree. It was believed to have aphrodisiac properties and give the drinker strength.',
        'When the Spanish conquistadors arrived in the 16th century, they brought cacao beans back to Europe. There, sugar and honey were added to counteract the natural bitterness.'
      ],
      question_groups: [
        {
          group_id: 'rg1',
          instruction: 'Do the following statements agree with the information given in Reading Passage 1?',
          type: 'TRUE_FALSE_NOT_GIVEN',
          questions: [
            { id: 'rq1', number: 1, type: 'TRUE_FALSE_NOT_GIVEN', text: 'The Maya were the only civilization to cultivate cacao.', options: ['True', 'False', 'Not Given'] },
            { id: 'rq2', number: 2, type: 'TRUE_FALSE_NOT_GIVEN', text: 'Chocolate was originally consumed as a sweet drink.', options: ['True', 'False', 'Not Given'] }
          ]
        },
        {
          group_id: 'rg2',
          instruction: 'Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
          type: 'FILL_IN_BLANKS',
          questions: [
            { id: 'rq3', number: 3, type: 'FILL_IN_BLANKS', text: 'The ancient civilizations consumed chocolate as a 3 ________ beverage.' }
          ]
        }
      ]
    },
    {
      passage_number: 2,
      title: 'The Psychology of Innovation',
      content: [
        'Innovation is often seen as the key to success in modern business. However, the psychological factors that drive innovation are complex and multifaceted.',
        'One crucial element is a culture that encourages risk-taking and tolerates failure. Employees must feel safe to propose unconventional ideas without fear of ridicule.',
        'Furthermore, diversity within teams can significantly enhance creative problem-solving by bringing together different perspectives and experiences.'
      ],
      question_groups: [
        {
          group_id: 'rg3',
          instruction: 'Choose the correct heading for each paragraph from the list of headings below.',
          type: 'MATCHING_HEADINGS',
          questions: [
            { id: 'rq4', number: 4, type: 'MATCHING_HEADINGS', text: 'Paragraph A', options: ['i. The importance of diversity', 'ii. Creating a safe environment', 'iii. The complexity of innovation'] },
            { id: 'rq5', number: 5, type: 'MATCHING_HEADINGS', text: 'Paragraph B', options: ['i. The importance of diversity', 'ii. Creating a safe environment', 'iii. The complexity of innovation'] }
          ]
        }
      ]
    },
    {
      passage_number: 3,
      title: 'Climate Change and Ocean Currents',
      content: [
        'Ocean currents play a vital role in regulating the Earth\'s climate. They act as a global conveyor belt, transporting warm water from the equator towards the poles and cold water back towards the equator.',
        'Recent studies suggest that global warming may be disrupting these currents. The melting of polar ice caps introduces large amounts of freshwater into the oceans, which can alter the density of the water and slow down the currents.',
        'If the ocean conveyor belt were to stop completely, it could have catastrophic consequences for the global climate, leading to extreme weather patterns and significant temperature drops in certain regions.'
      ],
      question_groups: [
        {
          group_id: 'rg4',
          instruction: 'Choose the correct letter, A, B, C or D.',
          type: 'MULTIPLE_CHOICE',
          questions: [
            { id: 'rq6', number: 6, type: 'MULTIPLE_CHOICE', text: 'What is the main function of ocean currents according to the passage?', options: ['A. To transport freshwater', 'B. To regulate the Earth\'s climate', 'C. To melt polar ice caps', 'D. To create extreme weather'] }
          ]
        },
        {
          group_id: 'rg5',
          instruction: 'Do the following statements agree with the views of the writer in Reading Passage 3?',
          type: 'YES_NO_NOT_GIVEN',
          questions: [
            { id: 'rq7', number: 7, type: 'YES_NO_NOT_GIVEN', text: 'The melting of polar ice caps increases the density of ocean water.', options: ['Yes', 'No', 'Not Given'] }
          ]
        }
      ]
    }
  ]
};

export const mockSpeakingTest: SpeakingTest = {
  id: 'speak-001',
  title: 'IELTS Speaking Practice Test 1',
  part_1: [
    {
      topic: 'Work or Study',
      questions: [
        'Do you work or are you a student?',
        'What do you like about your job/studies?',
        'What is the most difficult part of your job/studies?'
      ]
    },
    {
      topic: 'Hometown',
      questions: [
        'Where is your hometown?',
        'What do you like most about your hometown?',
        'Has your hometown changed much since you were a child?'
      ]
    }
  ],
  part_2: {
    topic: 'Describe a memorable journey you have made.',
    points_to_cover: [
      'Where you went',
      'How you travelled',
      'Who you went with',
      'And explain why this journey was so memorable.'
    ],
    preparation_time_seconds: 60
  },
  part_3: {
    topic: 'Travel and Tourism',
    questions: [
      'Why do people like to travel?',
      'How has tourism changed in your country in recent years?',
      'What are the environmental impacts of tourism?'
    ]
  }
};

export const mockWritingTest: WritingTest = {
  id: 'write-001',
  title: 'Cambridge IELTS 18 - Writing Test 1',
  task_1: {
    type: 'BAR',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
    prompt: 'The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    sample_answer: 'The bar chart illustrates the changing patterns of home ownership and renting in England and Wales over a period of 93 years, from 1918 to 2011.\n\nOverall, it is clear that the proportion of households in rented accommodation experienced a significant decline over the period, while the percentage of homeowners saw a corresponding increase. By the end of the period, owning a home had become the most common type of housing tenure.\n\nIn 1918, the vast majority of households (nearly 80%) lived in rented accommodation. This figure steadily decreased over the following decades, falling to around 30% by 2001, before rising slightly to roughly 35% in 2011.\n\nConversely, home ownership was relatively uncommon in 1918, accounting for just over 20% of households. However, this trend reversed dramatically over the century. The percentage of homeowners grew consistently, surpassing the proportion of renters in the 1970s. The upward trajectory continued until it peaked at nearly 70% in 2001, before experiencing a slight dip to approximately 65% in 2011.'
  },
  task_2: {
    type: 'AGREE_DISAGREE',
    prompt: 'Some people think that the increasing use of technology in the workplace has made it more difficult for people to maintain a good work-life balance. To what extent do you agree or disagree?',
    sample_answer: 'The pervasive integration of technology into the modern workplace has undoubtedly transformed how we work. While some argue that this technological advancement has blurred the boundaries between professional and personal life, making a healthy work-life balance harder to achieve, I largely agree with this perspective, although technology can also offer solutions if managed effectively.\n\nOne of the primary reasons technology disrupts work-life balance is the expectation of constant connectivity. Smartphones and laptops allow employees to access emails and work-related platforms at any time and from anywhere. This constant accessibility often creates an implicit pressure to respond to messages outside of traditional working hours, leading to a phenomenon known as "technostress." Consequently, individuals find it increasingly difficult to disconnect and fully engage in personal activities or family time, as the office is always just a notification away.\n\nFurthermore, the rise of remote work, facilitated by technology, has physically merged the home and the workplace. While this offers flexibility, it can also make it challenging to establish clear boundaries. Without the physical separation of commuting to an office, the psychological transition between "work mode" and "home mode" becomes blurred. Employees may find themselves working longer hours simply because their workspace is readily available in their living environment.\n\nHowever, it is important to acknowledge that technology can also be a tool for improving work-life balance. Flexible working arrangements, enabled by video conferencing and collaborative software, allow individuals to tailor their schedules to accommodate personal commitments. Moreover, productivity apps and automation tools can streamline tasks, potentially reducing overall working hours.\n\nIn conclusion, while technology has the potential to enhance flexibility, its current application in many workplaces often exacerbates the challenge of maintaining a healthy work-life balance. The expectation of constant availability and the blurring of physical boundaries are significant issues. To mitigate these negative effects, both employers and employees must establish clear boundaries and utilize technology purposefully, rather than allowing it to dictate their lives.'
  }
};

export const mockAIEvaluation: AIEvaluation = {
  overall_band: 8.0,
  task_response: {
    score: 8.0,
    feedback: 'The essay fully addresses all parts of the prompt. It presents a clear and well-developed position throughout the response. Ideas are relevant and supported with appropriate examples (e.g., constant connectivity, remote work).'
  },
  coherence_cohesion: {
    score: 8.0,
    feedback: 'The essay sequences information and ideas logically. Paragraphing is used sufficiently and appropriately. Cohesive devices are used effectively (e.g., "Furthermore", "However", "In conclusion").'
  },
  lexical_resource: {
    score: 8.0,
    feedback: 'A wide range of vocabulary is used fluently and flexibly to convey precise meanings (e.g., "pervasive integration", "implicit pressure", "technostress"). Occasional inaccuracies in word choice do not impede communication.'
  },
  grammatical_range_accuracy: {
    score: 8.0,
    feedback: 'A wide range of structures is used with full flexibility and accuracy. The majority of sentences are error-free. Punctuation is well-controlled.'
  },
  detailed_comments: [
    'Paragraph 1: Excellent introduction that clearly states your position.',
    'Paragraph 2: Strong argument regarding "technostress" and constant connectivity.',
    'Paragraph 3: Good point about the blurring of physical boundaries due to remote work.',
    'Paragraph 4: Acknowledging the counter-argument adds depth to your essay.',
    'Paragraph 5: A strong conclusion that summarizes the main points effectively.'
  ]
};
