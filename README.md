# Grafana NPM Versions bridge

This projects monitors npm packages for new versions, storing into a mysql database for consumption in grafana.

## Installation

Ensure you have a running mysql server

Define the following environment variables, updating for your setup as appropriate:

1. `MYSQL_URL` eg `mysql://USERNAME:PASSWORD@HOST/DATABASE`
1. `PACKAGES` A comma separated list of packages to monitor eg `atem-connection,@julusian/jpeg-turbo`

It can be run in docker like:

```bash
docker run --restart=always \
  -e MYSQL_URL="mysql://USERNAME:PASSWORD@HOST/DATABASE" \
  -e PACKAGES=atem-connection,@julusian/jpeg-turbo \
   julusian/grafana-npm

```

Or in node:

1. `yarn install`
1. `yarn build`
1. `node dist/index.js`

## Development

1. `yarn install`
1. `yarn dev`
