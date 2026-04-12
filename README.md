# 🍽️ 家庭点餐系统

> 记录每一顿美好的餐食 —— 面向家庭的智能点餐与食材管理平台

一套完整的家庭日常餐饮管理解决方案。家庭成员可以按日期和餐次选择菜品，管理员集中管理菜品库、查看点餐统计、汇总食材清单。系统集成 AI 能力，支持从 B 站烹饪视频自动识别菜品信息、批量导入菜品库。

## ✨ 功能概览

### 🏠 用户端

| 功能 | 说明 |
|------|------|
| **本周餐单** | 日历视图查看本周每日三餐安排 |
| **在线点餐** | 按日期 + 餐次（早/午/晚）从菜品库中选择，支持分类筛选 |
| **菜品浏览** | 浏览全部菜品详情，支持 B 站视频内嵌播放、用餐评价 |
| **我的记录** | 查看个人历史点餐记录 |
| **求菜需求** | 提交"想吃什么"的需求，等待管理员处理 |
| **扫码加入** | 扫描二维码快速申请加入家庭，管理员审批后即可使用 |

### 👨‍💼 管理端

| 功能 | 说明 |
|------|------|
| **数据看板** | 菜品总数、家庭成员、今日点餐、待处理需求一览，含 ECharts 可视化图表 |
| **菜品管理** | 菜品 CRUD，支持图片上传、B 站视频关联、本地视频上传（手机/电脑均可） |
| **批量导入** | 通过 B 站链接 / 收藏夹批量导入，AI 自动识别菜名、分类、食材 |
| **AI 自动识别** | 粘贴 B 站链接后自动填充菜品名称、分类、食材清单及分步做法，无需手动触发 |
| **关联菜品** | 支持菜品绑定（如火锅→锅底/蘸料），自定义关联类型 |
| **重复检测** | 新增菜品时自动检测同名或相同 B 站视频的重复菜品 |
| **分类管理** | 菜品分类的增删改查与排序 |
| **点餐统计** | 查看所有用户的点餐记录 |
| **成员管理** | 用户 CRUD、密码重置、扫码加入审批 |
| **食材清单** | 按日期范围自动汇总所有点餐所需食材 |
| **求菜处理** | 审批 / 拒绝用户的求菜申请 |

### 🔒 安全特性

- JWT 令牌认证，密钥强制从环境变量读取
- 登录频率限制（5 分钟 10 次），防止暴力破解
- 注册频率限制（1 小时 5 次）
- 用户名 / 密码前后端双重格式校验
- CORS 可配置白名单，请求体大小限制
- 角色白名单保护，RBAC 权限控制

## 🏗️ 技术栈

```
前端：Vue 3 + Vite + Vant 4 + Pinia + Vue Router
后端：Express.js + Prisma ORM + JWT + bcrypt
数据库：SQLite（轻量部署，可迁移 PostgreSQL）
AI 集成：BiBiGPT API（B 站视频内容识别）
部署：Docker + Docker Compose（单容器方案）
```

## 📁 项目结构

```
meal-planner/
├── frontend/                  # Vue 3 前端
│   ├── src/
│   │   ├── views/             # 页面组件
│   │   │   ├── Login.vue              # 登录（密码 + 扫码）
│   │   │   ├── WechatRegister.vue     # 扫码注册
│   │   │   ├── user/                  # 用户端页面
│   │   │   │   ├── Home.vue           # 首页 - 本周餐单
│   │   │   │   ├── Order.vue          # 点餐
│   │   │   │   ├── Dishes.vue         # 菜品浏览
│   │   │   │   ├── MyOrders.vue       # 我的记录
│   │   │   │   └── DishRequest.vue    # 求菜需求
│   │   │   └── admin/                 # 管理端页面
│   │   │       ├── Dashboard.vue      # 数据看板
│   │   │       ├── DishManage.vue     # 菜品管理
│   │   │       ├── BatchImport.vue    # 批量导入
│   │   │       ├── CategoryManage.vue # 分类管理
│   │   │       ├── OrderStats.vue     # 点餐统计
│   │   │       ├── UserManage.vue     # 成员管理
│   │   │       ├── DishRequests.vue   # 求菜处理
│   │   │       └── IngredientList.vue # 食材清单
│   │   ├── stores/auth.js     # 认证状态管理
│   │   ├── router/index.js    # 路由配置
│   │   └── api/index.js       # API 封装
│   └── package.json
│
├── backend/                   # Express 后端
│   ├── src/
│   │   ├── index.js           # 入口（dotenv、CORS、路由挂载）
│   │   ├── seed.js            # 初始数据填充
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT 认证 + 角色鉴权中间件
│   │   ├── routes/
│   │   │   ├── auth.js        # 认证路由（登录/扫码/注册）
│   │   │   ├── users.js       # 用户管理路由
│   │   │   ├── dishes.js      # 菜品 CRUD + 批量
│   │   │   ├── categories.js  # 分类 CRUD
│   │   │   ├── mealplans.js   # 点餐计划
│   │   │   ├── ingredients.js # 食材汇总
│   │   │   ├── dishRequests.js# 求菜需求
│   │   │   ├── bilibili.js    # B 站视频 AI 识别
│   │   │   ├── ratings.js     # 菜品评价
│   │   │   └── stats.js       # 数据统计看板
│   │   └── utils/
│   │       └── validation.js  # 统一输入校验工具
│   ├── prisma/
│   │   └── schema.prisma      # 数据库模型定义
│   └── package.json
│
├── Dockerfile                 # 多阶段构建（前端编译 + 后端运行）
├── docker-compose.yml         # Docker Compose 配置
├── update.sh                  # 一键更新脚本
└── .env                       # 环境变量（不入库）
```

## 🗄️ 数据模型

```
User          用户（账号/密码/角色/状态）
QrSession     扫码会话（token/状态/JWT）
Category      菜品分类（名称/排序）
Dish          菜品（名称/分类/图片/B站视频/本地视频/食材/做法）
DishBinding   菜品关联（主菜→子菜，如火锅→锅底/蘸料）
DishRating    菜品评价（评分/评论/每人每菜一次）
DishRequest   求菜需求（用户/菜名/状态/备注）
MealPlan      餐单计划（日期/餐次/用户）
MealItem      餐单项（关联餐单与菜品）
```

## 🚀 快速开始

### 环境要求

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- （可选）Node.js 20+ 用于本地开发

### Docker 部署（推荐）

1. **克隆仓库**

```bash
git clone https://github.com/JonDoe47/meal-planner.git
cd meal-planner
```

2. **配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env`，填入必要配置：

```env
# JWT 签名密钥（必填，建议 32 位以上随机字符串）
JWT_SECRET=your-random-secret-here

# BiBiGPT API Key（可选，启用 AI 识别功能）
BIBIGPT_API_KEY=your-api-key-here
```

生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **启动服务**

```bash
docker compose up -d --build
```

4. **访问应用**

打开浏览器访问 `http://your-server-ip:8181`

默认管理员账号：`admin` / `admin123`（首次登录后请立即修改密码）

### 本地开发

```bash
# 后端
cd backend
npm install
npx prisma db push
node src/seed.js
npm run dev

# 前端（新终端）
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`，后端 API 在 `http://localhost:3000`。

### 一键更新

```bash
chmod +x update.sh
./update.sh
```

## 🔌 API 接口

| 模块 | 方法 | 端点 | 权限 | 说明 |
|------|------|------|------|------|
| 认证 | POST | `/api/auth/login` | 公开 | 密码登录 |
| 认证 | POST | `/api/auth/qr/generate` | 公开 | 生成扫码会话 |
| 认证 | GET | `/api/auth/qr/poll/:token` | 公开 | 轮询扫码状态 |
| 认证 | POST | `/api/auth/qr/register` | 公开 | 扫码注册 |
| 用户 | GET | `/api/users` | 管理员 | 用户列表 |
| 用户 | POST | `/api/users` | 管理员 | 创建用户 |
| 用户 | PUT | `/api/users/:id` | 管理员 | 编辑用户 |
| 用户 | PUT | `/api/users/:id/reset-password` | 管理员 | 重置密码 |
| 用户 | GET | `/api/users/pending` | 管理员 | 待审批列表 |
| 菜品 | GET | `/api/dishes` | 登录 | 菜品列表 |
| 菜品 | POST | `/api/dishes` | 管理员 | 创建菜品 |
| 菜品 | POST | `/api/dishes/batch` | 管理员 | 批量导入 |
| 分类 | GET | `/api/categories` | 登录 | 分类列表 |
| 餐单 | GET | `/api/mealplans` | 登录 | 点餐记录 |
| 餐单 | POST | `/api/mealplans` | 登录 | 保存点餐 |
| 食材 | GET | `/api/ingredients/summary` | 管理员 | 食材汇总 |
| 需求 | POST | `/api/dish-requests` | 登录 | 提交需求 |
| B站 | POST | `/api/bilibili/analyze` | 登录 | AI 识别视频 |
| B站 | POST | `/api/bilibili/cooking-steps` | 登录 | AI 生成做法 |
| B站 | GET | `/api/bilibili/favorites` | 登录 | 获取收藏夹 |
| 评价 | GET | `/api/ratings/dish/:dishId` | 登录 | 菜品评价列表 |
| 评价 | POST | `/api/ratings` | 登录 | 提交或更新评价 |
| 评价 | DELETE | `/api/ratings/:id` | 登录 | 删除自己的评价 |
| 统计 | GET | `/api/stats/overview` | 登录 | 数据看板（支持 days/startDate/endDate 参数） |

## 📝 更新日志

### v1.5.0（2026-04-12）

**🎉 新增功能**

- **本地视频上传**：菜品支持上传本地视频（手机/电脑），与 B 站视频二选一，最大 500MB
- **B 站链接自动识别**：粘贴链接后自动填充菜品名称、分类、食材清单和烹饪步骤，无需手动点击按钮
- **重复菜品检测**：新增菜品时自动检测同名或相同 B 站视频的已有菜品，黄色警告提示
- **菜品关联绑定**：支持菜品之间建立关联（如火锅→锅底/蘸料），自定义关联类型标签
- **管理员菜品详情**：菜品列表新增「详情」入口，弹窗内可直接播放 B 站视频 / 本地视频，查看食材和分步做法
- **统一新增入口**：管理员菜品页 FAB 合并为单一按钮，点击后选择「新增单个菜品」或「批量导入」

**🔧 优化**

- 新增/批量导入区分为单一悬浮按钮 + Action Sheet，操作更清晰
- 详情弹窗支持 B 站 iframe 和本地 `<video>` 标签双模式播放
- Prisma 数据模型新增 `Dish.videoUrl`、`DishBinding` 关联表

### v1.4.0（2026-04-12）

**🎉 新增功能**

- **菜品评价系统**：用户可对菜品打分（1-5星）+ 写评论，每人每菜限评一次（upsert）
- **数据统计看板**：管理后台 Dashboard 新增 ECharts 可视化图表
  - 分类菜品分布（环形饼图）
  - 近7天点餐趋势（平滑折线图 + 面积填充）
  - 热门菜品 Top5（横向柱状图）
  - 评价分布柱状图（1-5星）
- **AI 烹饪步骤生成**：菜品管理页支持从 B 站视频一键生成分步做法，可编辑删除

**🔧 性能优化**

- 菜品浏览页分类筛选改为按分类懒加载，切换 Tab 时请求 API，不再全量加载
- 统计看板 `/stats/overview` 接口支持自定义时间范围参数（`days` / `startDate` / `endDate`），默认近7天，最长90天
- 批量导入接口支持保存 `cookingSteps` 字段

### v1.3.0（2026-04-06）

**🔒 安全加固**

- 新增 `utils/validation.js` 统一校验模块，集中管理用户名 / 密码 / 姓名校验规则
- JWT_SECRET 强制从环境变量读取，未设置则拒绝启动，移除所有硬编码默认值
- 登录接口添加频率限制（5 分钟 10 次），注册限制（1 小时 5 次）
- 所有用户创建 / 编辑 / 重置密码接口加入格式校验
- 角色字段使用白名单保护，防止权限提升
- 前端登录页和用户管理页添加格式校验，与后端规则一致
- `index.js` 引入 dotenv、CORS 白名单配置（`CORS_ORIGIN`）、请求体限制 1MB
- docker-compose.yml 中 JWT_SECRET 改为环境变量注入

### v1.2.0

- AI 分步做法生成（B 站视频自动提取烹饪步骤）
- Safari 主屏幕图标适配（PWA）

### v1.1.0

- 单容器 Docker 部署（前后端合并构建）
- 新增 `update.sh` 一键更新脚本
- 前端端口改为 8181

### v1.0.0

- 家庭点餐系统完整功能上线
- 扫码登录 / 注册
- 批量导入（B 站链接 + 收藏夹）
- AI 菜品识别（BiBiGPT 集成）
- 食材汇总清单
- 点餐统计看板

## 📄 许可证

MIT License

---

**⭐ 觉得有用？给个 Star 吧！**
