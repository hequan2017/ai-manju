# ===== 构建阶段 =====
FROM node:20-alpine AS builder
WORKDIR /app

# 先装依赖（利用层缓存）
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# 构建生产产物
COPY . .
# 构建时可注入媒体代理端点（可选）：--build-arg VITE_MEDIA_PROXY_ENDPOINT=...
ARG VITE_MEDIA_PROXY_ENDPOINT=""
ENV VITE_MEDIA_PROXY_ENDPOINT=$VITE_MEDIA_PROXY_ENDPOINT
RUN npm run build

# ===== 运行阶段 =====
FROM nginx:stable-alpine

# 前端静态产物
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx 配置（SPA 回退 + 缓存 + gzip）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
