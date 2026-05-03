from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


def to_json(value) -> str:
    return json.dumps(value, ensure_ascii=False)


def build_reading_passage_text(test_num: int, passage_num: int, start_q: int, end_q: int) -> str:
    theme_bank = {
        1: "Urban Farming and Food Security",
        2: "The Evolution of Scientific Illustration",
        3: "Restoring Coastal Wetlands",
    }
    title = theme_bank.get(passage_num, f"Academic Theme {passage_num}")
    return (
        f"<h3><strong>READING PASSAGE {passage_num}</strong></h3>"
        f"<h4><strong>{title} (Test {test_num})</strong></h4>"
        "<p><strong>You should spend about 20 minutes on Questions "
        f"{start_q}-{end_q}.</strong></p>"
        "<p><strong>Paragraph A</strong> introduces the context, defining key terms and outlining the scope of the issue in an academic tone.</p>"
        "<p><strong>Paragraph B</strong> presents historical evidence and competing viewpoints from early researchers.</p>"
        "<p><strong>Paragraph C</strong> compares modern methods, including fieldwork, controlled experiments, and longitudinal datasets.</p>"
        "<p><strong>Paragraph D</strong> discusses practical implications for governments, local communities, and industry stakeholders.</p>"
        "<p><strong>Paragraph E</strong> evaluates strengths and weaknesses of current policy responses using specific examples.</p>"
        "<p><strong>Paragraph F</strong> highlights unresolved questions and identifies priorities for future studies.</p>"
    )


def build_reading_rows(total_tests: int = 5) -> list[dict]:
    rows: list[dict] = []
    passage_distribution = [13, 13, 14]  # authentic IELTS Reading: 40 questions / 3 passages

    tfng_answers = ["TRUE", "FALSE", "NOT GIVEN", "TRUE", "FALSE"]
    heading_answers = ["ii", "v", "i", "iv", "vi", "iii", "vii", "viii"]

    for test_num in range(1, total_tests + 1):
        test_id = f"IELTS_TEST_{test_num:02d}"
        global_order = 1
        q_cursor = 1

        for passage_idx, question_count in enumerate(passage_distribution, start=1):
            passage_id = f"T{test_num}_R{passage_idx}"
            start_q = q_cursor
            end_q = q_cursor + question_count - 1
            q_cursor = end_q + 1
            passage_text = build_reading_passage_text(test_num, passage_idx, start_q, end_q)

            for local_idx in range(1, question_count + 1):
                if local_idx <= 5:
                    question_type = "True/False/Not Given"
                    question_text = (
                        "<p><strong>Questions "
                        f"{start_q}-{min(start_q + 4, end_q)}</strong></p>"
                        "<p>Do the following statements agree with the information in the passage?</p>"
                        f"<p>Statement {global_order}: The writer claims that policy implementation in region {chr(64 + (local_idx % 6) + 1)} was consistent throughout the decade.</p>"
                    )
                    options_json = to_json(["TRUE", "FALSE", "NOT GIVEN"])
                    answer = tfng_answers[(local_idx - 1) % len(tfng_answers)]

                elif local_idx <= 9:
                    question_type = "Multiple Choice"
                    question_text = (
                        "<p><strong>Questions "
                        f"{start_q + 5}-{min(start_q + 8, end_q)}</strong></p>"
                        f"<p>Choose the correct letter, <strong>A, B, C or D</strong> for Question {global_order}.</p>"
                        f"<p>What is the main reason the author gives for change in phase {local_idx}?</p>"
                    )
                    options_json = to_json(
                        [
                            "A. A short-term financial incentive reshaped local priorities.",
                            "B. Long-term planning created gradual but stable improvements.",
                            "C. Public resistance forced an immediate policy reversal.",
                            "D. The evidence was too limited to support any recommendation.",
                        ]
                    )
                    answer = ["B", "A", "D", "C"][(local_idx - 6) % 4]

                elif local_idx <= 11:
                    question_type = "Matching Headings"
                    question_text = (
                        "<p><strong>Questions "
                        f"{start_q + 9}-{min(start_q + 10, end_q)}</strong></p>"
                        "<p>Choose the correct heading for the paragraph from the list of headings below.</p>"
                        f"<p>Match Question {global_order} with paragraph {chr(64 + local_idx - 8)}.</p>"
                    )
                    options_json = to_json(
                        {
                            "i": "An overlooked historical pattern",
                            "ii": "Competing definitions of success",
                            "iii": "A technological turning point",
                            "iv": "Evidence from long-term monitoring",
                            "v": "Unexpected consequences for workers",
                            "vi": "Why one method became dominant",
                        }
                    )
                    answer = heading_answers[(local_idx + passage_idx) % len(heading_answers)]

                else:
                    question_type = "Summary Completion"
                    question_text = (
                        "<p><strong>Questions "
                        f"{start_q + 11}-{end_q}</strong></p>"
                        "<p>Complete the summary below. Choose <strong>ONE WORD ONLY</strong> from the passage for each answer.</p>"
                        f"<p>Blank {global_order}: The report concludes that long-term <strong>_____</strong> is essential for resilient planning.</p>"
                    )
                    options_json = to_json([])
                    answer = [
                        "monitoring",
                        "coordination",
                        "infrastructure",
                        "evidence",
                        "regulation",
                        "collaboration",
                    ][(global_order + test_num + passage_idx) % 6]

                rows.append(
                    {
                        "test_id": test_id,
                        "passage_id": passage_id,
                        "order": global_order,
                        "question_type": question_type,
                        "passage_text": passage_text if local_idx == 1 else "",
                        "question_text": question_text,
                        "options_json": options_json,
                        "answer": answer,
                    }
                )
                global_order += 1

    return rows


def build_listening_rows(total_tests: int = 5) -> list[dict]:
    rows: list[dict] = []
    section_distribution = [10, 10, 10, 10]  # authentic IELTS Listening: 40 questions / 4 sections

    section_context = {
        1: "A conversation at a community employment center",
        2: "A talk about public facilities and local services",
        3: "A discussion between two students and a tutor",
        4: "A university lecture on environmental systems",
    }

    for test_num in range(1, total_tests + 1):
        test_id = f"IELTS_TEST_{test_num:02d}"
        global_order = 1

        for section_idx, question_count in enumerate(section_distribution, start=1):
            section_id = f"T{test_num}_L{section_idx}"
            song_no = ((test_num - 1) * 4 + section_idx - 1) % 16 + 1
            audio_url = f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{song_no}.mp3"
            base_instruction = (
                f"<p><strong>SECTION {section_idx}</strong> - {section_context[section_idx]}</p>"
                "<p><strong>Questions "
                f"{global_order}-{global_order + 9}</strong></p>"
            )

            for local_idx in range(1, question_count + 1):
                mode = global_order % 5
                header = base_instruction if local_idx == 1 else ""

                if mode == 1:
                    question_type = "Form Completion"
                    question_text = (
                        f"{header}<p>Complete the form. Write <strong>ONE WORD AND/OR A NUMBER</strong> for answer {global_order}.</p>"
                    )
                    options_json = to_json([])
                    answer = ["afternoon", "passport", "14B", "feedback", "central"][(global_order + section_idx) % 5]
                    image_url = ""

                elif mode == 2:
                    question_type = "Multiple Choice"
                    question_text = (
                        f"{header}<p>Choose the correct letter, <strong>A, B or C</strong> for Question {global_order}.</p>"
                        "<p>What does the speaker recommend as the next step?</p>"
                    )
                    options_json = to_json(
                        [
                            "A. Delay implementation until more data is collected.",
                            "B. Continue with minor adjustments to staffing.",
                            "C. Relocate the activity to a larger site.",
                        ]
                    )
                    answer = ["A", "B", "C"][(global_order + section_idx) % 3]
                    image_url = ""

                elif mode == 3:
                    question_type = "Map Labeling"
                    question_text = (
                        f"{header}<p>Label the map below. Write the correct letter, <strong>A-E</strong>, next to number {global_order}.</p>"
                    )
                    options_json = to_json(
                        [
                            "A. Main Library",
                            "B. Visitor Center",
                            "C. Science Block",
                            "D. Sports Hall",
                            "E. Car Park",
                        ]
                    )
                    answer = ["A", "B", "C", "D", "E"][(global_order + local_idx) % 5]
                    image_url = f"https://via.placeholder.com/600x400?text=IELTS+Map+T{test_num}+S{section_idx}"

                elif mode == 4:
                    question_type = "Sentence Completion"
                    question_text = (
                        f"{header}<p>Complete the sentence. Write <strong>ONE WORD ONLY</strong> for answer {global_order}.</p>"
                    )
                    options_json = to_json([])
                    answer = ["water", "soil", "roads", "insects", "shelter"][(global_order + section_idx) % 5]
                    image_url = ""

                else:
                    question_type = "Matching"
                    question_text = (
                        f"{header}<p>Match each statement with the correct option label for Question {global_order}.</p>"
                    )
                    options_json = to_json(
                        {
                            "A": "Initial planning stage",
                            "B": "Pilot implementation",
                            "C": "Stakeholder consultation",
                            "D": "Outcome evaluation",
                            "E": "Long-term monitoring",
                        }
                    )
                    answer = ["A", "B", "C", "D", "E"][(global_order + test_num + section_idx) % 5]
                    image_url = ""

                rows.append(
                    {
                        "test_id": test_id,
                        "section_id": section_id,
                        "order": global_order,
                        "question_type": question_type,
                        "audio_url": audio_url,
                        "image_url": image_url,
                        "question_text": question_text,
                        "options_json": options_json,
                        "answer": answer,
                    }
                )
                global_order += 1

    return rows


def build_writing_rows(total_tests: int = 5) -> list[dict]:
    rows: list[dict] = []

    task1_types = [
        "Line Graph",
        "Bar Chart",
        "Table",
        "Process Diagram",
        "Map",
    ]
    task2_types = [
        "Opinion Essay",
        "Discussion Essay",
        "Problem-Solution Essay",
        "Advantage-Disadvantage Essay",
        "Two-part Question Essay",
    ]

    for test_num in range(1, total_tests + 1):
        test_id = f"IELTS_TEST_{test_num:02d}"

        rubric = to_json(
            {
                "Task Achievement": "Fully addresses all parts of the task with clear overview and key comparisons.",
                "Coherence and Cohesion": "Logically organized paragraphs with precise referencing and linking.",
                "Lexical Resource": "Wide range of precise academic vocabulary with natural collocations.",
                "Grammatical Range and Accuracy": "Flexible, mostly error-free complex structures.",
            }
        )

        task1_type = task1_types[(test_num - 1) % len(task1_types)]
        task1_prompt = (
            "<p><strong>WRITING TASK 1</strong></p>"
            f"<p>The {task1_type.lower()} shows changes in urban transport usage from 2000 to 2025 in three cities.</p>"
            "<p>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p>"
            "<p><strong>Write at least 150 words.</strong></p>"
        )
        task1_answer = (
            "The visual data compares transport patterns over a twenty-five-year period in three metropolitan areas. "
            "Overall, private car usage declined steadily, while public transport and cycling became more prevalent. "
            "In City A, rail travel rose sharply after 2010, overtaking buses by the end of the period. "
            "City B showed the most balanced distribution, though cycling recorded the fastest proportional increase. "
            "By contrast, City C remained more car-dependent despite a moderate rise in metro use. "
            "Another notable feature is that bus ridership fluctuated mildly in all three cities but ended at a similar level to its starting point, "
            "suggesting that buses remained a stable secondary mode rather than the main growth driver. "
            "In summary, the trend indicates a gradual transition towards more sustainable mobility, with variation in speed across locations. "
            "This comparison highlights how infrastructure investment and local policy can influence travel behavior over time."
        )

        rows.append(
            {
                "test_id": test_id,
                "task": "Task 1",
                "order": 1,
                "question_type": task1_type,
                "image_url": f"https://via.placeholder.com/600x400?text=IELTS+Writing+Task+1+T{test_num}",
                "question_text": task1_prompt,
                "rubric": rubric,
                "answer": task1_answer,
            }
        )

        task2_type = task2_types[(test_num - 1) % len(task2_types)]
        task2_prompt = (
            "<p><strong>WRITING TASK 2</strong></p>"
            "<p>Some people believe governments should spend more on public services, while others think reducing taxes is more beneficial.</p>"
            f"<p>Discuss both views and give your own opinion in relation to {task2_type.lower()}.</p>"
            "<p>Give reasons for your answer and include relevant examples from your own knowledge or experience.</p>"
            "<p><strong>Write at least 250 words.</strong></p>"
        )
        task2_answer = (
            "Debate persists over whether fiscal policy should prioritize lower taxes or stronger public services. "
            "Those favoring tax reductions argue that households and businesses can allocate resources more efficiently when they retain a larger share of income. "
            "Lower tax burdens may also encourage investment and entrepreneurship, which can stimulate job creation. "
            "However, this perspective often underestimates the social value of reliable healthcare, education, and transport infrastructure. "
            "In my view, strategic investment in public services should remain the primary objective, provided spending is transparent and outcome-driven. "
            "Quality public systems improve productivity, reduce inequality, and create long-term economic resilience. "
            "For instance, a well-funded education system raises workforce quality over decades, while preventive healthcare reduces long-term fiscal pressure. "
            "A balanced model is ideal: governments can implement targeted tax relief while maintaining robust funding for essential services. "
            "Therefore, the best policy is not the cheapest short-term option, but the one that delivers measurable social and economic returns over time."
        )

        rows.append(
            {
                "test_id": test_id,
                "task": "Task 2",
                "order": 2,
                "question_type": task2_type,
                "image_url": "",
                "question_text": task2_prompt,
                "rubric": rubric,
                "answer": task2_answer,
            }
        )

    return rows


def build_speaking_rows(total_tests: int = 5) -> list[dict]:
    rows: list[dict] = []

    part1_question_bank = {
        "Hometown": [
            "Where is your hometown?",
            "What do you like most about your hometown?",
            "Has your hometown changed much in recent years?",
            "Do many tourists visit your hometown?",
            "What kind of jobs are common in your hometown?",
            "Is your hometown a good place for young people?",
            "How is the public transport in your hometown?",
            "Would you like to live there in the future?",
            "What is the weather usually like there?",
            "What is one thing you would improve in your hometown?",
        ],
        "Work/Study": [
            "Do you work or are you a student?",
            "Why did you choose this field?",
            "What is the most challenging part of your work/study?",
            "How do you organize your weekly schedule?",
            "Do you prefer working alone or in a team?",
            "What skills are important in your field?",
            "Have your goals changed since you started?",
            "Do you think practical experience is important?",
            "How do you deal with deadlines?",
            "Would you change your field in the future?",
        ],
        "Daily Routine": [
            "What is your typical weekday routine?",
            "Do you prefer mornings or evenings?",
            "How do you usually start your day?",
            "Do you have enough free time each day?",
            "How often do you exercise?",
            "What part of the day is most productive for you?",
            "Do you usually cook at home or eat out?",
            "Has your daily routine changed recently?",
            "Do you make plans for the next day?",
            "What small habit has improved your routine?",
        ],
        "Technology": [
            "What technology do you use most every day?",
            "How has technology changed your study/work habits?",
            "Do you prefer reading on paper or on a screen?",
            "How often do you use social media?",
            "Do you think people spend too much time on phones?",
            "What is one useful app you use frequently?",
            "Do older people in your family use technology often?",
            "Have you ever taken an online course?",
            "How do you protect your privacy online?",
            "What technology would you like to learn next?",
        ],
        "Reading Habits": [
            "Do you enjoy reading?",
            "What kind of books do you usually read?",
            "How often do you read in a week?",
            "Did you read more when you were younger?",
            "Do you prefer fiction or non-fiction?",
            "Where do you usually read?",
            "Do you read in your first language or in English more often?",
            "How do you choose what to read next?",
            "Do you ever discuss books with friends?",
            "What book has influenced you recently?",
        ],
    }

    part1_topics = list(part1_question_bank.keys())

    for test_num in range(1, total_tests + 1):
        test_id = f"IELTS_TEST_{test_num:02d}"

        # Part 1: 10 short questions
        topic = part1_topics[(test_num - 1) % len(part1_topics)]
        topic_questions = part1_question_bank[topic]
        for order in range(1, 11):
            rows.append(
                {
                    "test_id": test_id,
                    "part": "Part 1",
                    "order": order,
                    "question_type": topic,
                    "cue_card": "",
                    "question_text": (
                        f"<p><strong>Part 1 - {topic}</strong></p>"
                        f"<p>{topic_questions[order - 1]}</p>"
                    ),
                    "answer": (
                        "This topic is quite relevant to me, and I can give a personal example from my daily life. "
                        "Overall, my experience has changed over time, especially as my priorities and responsibilities have evolved."
                    ),
                }
            )

        # Part 2: 1 cue card
        rows.append(
            {
                "test_id": test_id,
                "part": "Part 2",
                "order": 1,
                "question_type": "Cue Card",
                "cue_card": (
                    "<p><strong>Part 2 - Cue Card</strong></p>"
                    "<p>Describe a useful skill you learned recently.</p>"
                    "<p><strong>You should say:</strong></p>"
                    "<ul>"
                    "<li>what the skill is</li>"
                    "<li>how you learned it</li>"
                    "<li>why you learned it</li>"
                    "</ul>"
                    "<p>and explain how this skill has helped you.</p>"
                ),
                "question_text": (
                    "<p><strong>You will have one minute to prepare.</strong></p>"
                    "<p>Please speak for one to two minutes.</p>"
                ),
                "answer": (
                    "A useful skill I learned recently is data visualization with spreadsheet tools. "
                    "I learned it through online tutorials and by practicing with real datasets from my coursework. "
                    "Initially, I needed this skill to present complex information more clearly in group projects. "
                    "Over time, it has helped me communicate findings quickly, identify patterns, and make better decisions. "
                    "Most importantly, it has made my academic and professional work far more efficient."
                ),
            }
        )

        # Part 3: 6 deeper discussion questions
        part3_questions = [
            "Why do some people adapt to new skills faster than others?",
            "Should schools teach more practical skills than theoretical subjects?",
            "How can employers help staff improve professional skills?",
            "Do you think technology makes skill development easier?",
            "Are soft skills as important as technical skills in modern jobs?",
            "How might skill requirements change in the next 20 years?",
        ]
        for order in range(1, 7):
            rows.append(
                {
                    "test_id": test_id,
                    "part": "Part 3",
                    "order": order,
                    "question_type": "Discussion",
                    "cue_card": "",
                    "question_text": (
                        "<p><strong>Part 3 - Discussion</strong></p>"
                        f"<p>{part3_questions[order - 1]}</p>"
                    ),
                    "answer": (
                        "I think adaptation speed depends on motivation, prior experience, and access to quality guidance. "
                        "People who practice consistently and receive constructive feedback generally progress much faster."
                    ),
                }
            )

    return rows


def main() -> None:
    output_dir = Path(__file__).resolve().parent
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "ielts_master_data.xlsx"

    reading_columns = [
        "test_id",
        "passage_id",
        "order",
        "question_type",
        "passage_text",
        "question_text",
        "options_json",
        "answer",
    ]

    listening_columns = [
        "test_id",
        "section_id",
        "order",
        "question_type",
        "audio_url",
        "image_url",
        "question_text",
        "options_json",
        "answer",
    ]

    writing_columns = [
        "test_id",
        "task",
        "order",
        "question_type",
        "image_url",
        "question_text",
        "rubric",
        "answer",
    ]

    speaking_columns = [
        "test_id",
        "part",
        "order",
        "question_type",
        "cue_card",
        "question_text",
        "answer",
    ]

    df_reading = pd.DataFrame(build_reading_rows(), columns=reading_columns)
    df_listening = pd.DataFrame(build_listening_rows(), columns=listening_columns)
    df_writing = pd.DataFrame(build_writing_rows(), columns=writing_columns)
    df_speaking = pd.DataFrame(build_speaking_rows(), columns=speaking_columns)

    with pd.ExcelWriter(output_file, engine="openpyxl") as writer:
        df_reading.to_excel(writer, index=False, sheet_name="Reading")
        df_listening.to_excel(writer, index=False, sheet_name="Listening")
        df_writing.to_excel(writer, index=False, sheet_name="Writing")
        df_speaking.to_excel(writer, index=False, sheet_name="Speaking")

    print(f"Created {output_file}")
    print(
        "Rows -> "
        f"Reading: {len(df_reading)}, "
        f"Listening: {len(df_listening)}, "
        f"Writing: {len(df_writing)}, "
        f"Speaking: {len(df_speaking)}"
    )


if __name__ == "__main__":
    main()
