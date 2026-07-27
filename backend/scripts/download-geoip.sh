#!/bin/sh
DEST=/app/data
mkdir -p $DEST

if [ -f "$DEST/SxGeoCity.dat" ]; then
  echo "SxGeoCity.dat already exists"
  exit 0
fi

echo "Downloading Sypex Geo City DB..."
if wget -q -O /tmp/SxGeoCity.zip "https://sypexgeo.net/files/SxGeoCity.zip" 2>/dev/null; then
  cd /tmp && unzip -q SxGeoCity.zip -d /tmp/sxgeo/ 2>/dev/null
  if [ -f "/tmp/sxgeo/SxGeoCity.dat" ]; then
    mv /tmp/sxgeo/SxGeoCity.dat $DEST/
    echo "SxGeoCity.dat downloaded OK"
  else
    echo "Unzip failed, fallback to ip-api.com"
  fi
  rm -rf /tmp/SxGeoCity.zip /tmp/sxgeo
else
  echo "Download failed, fallback to ip-api.com"
fi
