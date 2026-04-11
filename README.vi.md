# Hermes Agents WebApp

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Ảnh chụp màn hình Hermes Agents WebApp](./docs/images/ss-agents-1.png)

Hermes Agents WebApp là ứng dụng Next.js để quản lý tập trung các Hermes Agent vận hành trong môi trường mini từ giao diện web.
Ứng dụng tích hợp tạo, nhân bản, xóa, điều khiển khởi động/dừng, chỉnh sửa cấu hình, quản lý biến môi trường, quản lý kỹ năng, thao tác cron job, kiểm tra lịch sử trò chuyện và xem log.

Giao diện web hỗ trợ 10 ngôn ngữ sau:

- Tiếng Nhật (`ja`)
- Tiếng Anh (`en`)
- Tiếng Trung giản thể (`zh-CN`)
- Tiếng Tây Ban Nha (`es`)
- Tiếng Bồ Đào Nha (Brazil) (`pt-BR`)
- Tiếng Việt (`vi`)
- Tiếng Hàn (`ko`)
- Tiếng Nga (`ru`)
- Tiếng Pháp (`fr`)
- Tiếng Đức (`de`)

Bạn có thể chuyển đổi ngôn ngữ từ bộ chuyển ngôn ngữ trong app shell chung. Ngôn ngữ đã chọn được lưu trong `localStorage`, và các giá trị không hợp lệ hoặc thiếu sẽ quay về tiếng Nhật mặc định.

Lưu ý: chỉ giao diện ứng dụng được bản địa hóa. Nội dung vận hành như `SOUL.md`, tệp bộ nhớ, log và bản ghi trò chuyện không được dịch tự động.

> **Ứng dụng mạng tin cậy** — Hermes Agents WebApp được thiết kế để vận hành trong mạng tin cậy/intranet. Ứng dụng không bao gồm xác thực internet công cộng hoặc kiểm soát truy cập đa thuê bao. Nếu triển khai bên ngoài mạng tin cậy, hãy thêm lớp xác thực và kiểm soát truy cập của riêng bạn.

Để biết các quy tắc vận hành chi tiết và chính sách thiết kế, tham khảo:

- Hướng dẫn nhà phát triển: [`AGENTS.md`](./AGENTS.md)
- Yêu cầu: [`docs/requirements.md`](./docs/requirements.md)
- Thiết kế: [`docs/design.md`](./docs/design.md)
- Hướng dẫn đóng góp: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Báo cáo bảo mật: [`SECURITY.md`](./SECURITY.md)
- Hỗ trợ: [`SUPPORT.md`](./SUPPORT.md)

## Tính năng chính

- Quản lý tập trung nhiều Hermes Agent từ giao diện web
- Tạo, nhân bản, xóa, khởi động, dừng và khởi động lại agent
- Chỉnh sửa `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md` và `config.yaml`
- Quản lý biến môi trường agent/toàn cục với metadata hiển thị
- Trang bị/gỡ kỹ năng bằng cách sao chép thư mục kỹ năng
- Quản lý cron job và kiểm tra đầu ra
- Kiểm tra phiên trò chuyện và lịch sử qua máy chủ API agent
- Xem log gateway/webapp với tail/stream
- Chuyển đổi giao diện giữa 10 ngôn ngữ được hỗ trợ

## Ảnh chụp màn hình

### Danh sách Agent

![Ảnh chụp màn hình Hermes Agents WebApp](./docs/images/ss-agents-1.png)

### Quản lý bộ nhớ

![Màn hình quản lý bộ nhớ Hermes Agents](./docs/images/ss-agent_memory-1.png)

## Công nghệ sử dụng

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod (xác thực đầu vào API)
- Lớp dữ liệu dựa trên hệ thống tệp (`runtime/` là nguồn sự thật)

## Cài đặt

Yêu cầu tiên quyết:

- Node.js 20+
- npm

Điểm vào bootstrap ưu tiên:

```bash
./.wt/setup
```

Script này cài đặt các phụ thuộc khi cần, chuẩn bị thư mục runtime và cài đặt các hook cục bộ có sẵn.

Hoặc thủ công:

```bash
npm install
npm run build
PORT=18470 npm run start
```

## Lệnh phát triển

```bash
npm run dev
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Phạm vi kiểm thử

- `npm run test` (Vitest): kiểm thử đơn vị, component và tích hợp trong `tests/api`, `tests/components`, `tests/hooks`, `tests/lib` và `tests/ui`.
- `npm run test:e2e` (Playwright): kiểm thử E2E trình duyệt trong `tests/e2e`.
- Hiện tại không có kiểm thử Playwright đã commit trong `tests/e2e`, nên `npm run test:e2e` chỉ xác minh đường dẫn thực thi qua `--pass-with-no-tests`.
- Kiểm thử Playwright giả định ứng dụng đã chạy sẵn (ví dụ với `npm run dev`).

## Cấu trúc thư mục (tổng quan)

```text
hermes-agents/
├── app/                    # Next.js App Router (UI / API)
├── components/             # Component UI chia sẻ
├── src/lib/                # Helper hệ thống tệp/Env/SkillLink
├── docs/                   # Tài liệu yêu cầu và thiết kế
├── openspec/changes/       # Đề xuất thay đổi Conflux
├── tests/
│   ├── api|components|hooks|lib|ui/  # Kiểm thử đơn vị/component/tích hợp Vitest
│   └── e2e/                         # Kiểm thử E2E trình duyệt Playwright (cần ứng dụng đang chạy)
├── runtime/                # Dữ liệu runtime (agents/globals/logs)
└── AGENTS.md               # Hướng dẫn bắt buộc cho nhà phát triển
```

## Đóng góp

Xem [`CONTRIBUTING.md`](./CONTRIBUTING.md) để biết quy trình đóng góp. Tài liệu này được duy trì bằng tiếng Anh.

## Quản lý phiên bản và phát hành

Dự án này sử dụng quản lý phiên bản dựa trên SemVer khi phát triển.

- Nguồn sự thật phiên bản: `package.json`
- Ghi chú phát hành: GitHub Releases (thay đổi hướng người dùng và ghi chú nâng cấp cho vận hành)

Cho đến khi thêm công cụ phát hành tự động, tạo bản phát hành có tag từ các commit sạch đã vượt qua `npm run test`, `npm run typecheck`, `npm run lint` và `npm run format:check`.

## Giấy phép

MIT. Xem [`LICENSE`](./LICENSE).
