export const mockReadingExam = {
  id: 'read-001',
  title: 'Cambridge IELTS 18 - Test 1 - Reading Passage 1',
  durationMinutes: 60,
  passage: `
# Urban Farming

Urban farming is the practice of cultivating, processing, and distributing food in or around urban areas. It encompasses a complex and diverse mix of food production activities, including fisheries and forestry, in many cities and towns. Urban agriculture contributes to food security and food safety in two ways: first, it increases the amount of food available to people living in cities, and, second, it allows fresh vegetables and fruits and meat products to be made available to urban consumers.

A common and efficient form of urban agriculture is the community garden. These are plots of land, often public or rented, where community members can grow their own produce. Another growing trend is vertical farming, which involves growing crops in vertically stacked layers, often incorporating controlled-environment agriculture, which aims to optimize plant growth, and soilless farming techniques such as hydroponics, aquaponics, and aeroponics.

While urban farming offers numerous benefits, it also faces significant challenges. Space is at a premium in cities, making it difficult to find suitable land. Soil contamination is another major concern, as urban soils can contain heavy metals and other pollutants. Additionally, the initial setup costs for advanced systems like vertical farms can be prohibitively high.
  `,
  questions: [
    {
      id: 'q1',
      type: 'MULTIPLE_CHOICE',
      text: 'What is a common form of urban agriculture mentioned in the text?',
      options: ['Rooftop beekeeping', 'Community gardens', 'Industrial farming', 'Deep-sea fishing'],
    },
    {
      id: 'q2',
      type: 'TRUE_FALSE_NOT_GIVEN',
      text: 'Vertical farming always uses soil to grow crops.',
      options: ['True', 'False', 'Not Given'],
    },
    {
      id: 'q3',
      type: 'MATCHING_HEADING',
      text: 'Choose the correct heading for the third paragraph.',
      options: ['The Benefits of Urban Farming', 'Challenges Faced by Urban Farmers', 'The History of Agriculture', 'Future Technologies'],
    }
  ]
};

export const mockDashboardStats = [
  { subject: 'Listening', A: 7.5, fullMark: 9 },
  { subject: 'Reading', A: 8.0, fullMark: 9 },
  { subject: 'Writing', A: 6.5, fullMark: 9 },
  { subject: 'Speaking', A: 7.0, fullMark: 9 },
];
