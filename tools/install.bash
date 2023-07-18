set -e

usage() {
  echo "install.bash [-v v...] [-o ...]"
  echo "  -v optional, version to download, default latest"
  echo "  -o optional, directory of transmission web home. will try to fallback to env 'TRANSMISSION_WEB_HOME' and transmission config"
}

echo_err() {
  echo "$@" 1>&2
}

# Get Target Install directory
getTransmissionWebPath() {
  if [ ! -d "$ROOT_FOLDER" ]; then
    if [ -f "/etc/fedora-release" ] || [ -f "/etc/debian_version" ] || [ -f "/etc/openwrt_release" ]; then
      echo "/usr/share/transmission/web"
      return
    fi

    if [ -f "/bin/freebsd-version" ]; then
      echo "/usr/local/share/transmission/web"
      return
    fi

    # 群晖
    if [ -f "/etc/synoinfo.conf" ]; then
      echo "/var/packages/transmission/target/share/transmission/web"
      return
    fi
  fi

  if [ ! -d "$ROOT_FOLDER" ]; then
    infos=$(ps -Aww -o command= | sed -r -e '/[t]ransmission-da/!d' -e 's/ .+//')
    if [ "$infos" != "" ]; then
      search="bin/transmission-daemon"
      replace="share/transmission"
      path=${infos//$search/$replace}
      if [ -d "$path" ]; then
        echo "$path"
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
    echo "USE TRANSMISSION_WEB_HOME=${OUTPUT}"
    OUTPUT=TRANSMISSION_WEB_HOME
  else
    OUTPUT=$(getTransmissionWebPath)
  fi
fi

echo "transmission-web-control will be installed to ${OUTPUT}, please confirm it's correct. otherwise use '-o' to set target directory"
echo "press 'y' to continue"

read -p "Are you sure? " -n 1 -r
echo    # (optional) move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo 'user abort'
    # do dangerous stuff
fi

if [[ $VERSION == "" ]]; then
  TMP_DIR=$(mktemp --directory)
  #  TMP_DIR=/tmp/tr-web-ctl/latest
  #  TMP_DIR=/tmp/tr-web-ctl/latest
else
  TMP_DIR=/tmp/tr-web-ctl/${VERSION}
  mkdir -p "$TMP_DIR"
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
