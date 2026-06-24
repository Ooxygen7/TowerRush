#!/usr/bin/env bash
#
# TowerRush — 一键部署 / 更新脚本（在本地仓库根目录运行）
#
# 把游戏静态文件（index.html / css / js / logo.png）与排行榜服务代码推送到服务器，
# 然后重启服务并重载 nginx。首次部署请先在服务器上运行 scripts/server-setup.sh。
#
# 用法：
#   ./scripts/deploy.sh <user>@<host>            # 推送游戏 + 服务端
#   ./scripts/deploy.sh <user>@<host> --with-bgm # 同时上传 bgm*.mp3 / home.mp3（若本地存在）
#   ./scripts/deploy.sh <user>@<host> --web-only # 只推送游戏静态文件，不动服务端
#
# 可用环境变量覆盖默认路径：
#   WEB_ROOT(/var/www/td)  APP_DIR(/opt/tf-leaderboard)  SERVICE(tf-leaderboard)
#
set -euo pipefail

SSH_HOST="${1:-${SSH_HOST:-}}"
[[ -z "$SSH_HOST" ]] && { echo "用法: $0 <user>@<host> [--with-bgm|--web-only]" >&2; exit 1; }
shift || true

WITH_BGM=0; WEB_ONLY=0
for a in "$@"; do
  case "$a" in
    --with-bgm) WITH_BGM=1 ;;
    --web-only) WEB_ONLY=1 ;;
    *) echo "未知参数: $a" >&2; exit 1 ;;
  esac
done

WEB_ROOT="${WEB_ROOT:-/var/www/td}"
APP_DIR="${APP_DIR:-/opt/tf-leaderboard}"
SERVICE="${SERVICE:-tf-leaderboard}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE"
command -v rsync >/dev/null || { echo "需要 rsync。" >&2; exit 1; }

echo "==> 部署到 $SSH_HOST  (WEB_ROOT=$WEB_ROOT, APP_DIR=$APP_DIR)"

# 1) 游戏静态文件
GAME_FILES=(index.html css js logo.png)
[[ $WITH_BGM -eq 1 ]] && for f in bgm1.mp3 bgm2.mp3 bgm3.mp3 home.mp3; do [[ -f "$f" ]] && GAME_FILES+=("$f"); done
echo "--> 同步游戏静态文件: ${GAME_FILES[*]}"
rsync -az --delete-after --exclude='*.orig' "${GAME_FILES[@]}" "$SSH_HOST:$WEB_ROOT/"

# 2) 排行榜服务端
if [[ $WEB_ONLY -eq 0 ]]; then
  echo "--> 同步排行榜服务代码"
  rsync -az server/leaderboard_server.py "$SSH_HOST:$APP_DIR/leaderboard_server.py"
  echo "--> 重启服务 + 重载 nginx（需要远端 sudo 权限）"
  ssh "$SSH_HOST" "sudo systemctl restart $SERVICE && sudo nginx -t && sudo systemctl reload nginx"
else
  echo "--> 跳过服务端（--web-only）"
fi

echo "==> 部署完成。健康检查："
ssh "$SSH_HOST" "curl -s http://127.0.0.1:3947/td/api/health || true"
echo
