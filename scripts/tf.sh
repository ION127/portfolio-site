#!/usr/bin/env bash
# 로컬에서 Terraform을 돌리는 래퍼. 사용법: scripts/tf.sh <bootstrap|site> <terraform 인자...>
# 저장소가 OneDrive 폴더에 있어서, 묶음마다 800MB가 넘는 provider(.terraform/)가 동기화되지 않도록
# 작업 데이터는 저장소 밖(TF_DATA_DIR)에 두고, provider는 캐시(TF_PLUGIN_CACHE_DIR)로 한 번만 받는다.
# CI는 이 래퍼를 쓰지 않는다.
set -euo pipefail

stack="${1:?usage: scripts/tf.sh <bootstrap|site> <terraform args...>}"
shift
case "$stack" in
  bootstrap | site) ;;
  *)
    echo "unknown stack: $stack (bootstrap|site)" >&2
    exit 2
    ;;
esac

# Git Bash에서는 Windows용 terraform.exe가 알아듣는 경로(C:/...)로 바꿔 넘긴다.
native() {
  if command -v cygpath > /dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi
}

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
data_dir="${TF_DATA_ROOT:-$HOME/.terraform-data/portfolio-site}/$stack"
cache_dir="${TF_PLUGIN_CACHE_DIR:-$HOME/.terraform.d/plugin-cache}"
mkdir -p "$data_dir" "$cache_dir"

export TF_DATA_DIR="$(native "$data_dir")"
export TF_PLUGIN_CACHE_DIR="$(native "$cache_dir")"
exec "${TERRAFORM:-terraform}" -chdir="$(native "$root/infra/$stack")" "$@"
