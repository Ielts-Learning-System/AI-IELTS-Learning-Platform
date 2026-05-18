<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# 1) Định nghĩa vấn đề

### Pain points chính của người học IELTS

- Người học thường **không có đủ feedback chất lượng cao và nhanh** cho Speaking/Writing, đặc biệt khi không có tutor 1-1; họ chỉ nhận được band score chung mà không biết lỗi nào đang kéo điểm xuống.[^6]
- Writing rất khó tự sửa vì lỗi không chỉ nằm ở grammar; nhiều bài bị trừ điểm do **không trả lời đúng yêu cầu đề, lập luận yếu, liên kết kém, hoặc phát triển ý chưa đủ sâu**.[^3]
- Speaking lại cần phản hồi theo nhiều lớp: độ trôi chảy, từ vựng, ngữ pháp, phát âm, khả năng phát triển ý; phần lớn công cụ AI hiện nay chỉ dừng ở mức “ước lượng band” hoặc nhận xét tổng quát.[^4]
- Người học thiếu một **vòng lặp luyện tập - chẩn đoán - sửa lỗi - kiểm tra lại** đủ nhanh, nên tiến bộ chậm dù luyện nhiều.[^5]

### Vấn đề hệ thống của cách học truyền thống

- Học theo lớp/tutor truyền thống phụ thuộc mạnh vào năng lực cá nhân của người chấm, nên feedback thường **không đồng đều** và khó scale.
- Chu kỳ nhận bài - chấm bài - sửa bài kéo dài làm mất động lực luyện tập.
- Nhiều nơi dạy theo template/mẫu câu quá mức, khiến người học nhớ cấu trúc nhưng không thật sự cải thiện năng lực thể hiện theo band descriptor.
- Việc luyện Speaking thường thiếu tính mô phỏng kỳ thi thực tế: ít câu hỏi bám sát logic của giám khảo, ít follow-up, ít áp lực thời gian.

## 2) Nghiên cứu đối thủ

### Bảng so sánh cạnh tranh

| Nền tảng                           | AI core features                                                                                             | Điểm mạnh                                                         | Điểm yếu / khoảng trống                                                                                                                                             |
| :----------------------------------- | :----------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Speechful                            | Chấm Speaking/Writing, phân tích theo tiêu chí, band estimate, hướng dẫn cải thiện[^8]             | Định vị rõ vào IELTS, có cảm giác “exam-focused”[^8]       | Khả năng cá nhân hóa sâu và mô hình cải thiện dài hạn chưa thấy nổi bật; dễ rơi vào kiểu “chấm điểm nhanh” hơn là “huấn luyện thật”[^8] |
| IELTS AI: Speaking\& Writing         | Mô phỏng Speaking, phân tích phát âm/fluency, chấm bài Writing, gợi ý học tập cá nhân hóa[^5] | Bộ tính năng khá rộng, phù hợp user muốn all-in-one[^5]      | Dễ bị commoditize; thiếu bằng chứng công khai về độ chính xác và độ tin cậy ở cấp tiêu chí IELTS[^5]                                                  |
| IELTS Pulse                          | Mock speaking test, follow-up questions, scan writing, score history[^9]                                     | Có yếu tố mô phỏng thi tốt hơn nhiều app chỉ chấm band[^9] | Feedback vẫn thiên về scoring hơn là chẩn đoán sâu; chưa thấy lớp analytics kiểu “điểm yếu gốc rễ”[^9]                                               |
| IELTS.gg                             | AI feedback cho speaking/writing, mock tests, personal plan[^10]                                             | Phủ được nhu cầu luyện tập + phản hồi + kế hoạch[^10]     | Định vị rộng, chưa thấy USP thật sắc về chất lượng chấm hoặc độ sâu coaching[^10]                                                                       |
| IELTS 9 / hệ sinh thái content-led | Free tools, guides, AI feedback, score helpers[^11]                                                          | Tốt ở top-of-funnel và SEO/content acquisition[^11]               | Khả năng giữ chân và tạo “trust score” cho feedback có thể chưa mạnh bằng sản phẩm chuyên grading[^11]                                                   |

### Kết luận cạnh tranh

- Thị trường hiện tại đang có nhiều sản phẩm AI cho IELTS, nhưng phần lớn đều dừng ở **“instant score + some feedback”**.[^4]
- Khoảng trống lớn nhất là: **feedback đủ sâu, đủ bám rubric chính thức, và đủ cá nhân hóa để tạo ra tiến bộ đo được**.[^2]
- Với Speaking, thị trường vẫn thiếu một “AI examiner” thực sự có khả năng hỏi tiếp, đổi hướng, và ép người học bộc lộ năng lực như giám khảo thật.

## 3) Cơ hội sản phẩm và USP

### 1. Rubric-based Diagnostic Engine

Thay vì trả về 1 band số, hệ thống tách kết quả thành từng lớp: **Task/Response, Cohesion, Lexical, Grammar, Pronunciation, Fluency**. Mỗi lớp có lỗi cụ thể, ví dụ “thiếu development”, “idea repeated”, “limited paraphrase”, “sentence control yếu”, giúp người học hiểu chính xác vì sao mất điểm.[^1]

### 2. AI Examiner động

Speaking không nên chỉ là bộ câu hỏi cố định. Hệ thống nên tự điều chỉnh độ khó và follow-up dựa trên câu trả lời trước, giống logic của một giám khảo thật hơn, từ đó tạo ra độ “test realism” cao hơn.[^9]

### 3. Action-to-Improvement Loop

Sau mỗi lần chấm, hệ thống tự tạo **kế hoạch sửa lỗi theo priority**, ví dụ: sửa coherence trước, sau đó luyện paraphrase, rồi làm lại cùng một loại task để đo improvement. Đây là điểm nhiều đối thủ chưa làm đủ tốt vì họ chấm xong là hết.[^5]

### 4. Confidence Score + Readiness Index

Ngoài band dự đoán, hiển thị thêm:

- độ tin cậy của dự đoán,
- mức ổn định qua nhiều lần làm,
- mức sẵn sàng thi thật theo từng tiêu chí.
  Điều này giúp người học tránh ảo tưởng “đạt band” chỉ vì một bài làm tốt bất thường.[^2]

## 4) Mục tiêu MVP và KPI

### Mục tiêu chiến lược cho MVP

- Chứng minh AI chấm Speaking/Writing đủ đáng tin để người học dùng hằng ngày.
- Rút feedback time về gần như tức thì để tăng tần suất luyện tập.
- Tạo được vòng lặp cải thiện có đo lường, không chỉ là chấm điểm.
- Đạt mức retention đủ tốt để chứng minh đây là product học tập thật, không phải app thử một lần.
- Xây kiến trúc microservices để từng mô-đun AI có thể cải tiến độc lập.

### KPI đề xuất

| Nhóm KPI  | Chỉ số                                              | Ý nghĩa                                                 |
| :--------- | :---------------------------------------------------- | :-------------------------------------------------------- |
| Business   | 7-day retention, 30-day retention                     | Đo khả năng giữ chân người học                    |
| Business   | Trial-to-paid conversion                              | Đo mức sẵn sàng trả tiền cho AI feedback            |
| Business   | WAU/MAU                                               | Đo mức độ hình thành thói quen học                |
| Product    | Số lượt luyện Speaking/Writing mỗi tuần/người | Đo engagement thực                                      |
| AI quality | Độ lệch trung bình giữa AI score và human score | KPI cốt lõi cho độ tin cậy chấm điểm              |
| AI quality | Agreement rate theo từng tiêu chí rubric           | Xem AI có bắt đúng lỗi gốc hay không               |
| AI quality | Improvement after feedback                            | Đo feedback có thực sự giúp tăng điểm không      |
| AI quality | Latency per assessment                                | Đảm bảo trải nghiệm gần thời gian thực            |
| AI quality | Inter-rater consistency giữa các module             | Kiểm soát chất lượng trong kiến trúc microservices |

## 5) Gợi ý khung PRD R\&D

Nếu bạn muốn tài liệu “chuẩn R\&D” hơn nữa, nên thêm các phần sau vào PRD:

- **Research questions**: AI cần đạt mức nào để người học tin dùng thay tutor?
- **Hypotheses**: feedback theo rubric + action plan sẽ tăng retention tốt hơn score-only.
- **Success criteria**: ví dụ MAE band score dưới một ngưỡng nào đó so với human examiner.
- **Model evaluation plan**: so sánh AI với human chấm thật trên bộ dữ liệu có gán nhãn.
- **Experiment design**: A/B test score-only vs score + remediation plan.

Một hướng định vị rất mạnh cho platform của bạn là: **“IELTS coach system” thay vì “IELTS scoring app”**. Điều đó giúp sản phẩm không bị cạnh tranh bằng tính năng chấm điểm đơn thuần, mà bằng năng lực tạo tiến bộ thật cho người học.[^1]

Nếu bạn muốn, mình có thể làm tiếp bước sau và viết luôn **PRD outline chuẩn R\&D bằng tiếng Việt**, gồm: problem statement, personas, user stories, functional requirements, non-functional requirements, architecture, và measurement plan.
`<span style="display:none">`[^16]

<div align="center">⁂</div>

[^1]: https://assets.cambridgeenglish.org/webinars/ielts-speaking-band-descriptors.pdf
    
[^2]: https://ielts.org/news-and-insights/ielts-writing-band-descriptors-and-key-assessment-criteria
    
[^3]: https://ielts.idp.com/vietnam/about/news-and-articles/article-ielts-writing-band-descriptors
    
[^4]: https://play.google.com/store/apps/details?id=io.scorefactory.app
    
[^5]: https://apps.apple.com/vn/app/ielts-ai-speaking-writing/id6755227591?l=vi
    
[^6]: https://apps.apple.com/us/app/ielts-speaking-writing-reading/id6463652373
    
[^7]: https://speechful.ai/ielts-ai
    
[^8]: https://speechful.ai
    
[^9]: https://play.google.com/store/apps/details?id=com.finnove.ieltspulse\&hl=en_GB
    
[^10]: https://ielts.gg/month
    
[^11]: https://ielts9.io/alternative-to/ielts-gg
    
[^12]: https://takeielts.britishcouncil.org/teach-ielts/test-information/assessment
    
[^13]: https://www.scribd.com/document/350041416/IELTS-Assessment-Criteria-SPEAKING-Band-Descriptors
    
[^14]: https://ieltstutors.org/writing-band-descriptors/
    
[^15]: https://takeielts.britishcouncil.org/sites/default/files/ielts_speaking_band_descriptors.pdf
    
[^16]: https://idc.edu/IELTS-Speaking-Writing-Band-descriptors.pdf
