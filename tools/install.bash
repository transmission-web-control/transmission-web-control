set -e

usage() {
  echo "install.bash [-v v...] [-o ...]"
  echo "  -v optional, version to download, default latest"
  echo "  -o optional, directory of transmission web home. will try to fallback to env ${TRANSMISSION_WEB_HOME} and transmission config"
}

echo_err() {
  echo "$@" 1>&2
}

# 获取Tr所在的目录
# 指定一次当前系统的默认目录
# 用户如知道自己的 Transmission Web 所在的目录，直接修改这个值，以避免搜索所有目录
# ROOT_FOLDER="/usr/local/transmission/share/transmission"
# Fedora 或 Debian 发行版的默认 ROOT_FOLDER 目录
getTransmissionPath() {
  if [ ! -d "$ROOT_FOLDER" ]; then
    if [ -f "/etc/fedora-release" ] || [ -f "/etc/debian_version" ] || [ -f "/etc/openwrt_release" ]; then
      echo "/usr/share/transmission"
    fi

    if [ -f "/bin/freebsd-version" ]; then
      echo "/usr/local/share/transmission"
    fi

    # 群晖
    if [ -f "/etc/synoinfo.conf" ]; then
      echo "/var/packages/transmission/target/share/transmission"
    fi
  fi

  if [ ! -d "$ROOT_FOLDER" ]; then
    infos=$(ps -Aww -o command= | sed -r -e '/[t]ransmission-da/!d' -e 's/ .+//')
    if [ "$infos" != "" ]; then
      echo " √"
      search="bin/transmission-daemon"
      replace="share/transmission"
      path=${infos//$search/$replace}
      if [ -d "$path" ]; then
        echo $path
      fi
    else
      echo_err "Failed to find transmission web home, use '-o' or set env 'TRANSMISSION_WEB_HOME'"
      exit 1
    fi
  fi
}

VERSION=""

while getopts v:o:h? flag; do
  case "${flag}" in
  v) VERSION=${OPTARG} ;;
  o) OUTPUT=${OPTARG} ;;
  ?)
    usage
    exit 1
    ;;
  esac
done

if [[ "${VERSION}" == "" ]]; then
  echo "use latest version"
  DOWNLOAD_URL="https://github.com/transmission-web-control/transmission-web-control/releases/latest/download/dist.tar.gz"
else
  # prepare v prefix
  if [[ ! "$VERSION" == "v*" ]]; then
    VERSION="v${VERSION}"
  fi

  echo "try to download version ${VERSION}"
  DOWNLOAD_URL="https://github.com/transmission-web-control/transmission-web-control/releases/download/${VERSION}/dist.tar.gz"
fi

if [[ "$OUTPUT" == "" ]]; then
  if [[ "$TRANSMISSION_WEB_HOME" != "" ]]; then
    echo "USE TRANSMISSION_WEB_HOME=${TRANSMISSION_WEB_HOME}"
    OUTPUT=TRANSMISSION_WEB_HOME
  else
    OUTPUT=$(getTransmissionPath)
  fi
fi

if [[ $VERSION == "" ]]; then
  TMP_DIR=$(mktemp --directory)
  #  TMP_DIR=/tmp/tr-web-ctl/latest
  #  TMP_DIR=/tmp/tr-web-ctl/latest
else
  TMP_DIR=/tmp/tr-web-ctl/${VERSION}
fi

echo "Using temp dir ${TMP_DIR}"

if [[ -f ${TMP_DIR}/dist.tar.gz ]]; then
  echo "version already downloaded, skip"
else
  curl -SL "$DOWNLOAD_URL" --output "${TMP_DIR}/dist.tar.gz"
fi

mkdir -p "${TMP_DIR}/dist/"

tar -xzf "${TMP_DIR}/dist.tar.gz" --directory "${TMP_DIR}/dist/"

mkdir -p "$OUTPUT"

if [[ -f "$OUTPUT/index.html" ]]; then
  if [[ ! -f "$OUTPUT/index.original.html" ]]; then
    cp "$OUTPUT/index.html" "$OUTPUT/index.original.html"
  fi
fi

cp -r "$TMP_DIR/dist/dist/./" "$OUTPUT/"

find "$OUTPUT" -type d -exec chmod o+rx {} \;
find "$OUTPUT" -type f -exec chmod o+r {} \;
