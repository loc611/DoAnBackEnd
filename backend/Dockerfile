FROM node:22-alpine

WORKDIR /app

# Copy package files và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn (bao gồm cả thư mục prisma chứa schema.prisma)
COPY . .

# Tạo Prisma Client
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]