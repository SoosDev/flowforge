# FlowForge

**分散型ワークフローオーケストレーションプラットフォーム**

AIタスクやバックエンド処理のためのプロダクショングレードなワークフローエンジン。
DAG実行、リアルタイム可観測性、耐障害性、リトライ機構を備えています。

[**ライブデモを見る →**](https://flowforge.up.railway.app)
ログイン: `demo@flowforge.io` / `demo`

---

## アーキテクチャ

```
┌────────────────────────────────────────────────────────┐
│                      FlowForge                         │
│                                                        │
│  ┌─────────────┐   REST/WS   ┌──────────────────────┐ │
│  │ ダッシュボード │◄──────────►│     APIサーバー       │ │
│  │  React 19   │            │  Fastify + JWT + WS   │ │
│  └─────────────┘            └──────────┬─────────────┘ │
│                                        │ enqueue       │
│  ┌─────────────┐   heartbeat  ┌────────▼─────────────┐ │
│  │  PostgreSQL │◄─────────────│      ワーカー          │ │
│  │  + pgvector │              │  BullMQ + タスクレジストリ│ │
│  └──────┬──────┘              └────────┬─────────────┘ │
│         │ 永続化                        │ consume       │
│         │                    ┌─────────▼─────────────┐ │
│         └───────────────────►│        Redis          │ │
│                              │    タスクキュー         │ │
│                              └───────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

```mermaid
graph TB
    D[ダッシュボード<br/>React 19]
    A[APIサーバー<br/>Fastify 5]
    W[ワーカープロセス<br/>BullMQ 5]
    DB[(PostgreSQL 16<br/>+ pgvector)]
    R[(Redis 7)]
    OAI[OpenAI API]

    D -->|REST + WebSocket| A
    A -->|ジョブ登録| R
    R -->|ジョブ取得| W
    W -->|完了通知| A
    A -->|状態永続化| DB
    W -->|ハートビート| DB
    W -->|埋め込み生成| OAI
    W -->|ベクトル保存| DB
```

## 主な機能

### ワークフローエンジン
- **DAG実行**: 有向非巡回グラフによるタスク依存関係の管理
- **並列実行**: 依存関係のないタスクを自動的に並列処理
- **依存出力の転送**: 上流タスクの出力が下流タスクの入力として自動で渡される

### 耐障害性
- **ハートビート監視**: ワーカーが30秒以内に応答しない場合にタスクをSTALLEDとマーク
- **自動再キュー**: 失敗・停止したタスクを指数バックオフで自動再試行
- **デッドレター**: 最大リトライ数を超えたタスクをFAILED状態に移行
- **状態の永続化**: 全ての実行状態をPostgreSQLに保存し、再起動後も復元可能

### リアルタイム可観測性
- **WebSocketライブ更新**: タスク開始・完了・失敗をリアルタイムでダッシュボードに反映
- **DAGグラフ可視化**: @xyflow/reactによるインタラクティブな実行グラフ
- **ワーカー監視**: 全ワーカープロセスのヘルス状態とキューメトリクスを表示
- **構造化ログ**: Pinoによるタスクレベルのログをリアルタイムで確認

### AIワークフロー
- **実際のOpenAI呼び出し**: PDFからテキスト抽出 → チャンク分割 → 埋め込み生成 → pgvector保存
- **内部タスクレジストリ**: `registerTask({ type, execute })` パターンによるプラグイン対応設計

## スクリーンショット

| ダッシュボード | 実行グラフ | ワーカー監視 |
|---|---|---|
| *(スクリーンショット)* | *(スクリーンショット)* | *(スクリーンショット)* |

> ライブデモで実際の動作を確認できます: [flowforge.up.railway.app](https://flowforge.up.railway.app)

## ローカル環境構築

### 前提条件
- Node.js 22+
- pnpm 9+
- Docker + Docker Compose

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/your-username/flowforge.git
cd flowforge

# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.example .env
# .env を編集して JWT_SECRET, WORKER_SECRET, OPENAI_API_KEY を設定

# データベース・Redisの起動
docker compose up postgres redis -d

# マイグレーション実行 + シードデータ投入
cd packages/shared
DATABASE_URL=postgresql://flowforge:flowforge@localhost:5432/flowforge pnpm drizzle-kit migrate
cd ../..
cd apps/api && DATABASE_URL=... JWT_SECRET=... WORKER_SECRET=... pnpm seed
cd ../..

# 開発サーバー起動（3プロセス）
# ターミナル1: API
cd apps/api && pnpm dev

# ターミナル2: Worker
cd apps/worker && pnpm dev

# ターミナル3: Dashboard
cd apps/dashboard && pnpm dev
```

ブラウザで `http://localhost:3000` を開き、`demo@flowforge.io` / `demo` でログインします。

### テスト実行

```bash
# ユニットテスト (DAG検証・状態遷移)
cd packages/shared && pnpm test
cd apps/api && pnpm test

# インテグレーションテスト (実際のPostgres・Redis使用)
docker compose -f docker-compose.test.yml up -d --wait
cd apps/api && pnpm test:integration

# OpenAI APIを使用したAIパイプラインテスト
OPENAI_API_KEY=sk-... pnpm test:integration
```

## ワークフロー定義例

```json
{
  "name": "ai-document-ingestion",
  "tasks": [
    { "id": "extract", "type": "extract-text" },
    { "id": "chunk",   "type": "chunk-text",          "dependsOn": ["extract"] },
    { "id": "embed",   "type": "generate-embeddings",  "dependsOn": ["chunk"] },
    { "id": "store",   "type": "store-vectors",        "dependsOn": ["chunk", "embed"] },
    { "id": "done",    "type": "notify-complete",      "dependsOn": ["store"] }
  ]
}
```

このワークフローをAPIで実行:

```bash
# ワークフロー作成
curl -X POST https://your-api.railway.app/workflows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @workflow-definition.json

# 実行開始
curl -X POST https://your-api.railway.app/runs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workflowId": "...", "input": {"filename": "doc.pdf", "content": "<base64>"}}'
```

## 技術的な判断

### ワークフローエンジン設計
DAGのトポロジカルソートを用いて、依存関係を満たしたタスクのみを随時キューに投入します。タスク完了のたびに `getReadyTasks()` を呼び出し、新たに実行可能になったタスクを検出します。これによりN-ary DAGの効率的な並列実行が実現できます。

### 耐久性: Temporal不採用の理由
決定論的リプレイやイベントソーシングは複雑性が高く、ポートフォリオプロジェクトのスコープとして不適切と判断しました。代わりに「ハートビートベースの停止検出 + 自動再キュー」を採用しました。全状態をPostgreSQLに永続化することで、クラッシュリカバリと耐障害性を実現しています。

### BullMQの抽象化
BullMQを直接使用せず `QueueClient` インターフェース経由でのみ操作します。これにより将来的に別のキューバックエンドへの移行が容易になります。

### 内部タスクレジストリ
`switch(task.type)` による分岐を避け、`registerTask({ type, execute })` パターンを採用しました。現在は内部実装のみですが、Phase 2でnpmパッケージとして公開し、サードパーティプラグインに対応する設計です。

### pgvectorの選択
ベクトル検索のために別途ベクトルDBを追加するのではなく、既存のPostgreSQLにpgvector拡張を追加しました。インフラの複雑性を最小限に抑えながら、本格的なベクトル検索機能を提供します。

## 障害対応

| 障害シナリオ | 検出方法 | 対応 |
|---|---|---|
| ワーカークラッシュ | ハートビートタイムアウト (30秒) | タスクをSTALLED → RETRYINGに遷移、別ワーカーで再実行 |
| タスク失敗 | BullMQエラーハンドラ | 指数バックオフで最大3回リトライ |
| 最大リトライ超過 | attempt >= maxAttempts | デッドレター状態(FAILED)に移行、UIで可視化 |
| APIクラッシュ | PostgreSQLの状態から復元 | 再起動時にRUNNING状態のタスクを検出し再キュー |
| データベース接続失敗 | pgエラーハンドラ | Fastifyがエラーレスポンスを返す、ワーカーはリトライ |

## スケーリング戦略

**水平スケーリング (現在の設計で対応済み)**
- ワーカープロセスは複数起動可能 — BullMQが自動でジョブを分散
- APIサーバーはステートレス設計 — ロードバランサー配下で複数起動可能
- WebSocket接続はAPIプロセスにアフィニティが必要 — スケール時はRedis Pub/Subに移行

**垂直スケーリング**
- ワーカーの `concurrency` 設定でCPUコアを活用
- PostgreSQLのコネクションプール調整

**Phase 2以降**
- Redis Pub/SubでAPIをステートレスWebSocket対応に
- Kubernetes HPA (Horizontal Pod Autoscaler) でワーカーの自動スケール
- Read replicaによるダッシュボードのクエリ負荷分散

## 今後の改善予定 (Phase 2)

- **ワークフローリプレイ**: チェックポイントから失敗ワークフローを再実行
- **ワークフローバージョニング**: 実行中のワークフローを中断せずにバージョンアップ
- **人間承認ステップ**: ワークフロー途中に人間のアクション待ちステップを挿入
- **プラグインSDK**: `@flowforge/sdk` npmパッケージとしてタスクハンドラを公開
- **Jaeger/Honeycombトレーシング**: OTLPエクスポーターで外部トレーシングバックエンドに接続

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| バックエンド | Node.js 22, TypeScript 5.7, Fastify 5 |
| データベース | PostgreSQL 16, Drizzle ORM, pgvector |
| キュー | Redis 7, BullMQ 5 |
| フロントエンド | React 19, Vite 6, Tailwind CSS 4 |
| DAG可視化 | @xyflow/react 12 |
| AI | OpenAI SDK 4 (text-embedding-3-small) |
| 可観測性 | OpenTelemetry, Pino |
| インフラ | Docker, Docker Compose, Railway |
| テスト | Vitest 3 (ユニット + インテグレーション) |
| モノレポ | pnpm workspaces |

## ライセンス

MIT
