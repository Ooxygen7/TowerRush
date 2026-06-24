#!/usr/bin/env bash
#
# TowerRush — 服务器首次初始化脚本（在目标服务器上以 root / sudo 运行一次）
#
# 作用：安装排行榜服务（systemd）、部署 nginx 站点、创建环境变量文件、
#       建立游戏静态目录。完成后用 scripts/deploy.sh 从本地推送游戏与代码更新。
#
# 用法（在服务器上、仓库根目录）：
#   sudo APP_DIR=/opt/tf-leaderboard WEB_ROOT=/var/www/td DOMAIN=game.example.com bash scripts/server-setup.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tf-leaderboard}"        # 排行榜服务代码目录
WEB_ROOT="${WEB_ROOT:-/var/www/td}"              # 游戏静态文件目录（nginx location /td/）
ENV_FILE="${ENV_FILE:-/etc/tf-leaderboard.env}"  # 环境变量文件（含 OAuth 密钥，权限 600）
SERVICE="${SERVICE:-tf-leaderboard}"             # systemd 服务名
RUN_USER="${RUN_USER:-www-data}"                 # 服务运行用户
DOMAIN="${DOMAIN:-game.example.com}"             # 你的域名（用于提示 certbot）

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # 仓库根目录

echo "==> TowerRush 服务器初始化"
echo "    APP_DIR=$APP_DIR  WEB_ROOT=$WEB_ROOT  SERVICE=$SERVICE  USER=$RUN_USER"

if [[ $EUID -ne 0 ]]; then echo "请用 root / sudo 运行。" >&2; exit 1; fi
command -v python3 >/dev/null || { echo "未找到 python3，请先安装：apt install -y python3" >&2; exit 1; }

# 1) 目录
install -d -o "$RUN_USER" -g "$RUN_USER" "$APP_DIR" "$WEB_ROOT" /var/lib/tf-leaderboard

# 2) 排行榜服务代码
install -m 0755 -o "$RUN_USER" -g "$RUN_USER" "$HERE/server/leaderboard_server.py" "$APP_DIR/leaderboard_server.py"

# 3) 环境变量文件（仅首次创建，避免覆盖已填写的密钥）
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$HERE/server/tf-leaderboard.env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "==> 已创建 $ENV_FILE —— 请填写 TF_LINUXDO_CLIENT_ID / TF_LINUXDO_CLIENT_SECRET / TF_BASE_URL"
else
  echo "==> $ENV_FILE 已存在，跳过（不覆盖现有密钥）"
fi

# 4) systemd 服务
install -m 0644 "$HERE/server/tf-leaderboard.service" "/etc/systemd/system/${SERVICE}.service"
systemctl daemon-reload
systemctl enable --now "$SERVICE"

# 5) nginx 站点
if command -v nginx >/dev/null; then
  install -m 0644 "$HERE/server/nginx-game.conf" "/etc/nginx/sites-available/${SERVICE}.conf"
  ln -sf "/etc/nginx/sites-available/${SERVICE}.conf" "/etc/nginx/sites-enabled/${SERVICE}.conf"
  nginx -t && systemctl reload nginx
  echo "==> nginx 站点已启用"
else
  echo "!! 未安装 nginx，跳过站点配置（参考 server/nginx-game.conf 手动配置）"
fi

cat <<EOF

==> 初始化完成。后续：
    1. 编辑 $ENV_FILE 填入 LinuxDo OAuth 的 CLIENT_ID / SECRET 与 TF_BASE_URL，然后：
         sudo systemctl restart $SERVICE
    2. 申请 TLS 证书（首次）：
         sudo certbot --nginx -d $DOMAIN
    3. 从本地推送游戏与代码更新：
         ./scripts/deploy.sh <user>@$DOMAIN
    4. 健康检查：
         curl -s http://127.0.0.1:3947/td/api/health
EOF
