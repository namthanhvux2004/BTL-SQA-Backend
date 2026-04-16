# Health System Backend

## Quy tắc dự án

- Sử dụng TypeScript cho toàn bộ mã nguồn.
- Quản lý môi trường bằng file `.env` và khai báo type cho biến môi trường.
- Sử dụng Prisma ORM cho quản lý database.
- Tất cả các controller, services đều đặt đúng thư mục chức năng.
- Đặt tên biến, hàm, class theo chuẩn camelCase/PascalCase.
- Format code bằng Prettier, kiểm tra lint với ESLint.

## Cấu trúc thư mục

```
Backend/
├── database/             # Quản lý database, file seed, init
│   ├── InitDatabase.sql  # File init database
│   └── seed/             # File seed database
├── prisma/               # Quản lý schema, migration
│   └── schema.prisma
├── public/               # Chứa các file tĩnh
├── src/
│   ├── config/           # Các file cấu hình (constants, prisma, swagger...)
│   ├── controllers/      # Các controller chia theo module (auth, user...)
│   ├── core/             # Các lớp lõi như ApiResponse, Error
│   ├── daos/             # Data Access Object (auth, role, user...)
│   ├── dtos/             # Data Transfer Object (auth, role...)
│   │   └── helpers/      # Các hàm tiện ích cho DTO
│   ├── helpers/          # Các hàm tiện ích chung (asyncHandler, generateId...)
│   ├── middleware/       # Các middleware cho Express
│   ├── models/           # Định nghĩa các model (nếu có custom)
│   ├── routes/           # Định nghĩa các route (auth, index...)
│   ├── services/         # Business logic, service cho từng module
│   ├── templates/        # Các template email, HTML
│   └── types/            # Định nghĩa các type, interface chung
│       ├── common/       # Các type dùng chung (api.types...)
│       ├── domain/       # Các type liên quan đến domain
│       └── express/      # Các type mở rộng cho Express
├── package.json          # Quản lý dependencies và script
├── .env                  # Biến môi trường
├── README.md             # Tài liệu dự án
└── ...
```

## Hướng dẫn cài đặt

1. **Clone dự án:**
    ```
    git clone <repo-url>
    cd Backend
    ```
2. **Cài đặt dependencies:**
    ```
    npm install
    ```
3. **Cấu hình môi trường:**
    - Copy file `.env.example` thành `.env.development` và điền thông tin kết nối database, secret key, ...
4. **Khởi tạo database:**
    ```
    npx prisma migrate dev
    npx prisma generate
    ```
5. **Chạy dự án:**
    ```
    npm run dev
    ```
6. **Kiểm tra code:**
    ```
    npm run lint
    npm run prettier:fix
    ```

## Lưu ý

- Định nghĩa type rõ cho các biến, hàm, class.
- Khi chỉnh sửa schema trong `prisma/schema.prisma`, vui lòng chạy lại `npx prisma db push` để cập nhật database.
- Khi thêm mới model, vui lòng khai báo trong `prisma/schema.prisma` và chạy lại `npx prisma db push` để cập nhật type.

## Liên hệ & đóng góp

- Vui lòng tạo issue hoặc pull request nếu muốn đóng góp hoặc báo lỗi.
