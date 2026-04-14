# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Ảnh chụp màn hình Hermes Manager](./docs/images/ss-agents-1.png)

Hermes Manager là control plane được xây dựng bằng Next.js để vận hành tập trung nhiều Hermes Agent trên một máy chủ duy nhất.
Không giống Hermes dashboard chính thức, vốn là giao diện quản lý cho một Hermes installation đơn lẻ, Hermes Manager không phải là bản thay thế theo kiểu feature parity mà được định vị cho vận hành đa agent trong môi trường trusted-network / intranet. Ứng dụng tập trung vào provisioning agent, áp dụng templates / partials, phân lớp biến môi trường theo từng agent, điều khiển dịch vụ cục bộ, và quản lý xuyên suốt cấu hình, log cũng như lịch sử chat.

Một điểm khác biệt cốt lõi khác của ứng dụng là mô hình vận hành với “partial prompt”, cho phép bảo trì SOUL của nhiều agent bằng các thành phần dùng chung. Mỗi agent vẫn giữ `SOUL.md` đã được lắp ghép, tương thích với runtime, đồng thời có thể `embed/include` partial dùng chung từ `SOUL.src.md` dành cho chỉnh sửa. Nhờ đó, các chính sách chung và quy ước vận hành áp dụng cho nhiều agent có thể được cập nhật tại một nơi, trong khi phần khác biệt riêng của từng agent vẫn được giữ riêng.

## Tính năng của ứng dụng

- Control plane để vận hành tập trung nhiều agent trên một host
- Nền tảng vận hành subagent cung cấp managed delegation / dispatch giữa các agent
- Kiểm soát đích ủy quyền, ngăn vòng lặp và giới hạn số hop tối đa bằng per-agent delegation policy
- Cho phép operator xây dựng mô hình phân vai tùy ý như domain agent / specialist agent
- Provisioning có thể tái sử dụng bằng templates / partials / memory assets
- SOUL composability cho phép nhúng shared partial prompt vào `SOUL.md` của nhiều agent
- Tự động tái tạo `SOUL.md` đã lắp ghép trong khi vẫn giữ tương thích với Hermes runtime
- Mô hình vận hành cho phép bảo trì tách biệt giữa khác biệt theo từng agent và quy ước chung của toàn fleet
- Điều khiển dịch vụ cục bộ tích hợp với launchd / systemd

### Managed Subagent Delegation

![Sơ đồ managed subagent delegation](./docs/images/hermes-managed-subagent-delegation-org.png)

Tính năng subagent của Hermes Manager cho phép xây dựng mô hình vận hành trong đó agent không hoạt động tách rời mà cộng tác với nhau theo vai trò đã phân chia. Hình minh họa cho thấy một cấu hình trong đó các agent theo miền nghiệp vụ như Project A / Project B / Client C đóng vai trò đầu mối tiếp nhận yêu cầu từ người dùng, rồi ủy quyền phần việc cần thiết cho các specialist agent như Python Developer, Marketing Analyzer, Web Designer và Flutter Developer.

Trong cấu hình này, Hermes Manager không chỉ đơn thuần cung cấp điểm vào cho giao tiếp giữa các agent mà còn hoạt động như một control plane nơi operator có thể quản lý agent nào được phép sử dụng specialist nào và được ủy quyền tối đa bao nhiêu tầng. Nhờ vậy, ngay cả khi tăng số lượng agent phụ trách theo từng miền nghiệp vụ, vẫn có thể tái sử dụng năng lực chuyên môn như một shared resource trong khi duy trì hành vi nhất quán cho toàn fleet.

Giá trị của tính năng này nằm ở việc mô hình phân vai do operator thiết kế có thể được vận hành an toàn nhờ managed delegation và policy control. Ngay cả khi số lượng agent tuyến đầu tăng lên, các specialist agent vẫn dễ dàng được tái sử dụng, và vì các quy tắc ủy quyền được quản lý tập trung nên việc bảo trì liên tục các workflow thực tế kết hợp nhiều agent cũng trở nên dễ dàng hơn.

### Shared Partial Prompt / SOUL Composability

![Sơ đồ partial prompt](./docs/images/hermes-partial-prompts.png)

Trong cấu trúc này, shared partial prompt được quản lý như một shared asset và được `embed/include` từ `SOUL.src.md` của nhiều agent để lắp ghép thành `SOUL.md` cuối cùng. Operator có thể gom các quy tắc, chính sách an toàn và quy ước vận hành host dùng chung cho tất cả agent về phía partial, đồng thời ở mỗi agent chỉ cần viết phần khác biệt đặc thù theo vai trò. Kết quả là giảm được rủi ro thiếu đồng bộ giữa các chỉ thị chung và giúp việc bảo trì SOUL trên toàn fleet diễn ra nhất quán hơn.

## Bản đồ tài liệu

- Đặc tả yêu cầu: [`docs/requirements.md`](./docs/requirements.md)
- Kiến trúc / thiết kế API: [`docs/design.md`](./docs/design.md)
- README tiếng Anh: [`README.md`](./README.md)
- Hướng dẫn đóng góp: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Báo cáo bảo mật: [`SECURITY.md`](./SECURITY.md)
- Hướng dẫn cho người dùng: [`SUPPORT.md`](./SUPPORT.md)

## Tổng quan

Trong Hermes Manager, bạn có thể thực hiện các thao tác sau từ giao diện trình duyệt.

- Vận hành tập trung nhiều agent trên một host
- Provisioning, sao chép và xóa agent
- Khởi động, dừng và khởi động lại qua launchd (macOS) / systemd (Linux)
- Chỉnh sửa `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml` và `.env`
- Quản lý phân lớp biến môi trường global / agent với metadata về visibility
- Tái sử dụng templates / partials và trang bị kỹ năng từ local skill catalog
- Theo dõi điều khiển dịch vụ cục bộ, log, Cron jobs và chat sessions

## An toàn / ranh giới tin cậy

Dự án này giả định được vận hành trong môi trường trusted-network / intranet.
Mặc định, dự án không bao gồm xác thực cho internet công cộng, phân tách quyền hạn cho nhiều người dùng hay các biện pháp phòng vệ để công khai ra bên ngoài.
Nếu vận hành ngoài intranet, bạn bắt buộc phải bổ sung lớp xác thực và kiểm soát truy cập của riêng mình ở phía trước.

## Ảnh chụp màn hình

### Danh sách Agents

![Ảnh chụp màn hình Hermes Manager](./docs/images/ss-agents-1.png)

### Quản lý bộ nhớ

![Màn hình quản lý bộ nhớ Hermes Manager](./docs/images/ss-agent_memory-1.png)

## Đóng góp

Quy trình đề xuất, quality gates và các điều kiện tiên quyết cho triển khai được mô tả trong [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Giấy phép

MIT. Xem [`LICENSE`](./LICENSE).
