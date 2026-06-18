# DatVeTau_Crawl

Dự án mô phỏng hệ thống đặt vé tàu trực tuyến được xây dựng phục vụ mục đích học tập, nghiên cứu và thực hành các công nghệ phát triển phần mềm hiện đại.

## Giới thiệu
DatVeTau_Crawl là dự án học phần nhằm mô phỏng quy trình đặt vé tàu trực tuyến, từ tìm kiếm chuyến đi, lựa chọn ghế ngồi đến thanh toán trực tuyến.

Hệ thống được phát triển để thực hành các kiến thức về:

* Thiết kế và phát triển ứng dụng Web
* Xây dựng RESTful API
* Thiết kế cơ sở dữ liệu
* Xử lý dữ liệu thực tế
* Tích hợp cổng thanh toán
* Kỹ thuật thu thập dữ liệu (Web Crawling)

## Chức năng chính
* Tra cứu chuyến tàu theo ga đi, ga đến và ngày khởi hành
* Hiển thị thông tin chuyến tàu, giá vé và tình trạng ghế
* Chọn ghế và đặt vé
* Quản lý thông tin người dùng
* Thanh toán trực tuyến thông qua môi trường thử nghiệm VNPay Sandbox
* Đồng bộ dữ liệu chuyến tàu từ nguồn dữ liệu công khai

## Công nghệ sử dụng

### Backend
* Java
* Spring Boot
* Spring Security
* JPA / Hibernate
* PostgreSQL

### Frontend
* ReactJS
* Vite
* Axios

### Khác
* REST API
* Web Crawling
* VNPay Sandbox
* Git & GitHub

## Kiến trúc dự án
```text
DatVeTau_Crawl
├── booktrain-back     # Backend Spring Boot
├── booktrain-front    # Frontend ReactJS
└── DatVeTau_Crawl.sql # Cơ sở dữ liệu script
```

## Nguồn dữ liệu
Một phần dữ liệu về chuyến tàu, giá vé và thông tin ghế được thu thập từ các nguồn dữ liệu công khai trên Internet nhằm phục vụ việc minh họa và kiểm thử chức năng của hệ thống.
Dự án không sở hữu các dữ liệu này và mọi quyền liên quan thuộc về các chủ sở hữu tương ứng.

## Disclaimer
> Đây là dự án học tập được thực hiện trong khuôn khổ học phần tại trường đại học.

* Dự án không phải là sản phẩm thương mại.
* Dự án không thực hiện bán vé hoặc cung cấp dịch vụ vận tải thực tế.
* Dự án không liên kết, đại diện hoặc được bảo trợ bởi Tổng công ty Đường sắt Việt Nam hoặc bất kỳ tổ chức vận tải nào.
* Chức năng thu thập dữ liệu (crawling) chỉ được sử dụng nhằm mục đích nghiên cứu, học tập và thực hành kỹ thuật phát triển phần mềm.
* Một phần dữ liệu được lấy từ các nguồn công khai trên Internet để phục vụ việc minh họa chức năng hệ thống.
* Mọi quyền sở hữu dữ liệu, thương hiệu và nội dung liên quan thuộc về các chủ sở hữu hợp pháp tương ứng.
* Nếu có bất kỳ vấn đề nào liên quan đến quyền sở hữu dữ liệu hoặc nội dung, tác giả sẵn sàng phối hợp xử lý và điều chỉnh theo yêu cầu.

## Mục đích dự án
Dự án được xây dựng nhằm nâng cao kỹ năng phát triển phần mềm, làm quen với quy trình xây dựng hệ thống thực tế và áp dụng các kiến thức đã học vào một bài toán cụ thể trong lĩnh vực đặt vé trực tuyến.

## Tác giả
Nguyễn Văn Đức
Sinh viên Công nghệ Thông tin
Dự án được thực hiện phục vụ mục đích học tập và nghiên cứu.
